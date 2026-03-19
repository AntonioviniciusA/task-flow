import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/lib/types";

// GET /api/share/[token] - Get share information
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const { token } = await params;

    // 1. Find the token and check expiry
    const shareResult = await db.execute({
      sql: `SELECT s.* FROM temporary_shares s WHERE s.token = ? AND s.expires_at > ?`,
      args: [token, new Date().toISOString()],
    });

    if (shareResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Link expirado ou inválido" },
        { status: 404 }
      );
    }

    const share = shareResult.rows[0];

    // 2. Get all tasks linked to this token
    const tasksResult = await db.execute({
      sql: `SELECT t.id, t.title, t.description, t.due_date, t.priority, t.frequency 
            FROM tasks t
            JOIN temporary_share_tasks st ON t.id = st.task_id
            WHERE st.token = ?`,
      args: [token],
    });

    return NextResponse.json({
      success: true,
      data: {
        tasks: tasksResult.rows,
        mode: share.mode,
        expires_at: share.expires_at,
      },
    });
  } catch (error) {
    console.error("Error fetching share info:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao buscar informações do link" },
      { status: 500 }
    );
  }
}
