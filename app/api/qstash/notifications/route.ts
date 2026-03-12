import { NextRequest, NextResponse } from 'next/server'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { db } from '@/lib/db'
import { sendPushNotification } from '@/lib/push'
import { nanoid } from 'nanoid'
import type { Task, Device, QStashSchedulePayload } from '@/lib/types'

async function handler(request: NextRequest) {
  try {
    const payload: QStashSchedulePayload = await request.json()
    const { taskId, userId, notificationType } = payload

    // Fetch the task
    const taskResult = await db.execute({
      sql: 'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
      args: [taskId, userId],
    })

    if (taskResult.rows.length === 0) {
      console.log('Task not found:', taskId)
      return NextResponse.json({ success: true, message: 'Task not found, skipping' })
    }

    const task = taskResult.rows[0] as unknown as Task

    // Skip if task is already completed or cancelled
    if (task.status === 'completed' || task.status === 'cancelled') {
      console.log('Task already completed/cancelled:', taskId)
      return NextResponse.json({ success: true, message: 'Task already handled' })
    }

    // Fetch user's active devices
    const devicesResult = await db.execute({
      sql: 'SELECT * FROM devices WHERE user_id = ? AND is_active = 1',
      args: [userId],
    })

    if (devicesResult.rows.length === 0) {
      console.log('No active devices for user:', userId)
      return NextResponse.json({ success: true, message: 'No active devices' })
    }

    const devices = devicesResult.rows as unknown as Device[]

    // Build notification content
    let title: string
    let body: string
    const icon = '/icons/icon-192x192.png'
    const badge = '/icons/icon-72x72.png'

    switch (notificationType) {
      case 'reminder':
        title = 'Lembrete de Tarefa'
        body = `"${task.title}" está chegando em ${task.notification_minutes_before} minutos`
        break
      case 'due':
        title = 'Tarefa Agendada'
        body = `"${task.title}" está marcada para agora`
        break
      case 'overdue':
        title = 'Tarefa Atrasada'
        body = `"${task.title}" passou do horário`
        break
      default:
        title = 'Notificação de Tarefa'
        body = task.title
    }

    // Priority-based urgency
    const priorityLabels: Record<string, string> = {
      high: ' [ALTA PRIORIDADE]',
      medium: '',
      low: ' [baixa prioridade]',
    }
    body += priorityLabels[task.priority] || ''

    // Send to all devices
    const results = await Promise.allSettled(
      devices.map(async (device) => {
        const logId = nanoid()

        try {
          await sendPushNotification(
            {
              endpoint: device.endpoint,
              keys: {
                p256dh: device.p256dh,
                auth: device.auth,
              },
            },
            {
              title,
              body,
              icon,
              badge,
              tag: `task-${taskId}`,
              data: {
                taskId,
                action: notificationType,
                url: `/dashboard/tasks/${taskId}`,
              },
              actions: [
                { action: 'complete', title: 'Concluir' },
                { action: 'snooze', title: 'Adiar 15min' },
              ],
              requireInteraction: task.priority === 'high',
            }
          )

          // Log successful send
          await db.execute({
            sql: `INSERT INTO notification_logs (id, task_id, device_id, status, sent_at)
                  VALUES (?, ?, ?, 'sent', datetime('now'))`,
            args: [logId, taskId, device.id],
          })

          return { deviceId: device.id, success: true }
        } catch (error) {
          console.error(`Failed to send to device ${device.id}:`, error)

          // Log failure
          await db.execute({
            sql: `INSERT INTO notification_logs (id, task_id, device_id, status, error_message, sent_at)
                  VALUES (?, ?, ?, 'failed', ?, datetime('now'))`,
            args: [logId, taskId, device.id, error instanceof Error ? error.message : 'Unknown error'],
          })

          // Deactivate device if push failed permanently
          if (error instanceof Error && error.message.includes('410')) {
            await db.execute({
              sql: 'UPDATE devices SET is_active = 0 WHERE id = ?',
              args: [device.id],
            })
          }

          return { deviceId: device.id, success: false, error }
        }
      })
    )

    const successful = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length

    return NextResponse.json({
      success: true,
      message: `Sent to ${successful}/${devices.length} devices`,
    })
  } catch (error) {
    console.error('QStash webhook error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal error' },
      { status: 500 }
    )
  }
}

// Wrap handler with QStash signature verification
export const POST = verifySignatureAppRouter(handler)
