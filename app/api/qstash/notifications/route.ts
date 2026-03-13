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

    if (!taskId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload' },
        { status: 400 }
      )
    }

    // Fetch task
    const taskResult = await db.execute({
      sql: 'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
      args: [taskId, userId],
    })

    if (taskResult.rows.length === 0) {
      console.log('Task not found:', taskId)
      return NextResponse.json({
        success: true,
        message: 'Task not found, skipping',
      })
    }

    const task = taskResult.rows[0] as Task

    // Skip completed or cancelled tasks
    if (task.status === 'completed' || task.status === 'cancelled') {
      console.log('Task already completed/cancelled:', taskId)
      return NextResponse.json({
        success: true,
        message: 'Task already handled',
      })
    }

    // Fetch active devices
    const devicesResult = await db.execute({
      sql: 'SELECT * FROM devices WHERE user_id = ? AND is_active = 1',
      args: [userId],
    })

    if (devicesResult.rows.length === 0) {
      console.log('No active devices for user:', userId)
      return NextResponse.json({
        success: true,
        message: 'No active devices',
      })
    }

    const devices = devicesResult.rows as Device[]

    // Notification content
    let title: string
    let body: string

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

    const priorityLabels: Record<string, string> = {
      high: ' [ALTA PRIORIDADE]',
      medium: '',
      low: ' [baixa prioridade]',
    }

    body += priorityLabels[task.priority] || ''

    // Send notifications
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
              taskId: `task-${taskId}`,
              url: `/dashboard/tasks/${taskId}`,
              urgency: task.priority === 'high' ? 'high' : 'normal',
            }
          )

          await db.execute({
            sql: `
              INSERT INTO notification_logs 
              (id, task_id, device_id, status, sent_at)
              VALUES (?, ?, ?, 'sent', datetime('now'))
            `,
            args: [logId, taskId, device.id],
          })

          return { deviceId: device.id, success: true }
        } catch (error) {
          console.error(`Failed to send to device ${device.id}:`, error)

          await db.execute({
            sql: `
              INSERT INTO notification_logs 
              (id, task_id, device_id, status, error_message, sent_at)
              VALUES (?, ?, ?, 'failed', ?, datetime('now'))
            `,
            args: [
              logId,
              taskId,
              device.id,
              error instanceof Error ? error.message : 'Unknown error',
            ],
          })

          // deactivate device if endpoint expired
          if (error instanceof Error && error.message.includes('410')) {
            await db.execute({
              sql: 'UPDATE devices SET is_active = 0 WHERE id = ?',
              args: [device.id],
            })
          }

          return {
            deviceId: device.id,
            success: false,
            error,
          }
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

export const POST = verifySignatureAppRouter(handler)