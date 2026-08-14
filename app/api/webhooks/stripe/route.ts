import { NextRequest } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { db } from '@/db';
import { subscriptions } from '@/db/schemas/subscriptions';
import { users } from '@/db/schemas/users';
import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';

export const dynamic = 'force-dynamic';

// Next.js needs raw body for Stripe signature verification
export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new Response('Webhook not configured', { status: 503 });
  }

  const body = await req.text();
  const sig = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[webhook] signature verification failed:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  console.log(`[webhook] ${event.type} id=${event.id}`);

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (!userId) {
          // Try to find user by stripe customer id
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.stripeCustomerId, sub.customer as string))
            .limit(1);
          if (!user) { console.warn('[webhook] no user for customer', sub.customer); break; }
          await upsertSubscription(sub, user.id);
        } else {
          await upsertSubscription(sub, userId);
        }
        break;
      }
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        if (userId && session.customer) {
          await db
            .update(users)
            .set({ stripeCustomerId: session.customer as string, updatedAt: new Date() })
            .where(eq(users.id, userId));
        }
        break;
      }
    }
  } catch (err) {
    console.error('[webhook] handler error:', err);
    return new Response('Handler error', { status: 500 });
  }

  return new Response('ok', { status: 200 });
}

async function upsertSubscription(sub: Stripe.Subscription, userId: string) {
  const item = sub.items.data[0];
  // In Stripe API 2026+, current_period_start/end live on the subscription item
  const periodStart = item?.current_period_start ?? null;
  const periodEnd = item?.current_period_end ?? null;

  await db
    .insert(subscriptions)
    .values({
      id: sub.id,
      userId,
      stripeCustomerId: sub.customer as string,
      stripePriceId: item?.price?.id ?? '',
      status: sub.status,
      currentPeriodStart: periodStart ? new Date(periodStart * 1000) : null,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      cancelAtPeriodEnd: String(sub.cancel_at_period_end),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: subscriptions.id,
      set: {
        status: sub.status,
        currentPeriodStart: periodStart ? new Date(periodStart * 1000) : null,
        currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
        cancelAtPeriodEnd: String(sub.cancel_at_period_end),
        updatedAt: new Date(),
      },
    });
  console.log(`[webhook] subscription ${sub.id} upserted — user=${userId} status=${sub.status}`);
}
