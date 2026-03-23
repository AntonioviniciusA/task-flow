import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

// GET /api/qr - Listar todos os QR codes e seus acessos (apenas admin ou dono)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    // Por enquanto, qualquer usuário logado pode ver (você pode restringir depois)
    const result = await db.execute(`
      SELECT 
        q.*,
        (SELECT COUNT(*) FROM qr_access_logs WHERE qr_id = q.id) as access_count
      FROM dynamic_qrs q
      ORDER BY created_at DESC
    `);

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Error fetching QRs:", error);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}

// POST /api/qr - Criar um novo QR code dinâmico
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    const { slug, target_url, description } = await request.json();

    if (!slug || !target_url) {
      return NextResponse.json({ success: false, error: "Slug e URL de destino são obrigatórios" }, { status: 400 });
    }

    const id = uuidv4();
    
    await db.execute({
      sql: "INSERT INTO dynamic_qrs (id, slug, target_url, description) VALUES (?, ?, ?, ?)",
      args: [id, slug.toLowerCase().trim(), target_url, description || ""]
    });

    return NextResponse.json({ 
      success: true, 
      data: { id, slug, target_url, description } 
    });
  } catch (error: any) {
    if (error.message.includes("UNIQUE constraint failed")) {
      return NextResponse.json({ success: false, error: "Este slug já está em uso" }, { status: 400 });
    }
    console.error("Error creating QR:", error);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
