import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { nanoid } from "nanoid";
import type { ApiResponse } from "@/lib/types";

// POST /api/tasks/[id]/share - Generate a temporary share token
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<{ token: string; expires_at: string }>>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Não autenticado" },
        { status: 401 }
      );
    }

    const { id: taskId } = await params;

    // 1. Verify task belongs to user
    const taskResult = await db.execute({
      sql: "SELECT id FROM tasks WHERE id = ? AND user_id = ?",
      args: [taskId, session.user.id],
    });

    if (taskResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Tarefa não encontrada ou sem permissão" },
        { status: 404 }
      );
    }

    // 2. Generate token (24h expiry)
    const token = nanoid(32);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const mode = request.nextUrl.searchParams.get("mode") || "sync";

    // Start transaction or sequential inserts
    await db.execute({
      sql: `INSERT INTO temporary_shares (token, created_by, expires_at, mode) 
            VALUES (?, ?, ?, ?)`,
      args: [token, session.user.id, expiresAt, mode],
    });

    await db.execute({
      sql: `INSERT INTO temporary_share_tasks (token, task_id) VALUES (?, ?)`,
      args: [token, taskId],
    });

    return NextResponse.json({
      success: true,
      data: { token, expires_at: expiresAt },
    });
  } catch (error) {
    console.error("Error generating share token:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao gerar link de compartilhamento" },
      { status: 500 }
    );
  }
}
