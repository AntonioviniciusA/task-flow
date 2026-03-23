import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH /api/groups/[id] - Editar nome ou senha do grupo
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    const { id: groupId } = await context.params;
    const { name, password } = await request.json();

    // Verificar se o usuário logado é admin do grupo
    const adminCheck = await db.execute({
      sql: "SELECT role FROM group_members WHERE group_id = ? AND user_id = ? AND role = 'admin'",
      args: [groupId, session.user.id],
    });

    if (adminCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Apenas administradores podem editar o grupo" }, { status: 403 });
    }

    const updates: string[] = [];
    const args: any[] = [];

    if (name) {
      updates.push("name = ?");
      args.push(name);
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push("password_hash = ?");
      args.push(passwordHash);
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: "Nenhum dado para atualizar" }, { status: 400 });
    }

    args.push(groupId);
    await db.execute({
      sql: `UPDATE groups SET ${updates.join(", ")} WHERE id = ?`,
      args,
    });

    return NextResponse.json({ success: true, message: "Grupo atualizado com sucesso" });
  } catch (error) {
    console.error("Error updating group:", error);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}

// DELETE /api/groups/[id] - Excluir o grupo
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    const { id: groupId } = await context.params;

    // Verificar se o usuário logado é o criador ou admin do grupo
    const adminCheck = await db.execute({
      sql: "SELECT role FROM group_members WHERE group_id = ? AND user_id = ? AND role = 'admin'",
      args: [groupId, session.user.id],
    });

    if (adminCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Apenas administradores podem excluir o grupo" }, { status: 403 });
    }

    // Excluir membros e tarefas associadas (dependendo da sua estratégia de FK, aqui faremos manual)
    await db.batch([
      {
        sql: "DELETE FROM group_members WHERE group_id = ?",
        args: [groupId],
      },
      {
        sql: "UPDATE tasks SET group_id = NULL WHERE group_id = ?",
        args: [groupId],
      },
      {
        sql: "DELETE FROM groups WHERE id = ?",
        args: [groupId],
      }
    ]);

    return NextResponse.json({ success: true, message: "Grupo excluído com sucesso" });
  } catch (error) {
    console.error("Error deleting group:", error);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
