import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// GET /api/settings/notifications - Get user notification settings
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await db.execute({
      sql: "SELECT persistent_interval, notification_sound, notification_vibration FROM users WHERE id = ?",
      args: [session.user.id],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = result.rows[0];
    return NextResponse.json({
      success: true,
      data: {
        persistent_interval: Number(user.persistent_interval),
        notification_sound: Boolean(user.notification_sound),
        notification_vibration: Boolean(user.notification_vibration),
      },
    });
  } catch (error) {
    console.error("[API Settings] Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// PATCH /api/settings/notifications - Update user notification settings
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { persistent_interval, notification_sound, notification_vibration } =
      body;

    const updates: string[] = ["updated_at = ?"];
    const args: any[] = [new Date().toISOString()];

    if (persistent_interval !== undefined) {
      updates.push("persistent_interval = ?");
      args.push(Number(persistent_interval));
    }

    if (notification_sound !== undefined) {
      updates.push("notification_sound = ?");
      args.push(notification_sound ? 1 : 0);
    }

    if (notification_vibration !== undefined) {
      updates.push("notification_vibration = ?");
      args.push(notification_vibration ? 1 : 0);
    }

    args.push(session.user.id);

    await db.execute({
      sql: `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
      args,
    });

    return NextResponse.json({
      success: true,
      message: "Configurações atualizadas com sucesso",
    });
  } catch (error) {
    console.error("[API Settings] Error updating notifications:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
