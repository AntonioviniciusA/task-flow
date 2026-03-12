import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import type { ApiResponse, Category } from '@/lib/types'

// GET /api/categories - List all categories for the current user
export async function GET(): Promise<NextResponse<ApiResponse<Category[]>>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const result = await db.execute({
      sql: 'SELECT * FROM categories WHERE user_id = ? ORDER BY name ASC',
      args: [session.user.id],
    })

    return NextResponse.json({
      success: true,
      data: result.rows as unknown as Category[],
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar categorias' },
      { status: 500 }
    )
  }
}

// POST /api/categories - Create a new category
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<Category>>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const { name, color } = await request.json()

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nome é obrigatório' },
        { status: 400 }
      )
    }

    // Check if category already exists
    const existing = await db.execute({
      sql: 'SELECT id FROM categories WHERE user_id = ? AND name = ?',
      args: [session.user.id, name.trim()],
    })

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Categoria já existe' },
        { status: 409 }
      )
    }

    const id = nanoid()
    const now = new Date().toISOString()

    await db.execute({
      sql: 'INSERT INTO categories (id, user_id, name, color, created_at) VALUES (?, ?, ?, ?, ?)',
      args: [id, session.user.id, name.trim(), color || '#6366f1', now],
    })

    const category: Category = {
      id,
      user_id: session.user.id,
      name: name.trim(),
      color: color || '#6366f1',
      created_at: now,
    }

    return NextResponse.json(
      { success: true, data: category, message: 'Categoria criada com sucesso' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao criar categoria' },
      { status: 500 }
    )
  }
}

// DELETE /api/categories - Delete a category
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
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID é obrigatório' },
        { status: 400 }
      )
    }

    await db.execute({
      sql: 'DELETE FROM categories WHERE id = ? AND user_id = ?',
      args: [id, session.user.id],
    })

    return NextResponse.json({
      success: true,
      message: 'Categoria excluída com sucesso',
    })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao excluir categoria' },
      { status: 500 }
    )
  }
}
