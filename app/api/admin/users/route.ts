import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schemas/users';
import { subscriptions } from '@/db/schemas/subscriptions';
import { getSessionUser } from '@/lib/session';
import { eq } from 'drizzle-orm';

// Emails autorizados a acessar o painel de admin
// Adicione o seu email do Google aqui ou em ADMIN_EMAILS no .env
function isAdmin(email: string | null | undefined): boolean {
  // Aceita tanto ADMIN_EMAILS quanto E-MAILS_DO_ADMINISTRADOR (nome traduzido pela Vercel)
  const raw = process.env.ADMIN_EMAILS ?? process.env['E-MAILS_DO_ADMINISTRADOR'] ?? '';
  const list = raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  return list.includes((email ?? '').toLowerCase());
}

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  if (!isAdmin(session.email)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  // Busca todos os usuários com LEFT JOIN na tabela de assinaturas
  const allUsers = await db.select().from(users).orderBy(users.createdAt);

  const allSubs = await db.select().from(subscriptions);
  const subMap = new Map(allSubs.map((s) => [s.userId, s]));

  const result = allUsers.map((u) => {
    const sub = subMap.get(u.id);
    return {
      id: u.id,
      email: u.email ?? '—',
      nome: u.displayName ?? '—',
      stripeCustomerId: u.stripeCustomerId ?? '—',
      criadoEm: u.createdAt?.toISOString() ?? '—',
      // Assinatura
      plano: sub ? 'Pro' : 'Gratuito',
      statusAssinatura: sub?.status ?? '—',
      stripeSubscriptionId: sub?.id ?? '—',
      periodoInicio: sub?.currentPeriodStart?.toISOString() ?? '—',
      periodoFim: sub?.currentPeriodEnd?.toISOString() ?? '—',
      cancelaAoFinal: sub?.cancelAtPeriodEnd === 'true' ? 'Sim' : sub ? 'Não' : '—',
    };
  });

  return NextResponse.json({ users: result, total: result.length });
}
