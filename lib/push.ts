import webPush from 'web-push';
import dotenv from "dotenv"
dotenv.config()
// Configurar VAPID
webPush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:antoniovinicius_@outlook.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushPayload {
  title: string;
  body: string;
  taskId?: string;
  url?: string;
  urgency?: 'low' | 'medium' | 'high';
}

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushPayload
) {
  try {
    await webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
      JSON.stringify(payload),
      {
        urgency: payload.urgency === 'high' ? 'high' : 'normal',
        TTL: 60 * 60 * 24, // 24 horas
      }
    );
    return { success: true };
  } catch (error) {
    console.error('Erro ao enviar notificação push:', error);
    return { success: false, error };
  }
}

export async function sendPushToMultipleDevices(
  subscriptions: PushSubscription[],
  payload: PushPayload
) {
  const results = await Promise.allSettled(
    subscriptions.map((sub) => sendPushNotification(sub, payload))
  );

  const successful = results.filter(
    (r) => r.status === 'fulfilled' && r.value.success
  ).length;
  
  const failed = results.length - successful;

  return { successful, failed, total: results.length };
}

// Gerar VAPID keys (usar uma vez para configurar)
export function generateVapidKeys() {
  return webPush.generateVAPIDKeys();
}
