import 'server-only';
import { db } from '@/db';
import { users } from '@/db/schemas/users';
import { subscriptions } from '@/db/schemas/subscriptions';
import { getStripe, PLAN_PRO, isProStatus } from '@/lib/stripe';
import { eq } from 'drizzle-orm';
import type { SessionUser } from '@/lib/session';

// ── Upsert user on first login ────────────────────────────────
export async function upsertUser(su: SessionUser): Promise<void> {
  await db
    .insert(users)
    .values({
      id: su.openid,
      email: su.email ?? null,
      displayName: su.display_name ?? null,
      avatarUrl: su.avatar_url ?? null,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email: su.email ?? null,
        displayName: su.display_name ?? null,
        avatarUrl: su.avatar_url ?? null,
        updatedAt: new Date(),
      },
    });
}

// ── Get or create Stripe customer ─────────────────────────────
export async function getOrCreateStripeCustomer(su: SessionUser): Promise<string> {
  const stripe = getStripe();
  const [user] = await db.select().from(users).where(eq(users.id, su.openid)).limit(1);

  if (user?.stripeCustomerId) return user.stripeCustomerId;

  // Create customer in Stripe
  const customer = await stripe.customers.create(
    { email: su.email ?? undefined, name: su.display_name ?? undefined, metadata: { userId: su.openid } },
    { idempotencyKey: `create-customer-${su.openid}` }
  );

  await upsertUser(su);
  await db.update(users).set({ stripeCustomerId: customer.id, updatedAt: new Date() }).where(eq(users.id, su.openid));

  return customer.id;
}

// ── Create checkout session ───────────────────────────────────
export async function createCheckoutSession(su: SessionUser, returnUrl: string): Promise<string> {
  const stripe = getStripe();
  const customerId = await getOrCreateStripeCustomer(su);

  const session = await stripe.checkout.sessions.create(
    {
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: PLAN_PRO.priceId, quantity: 1 }],
      success_url: `${returnUrl}/planos?status=sucesso`,
      cancel_url: `${returnUrl}/planos?status=cancelado`,
      payment_method_types: ['card', 'boleto', 'pix'],
      subscription_data: { metadata: { userId: su.openid } },
      metadata: { userId: su.openid },
      locale: 'pt-BR',
    },
    { idempotencyKey: `checkout-${su.openid}-${Date.now()}` }
  );

  if (!session.url) throw new Error('Checkout session URL not returned by Stripe');
  return session.url;
}

// ── Create billing portal session ────────────────────────────
export async function createBillingPortalSession(su: SessionUser, returnUrl: string): Promise<string> {
  const stripe = getStripe();
  const customerId = await getOrCreateStripeCustomer(su);

  const session = await stripe.billingPortal.sessions.create(
    { customer: customerId, return_url: `${returnUrl}/planos` },
    { idempotencyKey: `portal-${su.openid}-${Date.now()}` }
  );

  return session.url;
}

// ── Get subscription status for a user ───────────────────────
export async function getUserSubscription(userId: string) {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  return sub ?? null;
}

export async function isPro(userId: string): Promise<boolean> {
  const sub = await getUserSubscription(userId);
  return isProStatus(sub?.status);
}
