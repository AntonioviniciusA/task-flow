import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

// POST /api/groups/join - Entrar em um grupo via convite ou senha
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    const { inviteToken, groupId, password } = await request.json();

    let targetGroupId = groupId;

    // Se tiver token, buscar o grupo correspondente
    if (inviteToken) {
      const groupResult = await db.execute({
        sql: "SELECT id FROM groups WHERE invite_token = ?",
        args: [inviteToken],
      });

      if (groupResult.rows.length === 0) {
        return NextResponse.json({ success: false, error: "Link de convite inválido" }, { status: 404 });
      }
      targetGroupId = groupResult.rows[0].id;
    }

    if (!targetGroupId) {
      return NextResponse.json({ success: false, error: "ID do grupo ou token é obrigatório" }, { status: 400 });
    }

    // Verificar se já é membro
    const memberCheck = await db.execute({
      sql: "SELECT role FROM group_members WHERE group_id = ? AND user_id = ?",
      args: [targetGroupId, session.user.id],
    });

    if (memberCheck.rows.length > 0) {
      return NextResponse.json({ success: false, error: "Você já faz parte deste grupo" }, { status: 400 });
    }

    // Se for entrada via senha (sem token), verificar a senha
    if (!inviteToken) {
      if (!password) {
        return NextResponse.json({ success: false, error: "Senha é necessária para entrar neste grupo" }, { status: 400 });
      }

      const groupResult = await db.execute({
        sql: "SELECT password_hash FROM groups WHERE id = ?",
        args: [targetGroupId],
      });

      if (groupResult.rows.length === 0) {
        return NextResponse.json({ success: false, error: "Grupo não encontrado" }, { status: 404 });
      }

      const isValidPassword = await bcrypt.compare(password, groupResult.rows[0].password_hash as string);
      if (!isValidPassword) {
        return NextResponse.json({ success: false, error: "Senha incorreta" }, { status: 401 });
      }
    }

    // Adicionar membro
    await db.execute({
      sql: "INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, 'member')",
      args: [targetGroupId, session.user.id],
    });

    return NextResponse.json({ 
      success: true, 
      message: "Você entrou no grupo com sucesso" 
    });
  } catch (error) {
    console.error("Error joining group:", error);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
