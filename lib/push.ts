import webPush from 'web-push';
import { db } from './db';

// Configurar VAPID
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:antoniovinicius_@outlook.com',
    vapidPublicKey,
    vapidPrivateKey
  );
} else {
  console.warn('[Web Push] VAPID keys are not configured. Notifications will not work.');
}

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
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
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
  } catch (error: any) {
    // Se o erro for 404 (Gone) ou 410 (Expired), removemos a subscription
    if (error.statusCode === 404 || error.statusCode === 410) {
      console.warn(`[Web Push] Removendo subscription inválida: ${subscription.endpoint}`);
      await db.execute({
        sql: 'DELETE FROM devices WHERE endpoint = ?',
        args: [subscription.endpoint],
      });
    } else {
      console.error('Erro ao enviar notificação push:', error);
    }
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
    (r) => r.status === 'fulfilled' && (r as any).value.success
  ).length;
  
  const failed = results.length - successful;

  return { successful, failed, total: results.length };
}

// Gerar VAPID keys (usar uma vez para configurar)
export function generateVapidKeys() {
  return webPush.generateVAPIDKeys();
}
