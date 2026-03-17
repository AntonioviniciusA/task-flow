import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { scheduleTask, cancelTask, calculateNextRun } from "@/lib/scheduler";
import type { ApiResponse, Task } from "@/lib/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/tasks/[id]/action - Handle notification actions (complete, snooze)
export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse<ApiResponse<Task>>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Não autenticado" },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const { action } = await request.json();

    // Verify task exists and belongs to user
    const existing = await db.execute({
      sql: "SELECT * FROM tasks WHERE id = ? AND user_id = ?",
      args: [id, session.user.id],
    });

    if (existing.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Tarefa não encontrada" },
        { status: 404 },
      );
    }

    const task = existing.rows[0] as unknown as Task;
    const now = new Date().toISOString();

    if (action === "complete") {
      // Handle recurrence if applicable
      if (task.frequency && task.frequency !== "once") {
        const currentScheduled = task.scheduled_time
          ? new Date(task.scheduled_time)
          : new Date();
        const nextRun = calculateNextRun(
          currentScheduled,
          task.frequency as any,
          task.frequency_day_of_week,
          task.frequency_day_of_month,
          task.all_day
        );

        // Update due_date based on the difference
        let nextDueDate = task.due_date;
        if (task.due_date) {
          const oldDueDate = new Date(task.due_date);
          const diffTime = nextRun.getTime() - currentScheduled.getTime();
          const newDueDate = new Date(oldDueDate.getTime() + diffTime);
          nextDueDate = newDueDate.toISOString().split("T")[0];
        }

        await db.execute({
          sql: `UPDATE tasks SET scheduled_time = ?, due_date = ?, executed = 0, updated_at = ? WHERE id = ?`,
          args: [nextRun.toISOString(), nextDueDate, now, id],
        });
      } else {
        // Mark task as completed
        await db.execute({
          sql: `UPDATE tasks SET status = 'completed', completed_at = ?, executed = 1, updated_at = ? WHERE id = ?`,
          args: [now, now, id],
        });
        // Cancel scheduled notification
        await cancelTask(id);
      }

      // Log the interaction
      await db.execute({
        sql: `UPDATE notification_logs 
              SET status = 'clicked', interacted_at = datetime('now'), action_taken = 'complete'
              WHERE task_id = ? AND status = 'sent'
              ORDER BY sent_at DESC LIMIT 1`,
        args: [id],
      });

      const updatedResult = await db.execute({
        sql: "SELECT * FROM tasks WHERE id = ?",
        args: [id],
      });

      return NextResponse.json({
        success: true,
        data: {
          ...updatedResult.rows[0],
          notification_enabled: Boolean(
            updatedResult.rows[0].notification_enabled,
          ),
        } as unknown as Task,
        message: "Tarefa concluída",
      });
    }

    if (action === "snooze") {
      // Snooze for 15 minutes
      const snoozeMinutes = 15;

      // Calculate new notification time
      const newNotificationTime = new Date(
        Date.now() + snoozeMinutes * 60 * 1000,
      );

      // Schedule new notification
      await scheduleTask(id, newNotificationTime);

      // Log the interaction
      await db.execute({
        sql: `UPDATE notification_logs 
              SET status = 'clicked', interacted_at = datetime('now'), action_taken = 'snooze'
              WHERE task_id = ? AND status = 'sent'
              ORDER BY sent_at DESC LIMIT 1`,
        args: [id],
      });

      const updatedResult = await db.execute({
        sql: "SELECT * FROM tasks WHERE id = ?",
        args: [id],
      });

      return NextResponse.json({
        success: true,
        data: {
          ...updatedResult.rows[0],
          notification_enabled: Boolean(
            updatedResult.rows[0].notification_enabled,
          ),
        } as unknown as Task,
        message: `Adiado por ${snoozeMinutes} minutos`,
      });
    }

    return NextResponse.json(
      { success: false, error: "Ação inválida" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Error handling task action:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao processar ação" },
      { status: 500 },
    );
  }
}
