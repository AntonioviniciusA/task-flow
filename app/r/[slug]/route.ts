import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    // Buscar o QR code pelo slug
    const qrResult = await db.execute({
      sql: "SELECT id, target_url FROM dynamic_qrs WHERE slug = ?",
      args: [slug]
    });

    if (qrResult.rows.length === 0) {
      // Se não encontrar, redireciona para a home ou uma 404
      return NextResponse.redirect(new URL("/", request.url));
    }

    const qr = qrResult.rows[0];
    const qrId = qr.id as string;
    const targetUrl = qr.target_url as string;

    // Registrar o acesso (tracking)
    const userAgent = request.headers.get("user-agent") || "unknown";
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

    // Executar em background (não aguardar para não atrasar o redirect)
    db.execute({
      sql: "INSERT INTO qr_access_logs (id, qr_id, user_agent, ip_address) VALUES (?, ?, ?, ?)",
      args: [uuidv4(), qrId, userAgent, ipAddress]
    }).catch(err => console.error("Erro ao registrar log de acesso QR:", err));

    // Redirecionar para o destino
    // Se o target_url for relativo (começa com /), constrói a URL completa
    const finalUrl = targetUrl.startsWith("http") 
      ? targetUrl 
      : new URL(targetUrl, request.url).toString();

    return NextResponse.redirect(finalUrl);
  } catch (error) {
    console.error("Erro na rota de redirect QR:", error);
    return NextResponse.redirect(new URL("/", request.url));
  }
}
