import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import type { ApiResponse } from "@/lib/types";

// GET /api/friends - Listar amigos e solicitações pendentes
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    // Buscar amigos aceitos
    const friendsResult = await db.execute({
      sql: `
        SELECT u.id, u.name, u.email, u.points, u.level
        FROM users u
        JOIN friendships f ON (f.user_id1 = u.id OR f.user_id2 = u.id)
        WHERE (f.user_id1 = ? OR f.user_id2 = ?)
        AND f.status = 'accepted'
        AND u.id != ?
      `,
      args: [session.user.id, session.user.id, session.user.id],
    });

    // Buscar solicitações pendentes recebidas
    const pendingResult = await db.execute({
      sql: `
        SELECT u.id, u.name, u.email
        FROM users u
        JOIN friendships f ON f.user_id1 = u.id
        WHERE f.user_id2 = ? AND f.status = 'pending'
      `,
      args: [session.user.id],
    });

    return NextResponse.json({
      success: true,
      data: {
        friends: friendsResult.rows,
        pendingRequests: pendingResult.rows,
      },
    });
  } catch (error) {
    console.error("Error fetching friends:", error);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}

// POST /api/friends - Enviar solicitação de amizade
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    const { email } = await request.json();
    if (!email) return NextResponse.json({ success: false, error: "Email obrigatório" }, { status: 400 });

    // Buscar usuário por email
    const userResult = await db.execute({
      sql: "SELECT id FROM users WHERE email = ?",
      args: [email.toLowerCase().trim()],
    });

    if (userResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Usuário não encontrado" }, { status: 404 });
    }

    const targetUserId = userResult.rows[0].id as string;
    if (targetUserId === session.user.id) {
      return NextResponse.json({ success: false, error: "Você não pode ser seu próprio amigo" }, { status: 400 });
    }

    // Ordenar IDs para evitar duplicidade (user_id1 < user_id2)
    const [id1, id2] = [session.user.id, targetUserId].sort();

    try {
      await db.execute({
        sql: "INSERT INTO friendships (user_id1, user_id2, status) VALUES (?, ?, 'pending')",
        args: [id1, id2],
      });
    } catch (e: any) {
      if (e.message.includes("UNIQUE constraint failed")) {
        return NextResponse.json({ success: false, error: "Já existe uma solicitação ou amizade" }, { status: 400 });
      }
      throw e;
    }

    return NextResponse.json({ success: true, message: "Solicitação enviada" });
  } catch (error) {
    console.error("Error sending friend request:", error);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}

// PATCH /api/friends - Aceitar solicitação de amizade
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    const { friendId, action } = await request.json(); // action: 'accept' ou 'reject'
    if (!friendId || !action) return NextResponse.json({ success: false, error: "Dados incompletos" }, { status: 400 });

    const [id1, id2] = [session.user.id, friendId].sort();

    if (action === 'accept') {
      await db.execute({
        sql: "UPDATE friendships SET status = 'accepted' WHERE user_id1 = ? AND user_id2 = ?",
        args: [id1, id2],
      });
      return NextResponse.json({ success: true, message: "Amizade aceita" });
    } else {
      await db.execute({
        sql: "DELETE FROM friendships WHERE user_id1 = ? AND user_id2 = ?",
        args: [id1, id2],
      });
      return NextResponse.json({ success: true, message: "Solicitação recusada" });
    }
  } catch (error) {
    console.error("Error updating friendship:", error);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
