import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getClientIp, isIpInRange } from '@/lib/network';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userIp = getClientIp(request);
  
  try {
    // 1. Buscar todas as redes conhecidas do usuário
    const result = await db.execute({
      sql: 'SELECT * FROM network_contexts WHERE user_id = ?',
      args: [session.user.id],
    });

    const networks = result.rows;
    let detectedContext = 'unknown';

    // 2. Verificar se o IP atual pertence a algum range cadastrado
    for (const network of networks) {
      if (isIpInRange(userIp, network.ip_range as string)) {
        detectedContext = network.context_slug as string;
        break;
      }
    }

    return NextResponse.json({
      context: detectedContext,
      ip: userIp, // Útil para depuração e para o usuário cadastrar sua rede atual
    });
  } catch (error) {
    console.error('[API Context] Erro ao detectar contexto:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
