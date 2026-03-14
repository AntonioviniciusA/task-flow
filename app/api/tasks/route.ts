import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { scheduleTask, cancelTask } from "@/lib/scheduler";
import type { ApiResponse, Task, CreateTaskInput } from "@/lib/types";

// GET /api/tasks - List all tasks for the current user
export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<Task[]>>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Não autenticado" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let sql = "SELECT * FROM tasks WHERE user_id = ?";
    const args: (string | number)[] = [session.user.id];

    if (status) {
      sql += " AND status = ?";
      args.push(status);
    }

    if (priority) {
      sql += " AND priority = ?";
      args.push(priority);
    }

    sql +=
      " ORDER BY COALESCE(due_date, '9999-99-99') ASC, created_at DESC LIMIT ? OFFSET ?";
    args.push(limit, offset);

    const result = await db.execute({ sql, args });

    const tasks = result.rows.map((row) => ({
      ...row,
      notification_enabled: Boolean(row.notification_enabled),
    })) as unknown as Task[];

    return NextResponse.json({ success: true, data: tasks });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao buscar tarefas" },
      { status: 500 },
    );
  }
}

// POST /api/tasks - Create a new task
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<Task>>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Não autenticado" },
        { status: 401 },
      );
    }

    const body: CreateTaskInput = await request.json();

    if (!body.title?.trim()) {
      return NextResponse.json(
        { success: false, error: "Título é obrigatório" },
        { status: 400 },
      );
    }

    const id = nanoid();
    const now = new Date().toISOString();

    // 1. Inserir tarefa no banco
    await db.execute({
      sql: `INSERT INTO tasks (
        id, user_id, title, description, due_date,
        frequency, frequency_day_of_week, frequency_day_of_month, notification_time,
        priority, status, notification_enabled, executed, scheduled_time,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?)`,
      args: [
        id,
        session.user.id,
        body.title.trim(),
        body.description || null,
        body.due_date || null,
        body.frequency || "once",
        body.frequency_day_of_week ?? null,
        body.frequency_day_of_month ?? null,
        body.notification_time || null,
        body.priority || "medium",
        "pending",
        body.notification_enabled !== false ? 1 : 0,
        now,
        now,
      ],
    });

    // 2. Agendar notificação se habilitada
    let finalScheduledTime: string | null = null;
    if (body.notification_enabled !== false) {
      if (body.scheduled_time_iso) {
        // Usa o ISO enviado pelo cliente (que já está no UTC correto)
        const scheduledDate = new Date(body.scheduled_time_iso);
        if (!isNaN(scheduledDate.getTime())) {
          await scheduleTask(id, scheduledDate);
          finalScheduledTime = scheduledDate.toISOString();
        }
      } else if (body.notification_time && body.due_date) {
        // Fallback para o cálculo do servidor (pode ter problemas de fuso se o servidor for UTC)
        const scheduledDate = new Date(
          `${body.due_date}T${body.notification_time}`,
        );

        if (scheduledDate && !isNaN(scheduledDate.getTime())) {
          await scheduleTask(id, scheduledDate);
          finalScheduledTime = scheduledDate.toISOString();
        }
      }
    }

    // Handle categories
    if (body.category_ids?.length) {
      for (const categoryId of body.category_ids) {
        await db.execute({
          sql: "INSERT INTO task_categories (task_id, category_id) VALUES (?, ?)",
          args: [id, categoryId],
        });
      }
    }

    const task: Task = {
      id,
      user_id: session.user.id,
      title: body.title.trim(),
      description: body.description || null,
      due_date: body.due_date || null,
      frequency: body.frequency || "once",
      frequency_day_of_week: body.frequency_day_of_week ?? null,
      frequency_day_of_month: body.frequency_day_of_month ?? null,
      notification_time: body.notification_time || null,
      priority: body.priority || "medium",
      status: "pending",
      notification_enabled: body.notification_enabled !== false,
      executed: false,
      scheduled_time: finalScheduledTime,
      created_at: now,
      updated_at: now,
      completed_at: null,
    };

    return NextResponse.json(
      { success: true, data: task, message: "Tarefa criada com sucesso" },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao criar tarefa" },
      { status: 500 },
    );
  }
}
