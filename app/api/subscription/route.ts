import { getSessionUser } from '@/lib/session';
import { getUserSubscription } from '@/lib/subscriptionService';
import { isProStatus } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ pro: false, subscription: null });

  const sub = await getUserSubscription(user.openid);
  return Response.json({
    pro: isProStatus(sub?.status),
    subscription: sub
      ? {
          status: sub.status,
          currentPeriodEnd: sub.currentPeriodEnd,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd === 'true',
        }
      : null,
  });
}
