import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import type { ApiResponse } from "@/lib/types";

// POST /api/tasks/join - Join a shared task
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Não autenticado" },
        { status: 401 },
      );
    }

    const { taskId, taskIds, mode } = await request.json();

    const idsToJoin = taskIds || (taskId ? [taskId] : []);

    if (idsToJoin.length === 0) {
      return NextResponse.json(
        { success: false, error: "ID da tarefa é obrigatório" },
        { status: 400 },
      );
    }

    let successCount = 0;

    for (const id of idsToJoin) {
      // 1. Verificar se a tarefa existe
      const taskResult = await db.execute({
        sql: "SELECT * FROM tasks WHERE id = ?",
        args: [id],
      });

      if (taskResult.rows.length === 0) continue;

      const task = taskResult.rows[0];

      if (mode === "copy") {
        // Criar uma nova tarefa com os mesmos dados
        const newId = nanoid();
        const now = new Date().toISOString();

        await db.execute({
          sql: `INSERT INTO tasks (
            id, user_id, title, description, due_date,
            frequency, frequency_day_of_week, frequency_day_of_month, notification_time,
            priority, status, notification_enabled, all_day, 
            all_day_time1, all_day_time2, all_day_time3,
            icon, executed, created_at, updated_at
          ) SELECT ?, ?, title, description, due_date,
                   frequency, frequency_day_of_week, frequency_day_of_month, notification_time,
                   priority, 'pending', notification_enabled, all_day,
                   all_day_time1, all_day_time2, all_day_time3,
                   icon, 0, ?, ?
            FROM tasks WHERE id = ?`,
          args: [newId, session.user.id, now, now, id],
        });
        successCount++;
      } else {
        // Sincronizar (linkar)
        if (task.user_id === session.user.id) continue;

        try {
          await db.execute({
            sql: "INSERT INTO task_shares (task_id, user_id) VALUES (?, ?)",
            args: [id, session.user.id],
          });
          successCount++;
        } catch (e: any) {
          if (!e.message.includes("UNIQUE constraint failed")) throw e;
          successCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `${successCount} tarefas vinculadas com sucesso`,
    });
  } catch (error) {
    console.error("Error joining task:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao vincular tarefa" },
      { status: 500 },
    );
  }
}
