import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { scheduleTask, cancelTask, calculateNextRun } from "@/lib/scheduler";
import { addPoints, POINTS_PER_PRIORITY } from "@/lib/gamification";
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
      sql: `
        SELECT t.*, g.name as group_name 
        FROM tasks t
        LEFT JOIN groups g ON t.group_id = g.id
        WHERE t.id = ? 
        AND (
          t.user_id = ? 
          OR t.id IN (SELECT task_id FROM task_shares WHERE user_id = ?)
          OR t.group_id IN (SELECT group_id FROM group_members WHERE user_id = ?)
        )
      `,
      args: [id, session.user.id, session.user.id, session.user.id],
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

    // Verify task exists and user has permission (owner, participant or group member)
    const existing = await db.execute({
      sql: `
        SELECT t.* FROM tasks t
        WHERE t.id = ? 
        AND (
          t.user_id = ? 
          OR t.id IN (SELECT task_id FROM task_shares WHERE user_id = ?)
          OR t.group_id IN (SELECT group_id FROM group_members WHERE user_id = ?)
        )
      `,
      args: [id, session.user.id, session.user.id, session.user.id],
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
      if (
        body.status === "completed" &&
        currentTask.frequency &&
        currentTask.frequency !== "once"
      ) {
        // Handle recurrence: instead of marking as completed forever, schedule the next run
        const currentScheduled = currentTask.scheduled_time
          ? new Date(currentTask.scheduled_time)
          : new Date();
        const nextRun = calculateNextRun(
          currentScheduled,
          currentTask.frequency as any,
          currentTask.frequency_day_of_week,
          currentTask.frequency_day_of_month,
          currentTask.all_day || !!body.all_day,
        );

        // Update due_date based on the difference
        let nextDueDate = currentTask.due_date;
        if (currentTask.due_date) {
          const oldDueDate = new Date(currentTask.due_date);
          const diffTime = nextRun.getTime() - currentScheduled.getTime();
          const newDueDate = new Date(oldDueDate.getTime() + diffTime);
          nextDueDate = newDueDate.toISOString().split("T")[0];
        }

        updates.push("status = ?");
        args.push("pending"); // Keep it pending for the next recurrence

        updates.push("due_date = ?");
        args.push(nextDueDate);

        updates.push("scheduled_time = ?");
        args.push(nextRun.toISOString());

        updates.push("executed = ?");
        args.push(0);
      } else {
        updates.push("status = ?");
        args.push(body.status);

        if (body.status === "completed") {
          updates.push("completed_at = ?");
          args.push(now);
          updates.push("completed_by_user_id = ?");
          args.push(session.user.id);

          // Gamificação: Adicionar pontos ao concluir tarefa usando a lib
          const points = POINTS_PER_PRIORITY[currentTask.priority] || 25;
          await addPoints(session.user.id, points, "task_completed", id);
        }
      }
    }

    if (body.notification_enabled !== undefined) {
      updates.push("notification_enabled = ?");
      args.push(body.notification_enabled ? 1 : 0);
    }

    if (body.all_day !== undefined) {
      updates.push("all_day = ?");
      args.push(body.all_day ? 1 : 0);
    }

    if (body.all_day_time1 !== undefined) {
      updates.push("all_day_time1 = ?");
      args.push(body.all_day_time1);
    }

    if (body.all_day_time2 !== undefined) {
      updates.push("all_day_time2 = ?");
      args.push(body.all_day_time2);
    }

    if (body.all_day_time3 !== undefined) {
      updates.push("all_day_time3 = ?");
      args.push(body.all_day_time3);
    }

    if (body.icon !== undefined) {
      updates.push("icon = ?");
      args.push(body.icon || null);
    }

    if (body.group_id !== undefined) {
      updates.push("group_id = ?");
      args.push(body.group_id || null);
    }

    args.push(id);

    await db.execute({
      sql: `UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`,
      args,
    });

    // Handle notification scheduling changes
    const dueDate = body.due_date ?? currentTask.due_date;
    const notificationTime =
      body.notification_time ?? currentTask.notification_time;
    const notificationEnabled =
      body.notification_enabled ?? currentTask.notification_enabled;
    const allDay = body.all_day ?? currentTask.all_day;

    // If it was marked as completed but it's recurring, it actually stayed pending
    const isActuallyCompleted =
      body.status === "completed" &&
      (!currentTask.frequency || currentTask.frequency === "once");
    const isCompleted =
      isActuallyCompleted ||
      (body.status === undefined && currentTask.status === "completed");
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
        body.all_day !== undefined ||
        body.all_day_time1 !== undefined ||
        body.all_day_time2 !== undefined ||
        body.all_day_time3 !== undefined ||
        body.scheduled_time_iso !== undefined ||
        (body.status === "completed" &&
          currentTask.frequency &&
          currentTask.frequency !== "once"); // Reschedule if it recurred

      if (needsReschedule || !currentTask.scheduled_time) {
        // If it recurred, the DB already has the new scheduled_time, but we might overwrite it here if we call scheduleTask.
        // Actually, if it recurred, we already updated scheduled_time in the DB query above.
        // We should only call scheduleTask if we have a new scheduled_time_iso from the client, OR if we need to recalculate.
        if (
          body.status === "completed" &&
          currentTask.frequency &&
          currentTask.frequency !== "once"
        ) {
          // Do nothing, already handled in the DB update above
        } else if (body.scheduled_time_iso) {
          const scheduledDate = new Date(body.scheduled_time_iso);
          if (!isNaN(scheduledDate.getTime())) {
            await scheduleTask(id, scheduledDate);
          }
        } else if (allDay && dueDate) {
          // Para "dia todo", o primeiro horário é o configurado em all_day_time1
          const time1 =
            body.all_day_time1 || currentTask.all_day_time1 || "09:00";
          const scheduledDate = new Date(`${dueDate}T${time1}`);
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

    // Verify permission and get owner status
    const existing = await db.execute({
      sql: `
        SELECT user_id, scheduled_time, group_id
        FROM tasks 
        WHERE id = ? 
        AND (
          user_id = ? 
          OR id IN (SELECT task_id FROM task_shares WHERE user_id = ?)
          OR group_id IN (SELECT group_id FROM group_members WHERE user_id = ?)
        )
      `,
      args: [id, session.user.id, session.user.id, session.user.id],
    });

    if (existing.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Tarefa não encontrada" },
        { status: 404 },
      );
    }

    const taskData = existing.rows[0];
    const isOwner = taskData.user_id === session.user.id;
    const isGroupTask = !!taskData.group_id;

    if (isOwner || isGroupTask) {
      // Owner deletes for everyone. Group tasks are also deleted for everyone if any member deletes (or we can restrict to admin later)
      await cancelTask(id);
      await db.execute({
        sql: "DELETE FROM task_categories WHERE task_id = ?",
        args: [id],
      });
      await db.execute({
        sql: "DELETE FROM task_shares WHERE task_id = ?",
        args: [id],
      });
      await db.execute({
        sql: "DELETE FROM tasks WHERE id = ?",
        args: [id],
      });
    } else {
      // Participant just leaves the share
      await db.execute({
        sql: "DELETE FROM task_shares WHERE task_id = ? AND user_id = ?",
        args: [id, session.user.id],
      });
    }

    return NextResponse.json({
      success: true,
      message:
        isOwner || isGroupTask
          ? "Tarefa excluída com sucesso"
          : "Você saiu da tarefa compartilhada",
    });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao excluir tarefa" },
      { status: 500 },
    );
  }
}
