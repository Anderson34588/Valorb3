import { NextRequest } from 'next/server';
import { db } from '@/db';
import { watchlist } from '@/db/schemas/watchlist';
import { eq, and } from 'drizzle-orm';
import { getSessionUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

// GET /api/watchlist — list current user's watchlist
export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: 'unauthenticated' }, { status: 401 });

  const items = await db
    .select()
    .from(watchlist)
    .where(eq(watchlist.userId, user.openid))
    .orderBy(watchlist.addedAt);

  return Response.json({ items });
}

// POST /api/watchlist — add ticker
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: 'unauthenticated' }, { status: 401 });

  const body = await req.json();
  const ticker = (body?.ticker as string)?.toUpperCase().trim();
  if (!ticker) return Response.json({ error: 'ticker required' }, { status: 400 });

  try {
    const [item] = await db
      .insert(watchlist)
      .values({ userId: user.openid, ticker })
      .onConflictDoNothing()
      .returning();

    return Response.json({ item: item ?? null, alreadyExists: !item });
  } catch {
    return Response.json({ error: 'db_error' }, { status: 500 });
  }
}

// DELETE /api/watchlist?ticker=PETR4 — remove ticker
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: 'unauthenticated' }, { status: 401 });

  const ticker = req.nextUrl.searchParams.get('ticker')?.toUpperCase().trim();
  if (!ticker) return Response.json({ error: 'ticker required' }, { status: 400 });

  await db
    .delete(watchlist)
    .where(and(eq(watchlist.userId, user.openid), eq(watchlist.ticker, ticker)));

  return Response.json({ ok: true });
}
