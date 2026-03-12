import { NextRequest, NextResponse } from 'next/server'
import { createUser } from '@/lib/auth'
import type { ApiResponse, SignUpInput, User } from '@/lib/types'

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<User>>> {
  try {
    const body: SignUpInput = await request.json()

    if (!body.email || !body.password || !body.name) {
      return NextResponse.json(
        { success: false, error: 'Email, senha e nome são obrigatórios' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { success: false, error: 'Email inválido' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (body.password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'A senha deve ter no mínimo 8 caracteres' },
        { status: 400 }
      )
    }

    // Validate name
    if (body.name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'O nome deve ter no mínimo 2 caracteres' },
        { status: 400 }
      )
    }

    const user = await createUser(body.email, body.password, body.name.trim())

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Email já está em uso' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { 
        success: true, 
        data: user,
        message: 'Conta criada com sucesso' 
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
