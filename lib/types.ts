// Tipos base do banco de dados
export interface User {
  id: string;
  email: string;
  name: string;
  password_hash?: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  session_token: string;
  user_id: string;
  expires: string;
  created_at: string;
}

export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type TaskFrequency = "once" | "daily" | "weekly" | "monthly";

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  frequency: TaskFrequency;
  frequency_day_of_week: number | null; // 0-6 (Sun-Sat)
  frequency_day_of_month: number | null; // 1-31
  notification_time: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  notification_enabled: boolean;
  executed: boolean;
  scheduled_time: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  categories?: Category[];
}

export interface Device {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  device_name: string | null;
  is_active: boolean;
  last_used_at: string;
  created_at: string;
}

export type NotificationStatus =
  | "sent"
  | "delivered"
  | "failed"
  | "clicked"
  | "dismissed";

export interface NotificationLog {
  id: string;
  task_id: string;
  device_id: string | null;
  status: NotificationStatus;
  error_message: string | null;
  sent_at: string;
  delivered_at: string | null;
  interacted_at: string | null;
  action_taken: string | null;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface TaskCategory {
  task_id: string;
  category_id: string;
}

export type SyncOperation = "create" | "update" | "delete";

export interface SyncQueueItem {
  id: string;
  user_id: string;
  operation: SyncOperation;
  entity_type: string;
  entity_id: string;
  payload: string | null;
  created_at: string;
  synced_at: string | null;
}

// DTOs para criação/atualização
export interface CreateTaskInput {
  title: string;
  description?: string;
  due_date?: string;
  frequency?: TaskFrequency;
  frequency_day_of_week?: number;
  frequency_day_of_month?: number;
  notification_time?: string;
  priority?: TaskPriority;
  notification_enabled?: boolean;
  scheduled_time_iso?: string;
  category_ids?: string[];
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  status?: TaskStatus;
}

export interface CreateDeviceInput {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string;
  device_name?: string;
}

// Tipos para Web Push
export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: PushSubscriptionKeys;
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    taskId: string;
    action?: string;
    url?: string;
  };
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
}

// Tipos para resposta da API
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Tipos para autenticação
export interface SignUpInput {
  email: string;
  password: string;
  name: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

// Tipos para sincronização offline
export interface OfflineSyncPayload {
  operations: Array<{
    operation: SyncOperation;
    entity_type: "task" | "category";
    entity_id: string;
    payload?: unknown;
    client_timestamp: string;
  }>;
}

export interface SyncResult {
  synced: number;
  conflicts: number;
  failed: number;
  details: Array<{
    entity_id: string;
    status: "synced" | "conflict" | "failed";
    message?: string;
  }>;
}
