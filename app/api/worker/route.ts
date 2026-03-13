import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateNextRun } from '@/lib/scheduler';
import { sendPushToMultipleDevices } from '@/lib/push';

export const dynamic = 'force-dynamic';

export async function GET() {
  const now = new Date().toISOString();
  console.log(`[Worker] Iniciando processamento de tarefas em ${now}`);

  try {
    // 1. Buscar tarefas pendentes que já passaram do horário agendado
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
    console.log(`[Worker] Encontradas ${tasks.length} tarefas para processar.`);

    for (const task of tasks) {
      const taskId = task.id as string;
      const userId = task.user_id as string;
      const title = task.title as string;
      const frequency = task.frequency as any;
      const dayOfWeek = task.frequency_day_of_week as number | null;
      const dayOfMonth = task.frequency_day_of_month as number | null;

      console.log(`[Worker] Processando tarefa: ${title} (${taskId})`);

      // 2. Buscar dispositivos do usuário para enviar push
      const deviceResult = await db.execute({
        sql: 'SELECT endpoint, p256dh, auth FROM devices WHERE user_id = ? AND is_active = 1',
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
        await sendPushToMultipleDevices(subscriptions, {
          title: 'Lembrete de Tarefa',
          body: title,
          taskId: taskId,
          url: `/dashboard`,
          urgency: task.priority === 'high' ? 'high' : 'medium',
          tag: taskId,
          actions: [
            {
              action: 'complete',
              title: '✅ Concluir',
            },
            {
              action: 'snooze',
              title: '⏰ Adiar 15min',
            }
          ]
        });
        console.log(`[Worker] Notificações enviadas para ${subscriptions.length} dispositivos.`);
      } else {
        console.log(`[Worker] Nenhum dispositivo ativo encontrado para o usuário ${userId}.`);
      }

      // 3. Atualizar status da tarefa atual para executada
      await db.execute({
        sql: 'UPDATE tasks SET executed = 1, updated_at = ? WHERE id = ?',
        args: [new Date().toISOString(), taskId],
      });

      // 4. Se for recorrente, agendar a próxima execução
      if (frequency && frequency !== 'once') {
        const currentScheduled = new Date(task.scheduled_time as string);
        const nextRun = calculateNextRun(currentScheduled, frequency, dayOfWeek, dayOfMonth);

        await db.execute({
          sql: 'UPDATE tasks SET scheduled_time = ?, executed = 0, updated_at = ? WHERE id = ?',
          args: [nextRun.toISOString(), new Date().toISOString(), taskId],
        });
        console.log(`[Worker] Tarefa recorrente reagendada para ${nextRun.toISOString()}`);
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed: tasks.length,
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error('[Worker] Erro crítico no processamento:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno no worker' 
    }, { status: 500 });
  }
}
