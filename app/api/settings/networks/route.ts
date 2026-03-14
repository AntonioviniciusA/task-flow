import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await db.execute({
      sql: 'SELECT * FROM network_contexts WHERE user_id = ? ORDER BY name ASC',
      args: [session.user.id],
    });

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[API Networks] Erro ao buscar redes:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, ip_range, context_slug } = await request.json();
    
    if (!name || !ip_range || !context_slug) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    const id = nanoid();
    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO network_contexts (id, user_id, name, ip_range, context_slug, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, session.user.id, name, ip_range, context_slug, now, now],
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('[API Networks] Erro ao criar rede:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
    }

    await db.execute({
      sql: 'DELETE FROM network_contexts WHERE id = ? AND user_id = ?',
      args: [id, session.user.id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Networks] Erro ao deletar rede:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
