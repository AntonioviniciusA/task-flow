import { db } from './db';
import type { TaskFrequency } from './types';

/**
 * Calcula a próxima data de execução baseada na frequência
 */
export function calculateNextRun(
  currentDate: Date,
  frequency: TaskFrequency,
  dayOfWeek?: number | null,
  dayOfMonth?: number | null
): Date {
  const next = new Date(currentDate);

  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      // Se tivermos um dia da semana específico (0-6)
      if (dayOfWeek !== null && dayOfWeek !== undefined) {
        next.setDate(next.getDate() + 7);
        // Ajusta para o dia da semana correto se necessário (embora o cron/scheduler deva lidar com isso na primeira vez)
      } else {
        next.setDate(next.getDate() + 7);
      }
      break;
    case 'monthly':
      if (dayOfMonth !== null && dayOfMonth !== undefined) {
        next.setMonth(next.getMonth() + 1);
        // Tenta manter o mesmo dia do mês
        next.setDate(dayOfMonth);
      } else {
        next.setMonth(next.getMonth() + 1);
      }
      break;
    default:
      // 'once' não tem próxima execução
      break;
  }

  return next;
}

/**
 * Agenda uma tarefa no banco de dados
 */
export async function scheduleTask(taskId: string, scheduledTime: Date) {
  await db.execute({
    sql: 'UPDATE tasks SET scheduled_time = ?, executed = 0 WHERE id = ?',
    args: [scheduledTime.toISOString(), taskId],
  });
}

/**
 * Cancela o agendamento de uma tarefa
 */
export async function cancelTask(taskId: string) {
  await db.execute({
    sql: 'UPDATE tasks SET scheduled_time = NULL, executed = 0 WHERE id = ?',
    args: [taskId],
  });
}

/**
 * Reagenda uma tarefa
 */
export async function rescheduleTask(taskId: string, newScheduledTime: Date) {
  await scheduleTask(taskId, newScheduledTime);
}
