import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import type { ApiResponse, Device, CreateDeviceInput } from '@/lib/types'

// GET /api/devices - List all devices for the current user
export async function GET(): Promise<NextResponse<ApiResponse<Device[]>>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const result = await db.execute({
      sql: 'SELECT * FROM devices WHERE user_id = ? ORDER BY last_used_at DESC',
      args: [session.user.id],
    })

    const devices = result.rows.map(row => ({
      ...row,
      is_active: Boolean(row.is_active),
    })) as unknown as Device[]

    return NextResponse.json({ success: true, data: devices })
  } catch (error) {
    console.error('Error fetching devices:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar dispositivos' },
      { status: 500 }
    )
  }
}

// POST /api/devices - Register a new device for push notifications
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<Device>>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const body: CreateDeviceInput = await request.json()

    if (!body.endpoint || !body.p256dh || !body.auth) {
      return NextResponse.json(
        { success: false, error: 'Dados de inscrição inválidos' },
        { status: 400 }
      )
    }

    // Check if device already exists
    const existing = await db.execute({
      sql: 'SELECT id, user_id FROM devices WHERE endpoint = ?',
      args: [body.endpoint],
    })

    const now = new Date().toISOString()

    if (existing.rows.length > 0) {
      const existingDevice = existing.rows[0] as unknown as Device

      // If same user, just update last_used_at
      if (existingDevice.user_id === session.user.id) {
        await db.execute({
          sql: 'UPDATE devices SET last_used_at = ?, is_active = 1 WHERE id = ?',
          args: [now, existingDevice.id],
        })

        const updated = await db.execute({
          sql: 'SELECT * FROM devices WHERE id = ?',
          args: [existingDevice.id],
        })

        return NextResponse.json({
          success: true,
          data: {
            ...updated.rows[0],
            is_active: Boolean(updated.rows[0].is_active),
          } as unknown as Device,
          message: 'Dispositivo atualizado',
        })
      }

      // Different user - transfer device
      await db.execute({
        sql: `UPDATE devices SET user_id = ?, p256dh = ?, auth = ?, 
              user_agent = ?, device_name = ?, last_used_at = ?, is_active = 1 
              WHERE id = ?`,
        args: [
          session.user.id,
          body.p256dh,
          body.auth,
          body.user_agent || null,
          body.device_name || null,
          now,
          existingDevice.id,
        ],
      })

      const updated = await db.execute({
        sql: 'SELECT * FROM devices WHERE id = ?',
        args: [existingDevice.id],
      })

      return NextResponse.json({
        success: true,
        data: {
          ...updated.rows[0],
          is_active: Boolean(updated.rows[0].is_active),
        } as unknown as Device,
        message: 'Dispositivo registrado',
      })
    }

    // Create new device
    const id = nanoid()

    await db.execute({
      sql: `INSERT INTO devices (id, user_id, endpoint, p256dh, auth, user_agent, device_name, is_active, last_used_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      args: [
        id,
        session.user.id,
        body.endpoint,
        body.p256dh,
        body.auth,
        body.user_agent || null,
        body.device_name || null,
        now,
        now,
      ],
    })

    const device: Device = {
      id,
      user_id: session.user.id,
      endpoint: body.endpoint,
      p256dh: body.p256dh,
      auth: body.auth,
      user_agent: body.user_agent || null,
      device_name: body.device_name || null,
      is_active: true,
      last_used_at: now,
      created_at: now,
    }

    return NextResponse.json(
      { success: true, data: device, message: 'Dispositivo registrado com sucesso' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error registering device:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao registrar dispositivo' },
      { status: 500 }
    )
  }
}

// DELETE /api/devices - Unregister a device
export async function DELETE(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get('endpoint')

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: 'Endpoint é obrigatório' },
        { status: 400 }
      )
    }

    await db.execute({
      sql: 'DELETE FROM devices WHERE endpoint = ? AND user_id = ?',
      args: [endpoint, session.user.id],
    })

    return NextResponse.json({
      success: true,
      message: 'Dispositivo removido com sucesso',
    })
  } catch (error) {
    console.error('Error removing device:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao remover dispositivo' },
      { status: 500 }
    )
  }
}
