import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/groups/[id]/members - Listar membros do grupo
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    const { id: groupId } = await context.params;

    // Verificar se o usuário faz parte do grupo
    const memberCheck = await db.execute({
      sql: "SELECT role FROM group_members WHERE group_id = ? AND user_id = ?",
      args: [groupId, session.user.id],
    });

    if (memberCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Sem permissão" }, { status: 403 });
    }

    const members = await db.execute({
      sql: `
        SELECT u.id, u.name, u.email, gm.role, gm.joined_at
        FROM users u
        JOIN group_members gm ON u.id = gm.user_id
        WHERE gm.group_id = ?
        ORDER BY gm.role ASC, u.name ASC
      `,
      args: [groupId],
    });

    return NextResponse.json({ success: true, data: members.rows });
  } catch (error) {
    console.error("Error fetching group members:", error);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}

// PATCH /api/groups/[id]/members - Atualizar cargo do membro (ex: dar admin)
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    const { id: groupId } = await context.params;
    const { userId, role } = await request.json();

    if (!userId || !role) {
      return NextResponse.json({ success: false, error: "Dados incompletos" }, { status: 400 });
    }

    // Verificar se o usuário logado é admin do grupo
    const adminCheck = await db.execute({
      sql: "SELECT role FROM group_members WHERE group_id = ? AND user_id = ? AND role = 'admin'",
      args: [groupId, session.user.id],
    });

    if (adminCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Apenas administradores podem gerenciar cargos" }, { status: 403 });
    }

    await db.execute({
      sql: "UPDATE group_members SET role = ? WHERE group_id = ? AND user_id = ?",
      args: [role, groupId, userId],
    });

    return NextResponse.json({ success: true, message: "Cargo atualizado com sucesso" });
  } catch (error) {
    console.error("Error updating member role:", error);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}

// DELETE /api/groups/[id]/members - Remover membro (kick)
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    const { id: groupId } = await context.params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ success: false, error: "ID do usuário obrigatório" }, { status: 400 });
    }

    // Verificar se o usuário logado é admin ou está saindo do próprio grupo
    const requesterCheck = await db.execute({
      sql: "SELECT role FROM group_members WHERE group_id = ? AND user_id = ?",
      args: [groupId, session.user.id],
    });

    if (requesterCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Sem permissão" }, { status: 403 });
    }

    const requesterRole = requesterCheck.rows[0].role as string;
    const isSelf = userId === session.user.id;

    if (!isSelf && requesterRole !== 'admin') {
      return NextResponse.json({ success: false, error: "Apenas administradores podem remover membros" }, { status: 403 });
    }

    // Não permitir remover o último admin (opcional, mas recomendado)
    if (requesterRole === 'admin') {
      const adminsCount = await db.execute({
        sql: "SELECT COUNT(*) as count FROM group_members WHERE group_id = ? AND role = 'admin'",
        args: [groupId],
      });
      const count = Number(adminsCount.rows[0].count);
      
      const targetRole = await db.execute({
        sql: "SELECT role FROM group_members WHERE group_id = ? AND user_id = ?",
        args: [groupId, userId],
      });

      if (count <= 1 && targetRole.rows[0]?.role === 'admin') {
        return NextResponse.json({ success: false, error: "O grupo deve ter pelo menos um administrador" }, { status: 400 });
      }
    }

    await db.execute({
      sql: "DELETE FROM group_members WHERE group_id = ? AND user_id = ?",
      args: [groupId, userId],
    });

    return NextResponse.json({ success: true, message: isSelf ? "Você saiu do grupo" : "Membro removido com sucesso" });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
