import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendPushToMultipleDevices } from "@/lib/push";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/check-tasks
 * Rota chamada pelo Cron-job.org (via Bearer Token) ou pelo Browser (via Sessão)
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.token_Cron || process.env.CRON_SECRET;
  const isDevelopment = process.env.NODE_ENV === "development";

  // 1. Verificar se a chamada é autorizada (Token Cron ou Sessão de Usuário)
  const session = await auth();
  const isAuthorizedByToken = authHeader === `Bearer ${cronSecret}`;
  const isAuthorizedBySession = !!session?.user;

  if (!isDevelopment && !isAuthorizedByToken && !isAuthorizedBySession) {
    console.error("[Cron] Acesso não autorizado");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date().toISOString();
  console.log(`[Cron] Verificação iniciada em ${now}`);

  try {
    // 2. Buscar tarefas pendentes que já passaram do horário agendado
    const result = await db.execute({
      sql: `
        SELECT * FROM tasks 
        WHERE executed = 0 
        AND notification_enabled = 1 
        AND scheduled_time <= ? 
        AND status NOT IN ('completed', 'cancelled')
      `,
      args: [now],
    });

    const tasks = result.rows;
    if (tasks.length === 0) {
      return NextResponse.json({
        success: true,
        checked: 0,
        sent: 0,
        timestamp: new Date().toISOString(),
      });
    }

    let notificationsSent = 0;

    // 3. Agrupar tarefas por usuário para reduzir consultas ao banco
    const tasksByUser: Record<string, any[]> = {};
    for (const task of tasks) {
      const userId = task.user_id as string;
      if (!tasksByUser[userId]) tasksByUser[userId] = [];
      tasksByUser[userId].push(task);
    }

    // 4. Processar cada usuário e suas tarefas
    for (const userId in tasksByUser) {
      // Buscar dispositivos (subscriptions) e configurações do usuário uma única vez
      const [deviceResult, userResult] = await Promise.all([
        db.execute({
          sql: "SELECT endpoint, p256dh, auth FROM devices WHERE user_id = ? AND is_active = 1",
          args: [userId],
        }),
        db.execute({
          sql: "SELECT persistent_interval, notification_sound, notification_vibration, sound_low, sound_medium, sound_high FROM users WHERE id = ?",
          args: [userId],
        }),
      ]);

      const userPrefs = userResult.rows[0];
      const persistentInterval = userPrefs?.persistent_interval
        ? Number(userPrefs.persistent_interval)
        : 60;

      const soundEnabled = userPrefs?.notification_sound !== 0;
      const vibrationEnabled = userPrefs?.notification_vibration !== 0;

      // Mapear sons por prioridade
      const getPrioritySound = (priority: string) => {
        if (!soundEnabled) return "silent";
        if (priority === "high") return userPrefs?.sound_high || "default";
        if (priority === "low") return userPrefs?.sound_low || "default";
        return userPrefs?.sound_medium || "default";
      };

      const subscriptions = deviceResult.rows.map((row) => ({
        endpoint: row.endpoint as string,
        keys: {
          p256dh: row.p256dh as string,
          auth: row.auth as string,
        },
      }));

      for (const task of tasksByUser[userId]) {
        const taskId = task.id as string;
        const title = task.title as string;
        const description = task.description as string | null;

        if (subscriptions.length > 0) {
          // 5. Enviar notificações Web Push
          const pushResult = await sendPushToMultipleDevices(subscriptions, {
            title: title,
            body: description || "Você tem uma tarefa pendente",
            taskId: taskId,
            url: `/dashboard/notification-action?taskId=${taskId}`,
            urgency: task.priority === "high" ? "high" : "normal",
            requireInteraction: task.priority === "high", // Forçar interação se for alta prioridade
            tag: taskId,
            silent: !soundEnabled,
            sound: getPrioritySound(task.priority as string),
            vibrate: vibrationEnabled
              ? [
                  500, 110, 500, 110, 450, 110, 200, 110, 170, 40, 450, 110,
                  200, 110, 170, 40,
                ]
              : [], // Vibração mais forte se for alta prioridade
            actions: [
              { action: "complete", title: "✅ Concluir" },
              { action: "snooze", title: "⏰ Adiar" },
            ],
          });

          if (pushResult.successful > 0) {
            notificationsSent++;
          }
        }

        // 5. Tornar a notificação persistente: adiar automaticamente
        // Se for "dia todo", tentamos seguir a escala configurada (time1, time2, time3)
        // Se não, usamos o intervalo configurado pelo usuário
        let nextReminder: Date;
        const allDay = !!task.all_day;

        if (allDay) {
          const today = new Date();
          const t1 = (task.all_day_time1 as string) || "09:00";
          const t2 = (task.all_day_time2 as string) || "14:00";
          const t3 = (task.all_day_time3 as string) || "19:00";

          const parseTime = (t: string) => {
            const [h, m] = t.split(":").map(Number);
            return h * 60 + m;
          };

          const currentMinutes = today.getHours() * 60 + today.getMinutes();
          const times = [t1, t2, t3]
            .map((t) => ({ original: t, minutes: parseTime(t) }))
            .sort((a, b) => a.minutes - b.minutes);

          const nextTime = times.find((t) => t.minutes > currentMinutes);

          if (nextTime) {
            const [nextH, nextM] = nextTime.original.split(":").map(Number);
            nextReminder = new Date(
              today.getFullYear(),
              today.getMonth(),
              today.getDate(),
              nextH,
              nextM,
              0,
            );
          } else {
            // Já passaram todos os horários do dia, usa o intervalo persistente configurado
            nextReminder = new Date(
              Date.now() + persistentInterval * 60 * 1000,
            );
          }
        } else {
          nextReminder = new Date(Date.now() + persistentInterval * 60 * 1000);
        }

        await db.execute({
          sql: "UPDATE tasks SET scheduled_time = ?, executed = 0, updated_at = ? WHERE id = ?",
          args: [nextReminder.toISOString(), new Date().toISOString(), taskId],
        });
      }
    }

    return NextResponse.json({
      success: true,
      checked: tasks.length,
      sent: notificationsSent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Erro no processamento:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
