'use client'

import { useState, useEffect, useCallback } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import {
  getAllTasks,
  saveTask,
  deleteTask as deleteFromDB,
  addToSyncQueue,
  syncWithServer,
  fetchAndCacheTasks,
  isOnline,
} from '@/lib/offline-store'
import type { Task, CreateTaskInput, UpdateTaskInput } from '@/lib/types'
import { nanoid } from 'nanoid'
import { toast } from 'sonner'

export function useOfflineTasks() {
  const [isOffline, setIsOffline] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const { mutate } = useSWRConfig()

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
      toast.success('Conexão restaurada')
      // Sync when back online
      handleSync()
    }

    const handleOffline = () => {
      setIsOffline(true)
      toast.warning('Sem conexão - modo offline ativado')
    }

    setIsOffline(!isOnline())

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Fetch tasks (online or from cache)
  const { data, error, isLoading } = useSWR<Task[]>(
    'tasks',
    async () => {
      if (isOnline()) {
        return fetchAndCacheTasks()
      }
      return getAllTasks()
    },
    {
      fallbackData: [],
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  )

  // Sync with server
  const handleSync = useCallback(async () => {
    if (!isOnline() || isSyncing) return

    setIsSyncing(true)
    try {
      const { synced, failed } = await syncWithServer()
      
      if (synced > 0) {
        toast.success(`${synced} alterações sincronizadas`)
        mutate('tasks')
      }
      
      if (failed > 0) {
        toast.error(`${failed} alterações falharam`)
      }
    } catch {
      toast.error('Erro ao sincronizar')
    } finally {
      setIsSyncing(false)
    }
  }, [isSyncing, mutate])

  // Create task (works offline)
  const createTask = useCallback(async (input: CreateTaskInput): Promise<Task | null> => {
    const id = nanoid()
    const now = new Date().toISOString()

    const newTask: Task = {
      id,
      user_id: '', // Will be set by server
      title: input.title,
      description: input.description || null,
      due_date: input.due_date || null,
      due_time: input.due_time || null,
      priority: input.priority || 'medium',
      status: 'pending',
      notification_enabled: input.notification_enabled !== false,
      notification_minutes_before: input.notification_minutes_before || 15,
      qstash_schedule_id: null,
      created_at: now,
      updated_at: now,
      completed_at: null,
    }

    if (isOnline()) {
      try {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        })

        if (response.ok) {
          const data = await response.json()
          await saveTask(data.data)
          mutate('tasks')
          return data.data
        }
        throw new Error('Failed to create')
      } catch {
        // Fall through to offline mode
      }
    }

    // Offline mode
    await saveTask(newTask)
    await addToSyncQueue('create', 'task', id, input)
    mutate('tasks')
    toast.info('Tarefa salva localmente')
    return newTask
  }, [mutate])

  // Update task (works offline)
  const updateTask = useCallback(async (id: string, input: UpdateTaskInput): Promise<Task | null> => {
    const existingTask = data?.find((t) => t.id === id)
    if (!existingTask) return null

    const updatedTask: Task = {
      ...existingTask,
      ...input,
      updated_at: new Date().toISOString(),
      completed_at: input.status === 'completed' ? new Date().toISOString() : existingTask.completed_at,
    }

    if (isOnline()) {
      try {
        const response = await fetch(`/api/tasks/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        })

        if (response.ok) {
          const data = await response.json()
          await saveTask(data.data)
          mutate('tasks')
          return data.data
        }
        throw new Error('Failed to update')
      } catch {
        // Fall through to offline mode
      }
    }

    // Offline mode
    await saveTask(updatedTask)
    await addToSyncQueue('update', 'task', id, input)
    mutate('tasks')
    toast.info('Alteração salva localmente')
    return updatedTask
  }, [data, mutate])

  // Delete task (works offline)
  const removeTask = useCallback(async (id: string): Promise<boolean> => {
    if (isOnline()) {
      try {
        const response = await fetch(`/api/tasks/${id}`, {
          method: 'DELETE',
        })

        if (response.ok) {
          await deleteFromDB(id)
          mutate('tasks')
          return true
        }
        throw new Error('Failed to delete')
      } catch {
        // Fall through to offline mode
      }
    }

    // Offline mode
    await deleteFromDB(id)
    await addToSyncQueue('delete', 'task', id)
    mutate('tasks')
    toast.info('Exclusão salva localmente')
    return true
  }, [mutate])

  return {
    tasks: data || [],
    isLoading,
    error,
    isOffline,
    isSyncing,
    createTask,
    updateTask,
    removeTask,
    sync: handleSync,
  }
}
