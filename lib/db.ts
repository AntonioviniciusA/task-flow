import { createClient } from '@libsql/client';

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Tipos para o banco de dados
export interface User {
  id: string;
  email: string;
  name: string | null;
  password_hash: string;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  notification_time: string;
  frequency: 'once' | 'daily' | 'weekly' | 'custom';
  frequency_config: string | null;
  urgency: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface Device {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  device_name: string | null;
  created_at: string;
}

export interface ScheduledNotification {
  id: string;
  task_id: string;
  scheduled_time: string;
  qstash_message_id: string | null;
  status: 'pending' | 'sent' | 'snoozed' | 'cancelled';
  created_at: string;
}
