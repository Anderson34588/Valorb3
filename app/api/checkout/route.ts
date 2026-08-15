import { NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { createCheckoutSession } from '@/lib/subscriptionService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: 'unauthenticated' }, { status: 401 });

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID_PRO_MONTHLY) {
    return Response.json({ error: 'payments_not_configured' }, { status: 503 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const period = body?.period === 'yearly' ? 'yearly' : 'monthly';
    const origin = req.nextUrl.origin;
    const url = await createCheckoutSession(user, origin, period);
    return Response.json({ url });
  } catch (err) {
    console.error('[checkout]', err);
    return Response.json({ error: 'checkout_failed' }, { status: 500 });
  }
}
