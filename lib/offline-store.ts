import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Task, SyncOperation } from './types'

interface TasksDB extends DBSchema {
  tasks: {
    key: string
    value: Task
    indexes: {
      'by-status': string
      'by-date': string
    }
  }
  syncQueue: {
    key: string
    value: SyncQueueItem
    indexes: {
      'by-timestamp': number
    }
  }
  meta: {
    key: string
    value: {
      lastSyncAt: string | null
      userId: string | null
    }
  }
}

interface SyncQueueItem {
  id: string
  operation: SyncOperation
  entityType: 'task' | 'category'
  entityId: string
  payload?: unknown
  timestamp: number
}

const DB_NAME = 'tasks-offline'
const DB_VERSION = 1

let dbInstance: IDBPDatabase<TasksDB> | null = null

async function getDB(): Promise<IDBPDatabase<TasksDB>> {
  if (dbInstance) return dbInstance

  dbInstance = await openDB<TasksDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Tasks store
      if (!db.objectStoreNames.contains('tasks')) {
        const taskStore = db.createObjectStore('tasks', { keyPath: 'id' })
        taskStore.createIndex('by-status', 'status')
        taskStore.createIndex('by-date', 'due_date')
      }

      // Sync queue store
      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' })
        syncStore.createIndex('by-timestamp', 'timestamp')
      }

      // Meta store
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta')
      }
    },
  })

  return dbInstance
}

// Tasks operations
export async function getAllTasks(): Promise<Task[]> {
  const db = await getDB()
  return db.getAll('tasks')
}

export async function getTasksByStatus(status: string): Promise<Task[]> {
  const db = await getDB()
  return db.getAllFromIndex('tasks', 'by-status', status)
}

export async function getTask(id: string): Promise<Task | undefined> {
  const db = await getDB()
  return db.get('tasks', id)
}

export async function saveTask(task: Task): Promise<void> {
  const db = await getDB()
  await db.put('tasks', task)
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('tasks', 'readwrite')
  await Promise.all([
    ...tasks.map((task) => tx.store.put(task)),
    tx.done,
  ])
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('tasks', id)
}

export async function clearTasks(): Promise<void> {
  const db = await getDB()
  await db.clear('tasks')
}

// Sync queue operations
export async function addToSyncQueue(
  operation: SyncOperation,
  entityType: 'task' | 'category',
  entityId: string,
  payload?: unknown
): Promise<void> {
  const db = await getDB()
  const item: SyncQueueItem = {
    id: `${entityType}-${entityId}-${Date.now()}`,
    operation,
    entityType,
    entityId,
    payload,
    timestamp: Date.now(),
  }
  await db.add('syncQueue', item)
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getDB()
  return db.getAllFromIndex('syncQueue', 'by-timestamp')
}

export async function clearSyncQueue(): Promise<void> {
  const db = await getDB()
  await db.clear('syncQueue')
}

export async function removeSyncItem(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('syncQueue', id)
}

// Meta operations
export async function setLastSyncTime(timestamp: string): Promise<void> {
  const db = await getDB()
  const meta = (await db.get('meta', 'sync')) || { lastSyncAt: null, userId: null }
  meta.lastSyncAt = timestamp
  await db.put('meta', meta, 'sync')
}

export async function getLastSyncTime(): Promise<string | null> {
  const db = await getDB()
  const meta = await db.get('meta', 'sync')
  return meta?.lastSyncAt || null
}

export async function setUserId(userId: string): Promise<void> {
  const db = await getDB()
  const meta = (await db.get('meta', 'sync')) || { lastSyncAt: null, userId: null }
  meta.userId = userId
  await db.put('meta', meta, 'sync')
}

export async function getUserId(): Promise<string | null> {
  const db = await getDB()
  const meta = await db.get('meta', 'sync')
  return meta?.userId || null
}

// Check if we're online
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

// Sync helper
export async function syncWithServer(): Promise<{ synced: number; failed: number }> {
  if (!isOnline()) {
    return { synced: 0, failed: 0 }
  }

  const queue = await getSyncQueue()
  let synced = 0
  let failed = 0

  for (const item of queue) {
    try {
      let response: Response

      switch (item.operation) {
        case 'create':
          response = await fetch(`/api/${item.entityType}s`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.payload),
          })
          break

        case 'update':
          response = await fetch(`/api/${item.entityType}s/${item.entityId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.payload),
          })
          break

        case 'delete':
          response = await fetch(`/api/${item.entityType}s/${item.entityId}`, {
            method: 'DELETE',
          })
          break

        default:
          continue
      }

      if (response.ok) {
        await removeSyncItem(item.id)
        synced++
      } else {
        failed++
      }
    } catch {
      failed++
    }
  }

  if (synced > 0) {
    await setLastSyncTime(new Date().toISOString())
  }

  return { synced, failed }
}

// Fetch and cache tasks from server
export async function fetchAndCacheTasks(): Promise<Task[]> {
  try {
    const response = await fetch('/api/tasks')
    if (!response.ok) throw new Error('Failed to fetch')

    const data = await response.json()
    const tasks = data.data as Task[]

    // Cache in IndexedDB
    await clearTasks()
    await saveTasks(tasks)
    await setLastSyncTime(new Date().toISOString())

    return tasks
  } catch {
    // Return cached tasks if fetch fails
    return getAllTasks()
  }
}
