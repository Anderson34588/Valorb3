import 'server-only';
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  // Non-fatal at build time — routes that call getStripe() will throw at runtime.
  console.warn('[stripe] STRIPE_SECRET_KEY not set — payments are disabled');
}

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured. Add it to your environment variables.');
  }
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-02-25.clover',
      maxNetworkRetries: 2,
      timeout: 20000,
    });
  }
  return _stripe;
}

// ── Plan config ────────────────────────────────────────────────
export const PLAN_PRO = {
  name: 'ValorB3 Pro',
  priceMonthly: 4990,          // centavos = R$ 49,90
  currency: 'brl',
  // Set STRIPE_PRICE_ID_PRO_MONTHLY in env after creating the price in Stripe dashboard
  priceId: process.env.STRIPE_PRICE_ID_PRO_MONTHLY ?? '',
} as const;

export const ACTIVE_STATUSES = new Set(['active', 'trialing']);

export function isProStatus(status: string | null | undefined): boolean {
  return ACTIVE_STATUSES.has(status ?? '');
}
