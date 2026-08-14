import { NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { createBillingPortalSession } from '@/lib/subscriptionService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: 'unauthenticated' }, { status: 401 });

  if (!process.env.STRIPE_SECRET_KEY) {
    return Response.json({ error: 'payments_not_configured' }, { status: 503 });
  }

  try {
    const origin = req.nextUrl.origin;
    const url = await createBillingPortalSession(user, origin);
    return Response.json({ url });
  } catch (err) {
    console.error('[billing-portal]', err);
    return Response.json({ error: 'portal_failed' }, { status: 500 });
  }
}
