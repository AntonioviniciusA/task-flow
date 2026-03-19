import { createClient } from "@libsql/client";

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
  due_date: string | null;
  frequency: "once" | "daily" | "weekly" | "monthly";
  frequency_day_of_week: number | null;
  frequency_day_of_month: number | null;
  notification_time: string | null;
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  notification_enabled: boolean;
  all_day: boolean;
  all_day_time1: string | null;
  all_day_time2: string | null;
  all_day_time3: string | null;
  executed: boolean;
  scheduled_time: string | null;
  network_context_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
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
  status: "pending" | "sent" | "snoozed" | "cancelled";
  created_at: string;
}
