import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || "global"; // 'global' ou 'friends'

    let sql = "";
    let args: any[] = [];

    if (mode === "friends") {
      // Ranking entre amigos
      sql = `
        SELECT 
          u.id, 
          CASE 
            WHEN INSTR(u.name, ' ') > 0 THEN SUBSTR(u.name, 1, INSTR(u.name, ' ') - 1) 
            ELSE u.name 
          END as name, 
          u.points, 
          u.level
        FROM users u
        WHERE u.id = ? 
        OR u.id IN (
          SELECT user_id1 FROM friendships WHERE user_id2 = ? AND status = 'accepted'
          UNION
          SELECT user_id2 FROM friendships WHERE user_id1 = ? AND status = 'accepted'
        )
        ORDER BY u.points DESC
        LIMIT 10
      `;
      args = [session.user.id, session.user.id, session.user.id];
    } else {
      // Ranking global
      sql = `
        SELECT 
          id, 
          CASE 
            WHEN INSTR(name, ' ') > 0 THEN SUBSTR(name, 1, INSTR(name, ' ') - 1) 
            ELSE name 
          END as name, 
          points, 
          level
        FROM users
        ORDER BY points DESC
        LIMIT 10
      `;
    }

    const result = await db.execute({ sql, args });

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Ranking error:", error);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
