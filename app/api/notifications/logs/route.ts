import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import type { ApiResponse, NotificationLog } from '@/lib/types'

// GET /api/notifications/logs - Get notification logs for current user's tasks
export async function GET(): Promise<NextResponse<ApiResponse<NotificationLog[]>>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const result = await db.execute({
      sql: `SELECT nl.* FROM notification_logs nl
            JOIN tasks t ON nl.task_id = t.id
            WHERE t.user_id = ?
            ORDER BY nl.sent_at DESC
            LIMIT 50`,
      args: [session.user.id],
    })

    return NextResponse.json({
      success: true,
      data: result.rows as unknown as NotificationLog[],
    })
  } catch (error) {
    console.error('Error fetching notification logs:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar logs' },
      { status: 500 }
    )
  }
}
