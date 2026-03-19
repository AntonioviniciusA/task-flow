import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

// GET /api/groups - Listar grupos que o usuário participa
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    const result = await db.execute({
      sql: `
        SELECT g.*, gm.role 
        FROM groups g
        JOIN group_members gm ON g.id = gm.group_id
        WHERE gm.user_id = ?
        ORDER BY g.created_at DESC
      `,
      args: [session.user.id],
    });

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Error fetching groups:", error);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}

// POST /api/groups - Criar um novo grupo
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    const { name, password } = await request.json();
    if (!name || !password) {
      return NextResponse.json({ success: false, error: "Nome e senha são obrigatórios" }, { status: 400 });
    }

    const id = nanoid();
    const inviteToken = nanoid(12);
    const passwordHash = await bcrypt.hash(password, 10);

    await db.batch([
      {
        sql: "INSERT INTO groups (id, name, password_hash, invite_token, created_by) VALUES (?, ?, ?, ?, ?)",
        args: [id, name, passwordHash, inviteToken, session.user.id],
      },
      {
        sql: "INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, 'admin')",
        args: [id, session.user.id],
      }
    ]);

    return NextResponse.json({ 
      success: true, 
      data: { id, name, inviteToken },
      message: "Grupo criado com sucesso" 
    });
  } catch (error) {
    console.error("Error creating group:", error);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
