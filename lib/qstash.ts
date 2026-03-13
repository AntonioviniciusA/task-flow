import { Client } from '@upstash/qstash';
import dotenv from "dotenv"
dotenv.config()
export const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
});

interface ScheduleNotificationParams {
  taskId: string;
  userId: string;
  scheduledTime: Date;
  title: string;
  body: string;
}

export async function scheduleTaskNotification({
  taskId,
  userId,
  scheduledTime,
  title,
  body,
}: ScheduleNotificationParams) {
  const now = new Date();
  const delaySeconds = Math.max(
    0,
    Math.floor((scheduledTime.getTime() - now.getTime()) / 1000)
  );

  const baseUrl =
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const result = await qstash.publishJSON({
    url: `${baseUrl}/api/qstash/webhook`,
    body: {
      taskId,
      userId,
      title,
      body,
      scheduledTime: scheduledTime.toISOString(),
    },
    delay: delaySeconds > 0 ? delaySeconds : undefined,
    retries: 3,
  });

  return result.messageId;
}

export async function cancelTaskNotification(messageId: string) {
  try {
    await qstash.messages.delete(messageId);
    return true;
  } catch (error) {
    console.error("Erro ao cancelar notificação:", error);
    return false;
  }
}

export async function rescheduleTaskNotification(
  oldMessageId: string,
  params: ScheduleNotificationParams
) {
  await cancelTaskNotification(oldMessageId);
  return scheduleTaskNotification(params);
}