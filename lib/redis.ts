import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// Chaves do Redis
export const REDIS_KEYS = {
  // Cache de tarefas por usuário
  userTasks: (userId: string) => `tasks:user:${userId}`,
  // Cache de dispositivos por usuário
  userDevices: (userId: string) => `devices:user:${userId}`,
  // Sessão do usuário
  userSession: (sessionId: string) => `session:${sessionId}`,
  // Rate limiting
  rateLimit: (ip: string, endpoint: string) => `ratelimit:${ip}:${endpoint}`,
};

// TTL padrão (em segundos)
export const CACHE_TTL = {
  tasks: 60 * 5, // 5 minutos
  devices: 60 * 60, // 1 hora
  session: 60 * 60 * 24 * 7, // 7 dias
};

// Funções de cache
export async function getCachedTasks(userId: string) {
  return redis.get<string>(REDIS_KEYS.userTasks(userId));
}

export async function setCachedTasks(userId: string, tasks: unknown) {
  return redis.set(REDIS_KEYS.userTasks(userId), JSON.stringify(tasks), {
    ex: CACHE_TTL.tasks,
  });
}

export async function invalidateTasksCache(userId: string) {
  return redis.del(REDIS_KEYS.userTasks(userId));
}

export async function getCachedDevices(userId: string) {
  return redis.get<string>(REDIS_KEYS.userDevices(userId));
}

export async function setCachedDevices(userId: string, devices: unknown) {
  return redis.set(REDIS_KEYS.userDevices(userId), JSON.stringify(devices), {
    ex: CACHE_TTL.devices,
  });
}

export async function invalidateDevicesCache(userId: string) {
  return redis.del(REDIS_KEYS.userDevices(userId));
}
