import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { scheduleTask, cancelTask } from "@/lib/scheduler";
import type { ApiResponse, Task, UpdateTaskInput } from "@/lib/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/tasks/[id] - Get a single task
export async function GET(
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

    const result = await db.execute({
      sql: "SELECT * FROM tasks WHERE id = ? AND user_id = ?",
      args: [id, session.user.id],
    });

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Tarefa não encontrada" },
        { status: 404 },
      );
    }

    const task = {
      ...result.rows[0],
      notification_enabled: Boolean(result.rows[0].notification_enabled),
    } as unknown as Task;

    return NextResponse.json({ success: true, data: task });
  } catch (error) {
    console.error("Error fetching task:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao buscar tarefa" },
      { status: 500 },
    );
  }
}

// PATCH /api/tasks/[id] - Update a task
export async function PATCH(
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
    const body: UpdateTaskInput = await request.json();

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

    const currentTask = existing.rows[0] as unknown as Task;
    const now = new Date().toISOString();

    // Build update query dynamically
    if (body.notification_time) {
      const [hours, minutes] = body.notification_time.split(":").map(Number);
      if (minutes % 5 !== 0) {
        return NextResponse.json(
          {
            success: false,
            error: "O horário deve ser em intervalos de 5 minutos",
          },
          { status: 400 },
        );
      }
    }

    const updates: string[] = ["updated_at = ?"];
    const args: (string | number | null)[] = [now];

    if (body.title !== undefined) {
      updates.push("title = ?");
      args.push(body.title.trim());
    }

    if (body.description !== undefined) {
      updates.push("description = ?");
      args.push(body.description || null);
    }

    if (body.due_date !== undefined) {
      updates.push("due_date = ?");
      args.push(body.due_date || null);
    }

    if (body.frequency !== undefined) {
      updates.push("frequency = ?");
      args.push(body.frequency);
    }

    if (body.frequency_day_of_week !== undefined) {
      updates.push("frequency_day_of_week = ?");
      args.push(body.frequency_day_of_week ?? null);
    }

    if (body.frequency_day_of_month !== undefined) {
      updates.push("frequency_day_of_month = ?");
      args.push(body.frequency_day_of_month ?? null);
    }

    if (body.notification_time !== undefined) {
      updates.push("notification_time = ?");
      args.push(body.notification_time || null);
    }

    if (body.priority !== undefined) {
      updates.push("priority = ?");
      args.push(body.priority);
    }

    if (body.status !== undefined) {
      updates.push("status = ?");
      args.push(body.status);

      if (body.status === "completed") {
        updates.push("completed_at = ?");
        args.push(now);
      }
    }

    if (body.notification_enabled !== undefined) {
      updates.push("notification_enabled = ?");
      args.push(body.notification_enabled ? 1 : 0);
    }

    if (body.network_context_id !== undefined) {
      updates.push("network_context_id = ?");
      args.push(body.network_context_id || null);
    }

    args.push(id, session.user.id);

    await db.execute({
      sql: `UPDATE tasks SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`,
      args,
    });

    // Handle notification scheduling changes
    const dueDate = body.due_date ?? currentTask.due_date;
    const notificationTime =
      body.notification_time ?? currentTask.notification_time;
    const notificationEnabled =
      body.notification_enabled ?? currentTask.notification_enabled;
    const isCompleted = (body.status ?? currentTask.status) === "completed";
    const isCancelled = (body.status ?? currentTask.status) === "cancelled";

    // Cancel existing notification if needed
    if (
      currentTask.scheduled_time &&
      (isCompleted || isCancelled || !notificationEnabled)
    ) {
      await cancelTask(id);
    }

    // Schedule new notification if conditions are met
    if (notificationEnabled && !isCompleted && !isCancelled) {
      const needsReschedule =
        body.due_date !== undefined ||
        body.notification_time !== undefined ||
        body.frequency !== undefined ||
        body.frequency_day_of_week !== undefined ||
        body.frequency_day_of_month !== undefined ||
        body.scheduled_time_iso !== undefined;

      if (needsReschedule || !currentTask.scheduled_time) {
        if (body.scheduled_time_iso) {
          const scheduledDate = new Date(body.scheduled_time_iso);
          if (!isNaN(scheduledDate.getTime())) {
            await scheduleTask(id, scheduledDate);
          }
        } else if (notificationTime && dueDate) {
          const scheduledDate = new Date(`${dueDate}T${notificationTime}`);

          if (scheduledDate && !isNaN(scheduledDate.getTime())) {
            await scheduleTask(id, scheduledDate);
          }
        }
      }
    }

    // Handle category updates
    if (body.category_ids !== undefined) {
      await db.execute({
        sql: "DELETE FROM task_categories WHERE task_id = ?",
        args: [id],
      });

      for (const categoryId of body.category_ids) {
        await db.execute({
          sql: "INSERT INTO task_categories (task_id, category_id) VALUES (?, ?)",
          args: [id, categoryId],
        });
      }
    }

    // Fetch updated task
    const updatedResult = await db.execute({
      sql: "SELECT * FROM tasks WHERE id = ?",
      args: [id],
    });

    const updatedTask = {
      ...updatedResult.rows[0],
      notification_enabled: Boolean(updatedResult.rows[0].notification_enabled),
    } as unknown as Task;

    return NextResponse.json({
      success: true,
      data: updatedTask,
      message: "Tarefa atualizada com sucesso",
    });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao atualizar tarefa" },
      { status: 500 },
    );
  }
}

// DELETE /api/tasks/[id] - Delete a task
export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse<ApiResponse>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Não autenticado" },
        { status: 401 },
      );
    }

    const { id } = await context.params;

    // Get task to cancel notification if needed
    const existing = await db.execute({
      sql: "SELECT scheduled_time FROM tasks WHERE id = ? AND user_id = ?",
      args: [id, session.user.id],
    });

    if (existing.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Tarefa não encontrada" },
        { status: 404 },
      );
    }

    // Cancel scheduled notification
    await cancelTask(id);

    // Delete task and its categories
    await db.execute({
      sql: "DELETE FROM task_categories WHERE task_id = ?",
      args: [id],
    });

    await db.execute({
      sql: "DELETE FROM tasks WHERE id = ? AND user_id = ?",
      args: [id, session.user.id],
    });

    return NextResponse.json({
      success: true,
      message: "Tarefa excluída com sucesso",
    });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao excluir tarefa" },
      { status: 500 },
    );
  }
}
