import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calculateNextRun } from "@/lib/scheduler";
import { sendPushToMultipleDevices } from "@/lib/push";

export const dynamic = "force-dynamic";

/**
 * GET /api/check-tasks
 * Rota chamada pelo Cron-job.org para verificar e disparar notificações
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isDevelopment = process.env.NODE_ENV === "development";

  // 1. Segurança: Verificar Token Bearer (ou permitir se for dev para testes locais)
  if (
    !isDevelopment &&
    (!authHeader || authHeader !== `Bearer ${cronSecret}`)
  ) {
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
    let notificationsSent = 0;

    for (const task of tasks) {
      const taskId = task.id as string;
      const userId = task.user_id as string;
      const title = task.title as string;
      const description = task.description as string | null;
      const frequency = task.frequency as any;
      const dayOfWeek = task.frequency_day_of_week as number | null;
      const dayOfMonth = task.frequency_day_of_month as number | null;

      // 3. Buscar dispositivos (subscriptions) do usuário
      const deviceResult = await db.execute({
        sql: "SELECT endpoint, p256dh, auth FROM devices WHERE user_id = ? AND is_active = 1",
        args: [userId],
      });

      const subscriptions = deviceResult.rows.map((row) => ({
        endpoint: row.endpoint as string,
        keys: {
          p256dh: row.p256dh as string,
          auth: row.auth as string,
        },
      }));

      if (subscriptions.length > 0) {
        // 4. Enviar notificações Web Push
        const pushResult = await sendPushToMultipleDevices(subscriptions, {
          title: title,
          body: description || "Você tem uma tarefa pendente",
          taskId: taskId,
          url: `/dashboard`,
          urgency: task.priority === "high" ? "high" : undefined,
          tag: taskId,
          actions: [
            { action: "complete", title: "✅ Concluir" },
            { action: "snooze", title: "⏰ Adiar 15min" },
          ],
        });

        if (pushResult.successful > 0) {
          notificationsSent++;
        }
      }

      // 5. Marcar como executada para evitar duplicidade
      await db.execute({
        sql: "UPDATE tasks SET executed = 1, updated_at = ? WHERE id = ?",
        args: [new Date().toISOString(), taskId],
      });

      // 6. Tratar recorrência
      if (frequency && frequency !== "once") {
        const currentScheduled = new Date(task.scheduled_time as string);
        const nextRun = calculateNextRun(
          currentScheduled,
          frequency,
          dayOfWeek,
          dayOfMonth,
        );

        await db.execute({
          sql: "UPDATE tasks SET scheduled_time = ?, executed = 0, updated_at = ? WHERE id = ?",
          args: [nextRun.toISOString(), new Date().toISOString(), taskId],
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
