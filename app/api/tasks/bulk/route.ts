import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { nanoid } from "nanoid";
import { cancelTask, scheduleTask } from "@/lib/scheduler";
import type { ApiResponse } from "@/lib/types";

// POST /api/tasks/bulk - Bulk actions on tasks
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Não autenticado" },
        { status: 401 }
      );
    }

    const { taskIds, action, mode } = await request.json();

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "IDs das tarefas são obrigatórios" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    if (action === "complete") {
      // Mark all as completed
      await db.execute({
        sql: `UPDATE tasks SET status = 'completed', completed_at = ?, executed = 1, updated_at = ? 
              WHERE id IN (${taskIds.map(() => '?').join(',')}) AND user_id = ?`,
        args: [...taskIds, session.user.id],
      });
      
      // Cancel notifications for these tasks
      for (const id of taskIds) {
        await cancelTask(id);
      }

      return NextResponse.json({ success: true, message: `${taskIds.length} tarefas concluídas` });
    }

    if (action === "delete") {
      // Delete all selected
      await db.execute({
        sql: `DELETE FROM tasks WHERE id IN (${taskIds.map(() => '?').join(',')}) AND user_id = ?`,
        args: [...taskIds, session.user.id],
      });

      return NextResponse.json({ success: true, message: `${taskIds.length} tarefas excluídas` });
    }

    if (action === "share" || action === "sync") {
      // Generate a temporary link for multiple tasks
      const token = nanoid(32);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const shareMode = action === "share" ? "copy" : "sync";

      // 1. Create the temporary share record
      await db.execute({
        sql: `INSERT INTO temporary_shares (token, created_by, expires_at, mode) VALUES (?, ?, ?, ?)`,
        args: [token, session.user.id, expiresAt, shareMode],
      });

      // 2. Link tasks to this token
      for (const taskId of taskIds) {
        // Verify task belongs to user before linking
        const taskCheck = await db.execute({
          sql: "SELECT id FROM tasks WHERE id = ? AND user_id = ?",
          args: [taskId, session.user.id],
        });

        if (taskCheck.rows.length > 0) {
          await db.execute({
            sql: `INSERT INTO temporary_share_tasks (token, task_id) VALUES (?, ?)`,
            args: [token, taskId],
          });
        }
      }

      return NextResponse.json({
        success: true,
        data: { token, expires_at: expiresAt, mode: shareMode },
        message: "Link gerado com sucesso",
      });
    }

    return NextResponse.json(
      { success: false, error: "Ação inválida" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Bulk action error:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao processar ação em massa" },
      { status: 500 }
    );
  }
}
