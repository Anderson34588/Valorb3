import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';

/**
 * Stripe subscription record — one per user.
 * Updated by the webhook handler.
 */
export const subscriptions = pgTable(
  'subscriptions',
  {
    id:                   text('id').primaryKey(),        // stripe subscription id
    userId:               text('user_id').notNull(),      // users.id (openid)
    stripeCustomerId:     text('stripe_customer_id').notNull(),
    stripePriceId:        text('stripe_price_id').notNull(),
    status:               text('status').notNull(),       // active | past_due | canceled | trialing…
    currentPeriodStart:   timestamp('current_period_start', { withTimezone: true }),
    currentPeriodEnd:     timestamp('current_period_end',   { withTimezone: true }),
    cancelAtPeriodEnd:    text('cancel_at_period_end').notNull().default('false'),
    createdAt:            timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt:            timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('subscriptions_user_idx').on(t.userId)]
);

export type Subscription = typeof subscriptions.$inferSelect;
export type SubscriptionInsert = typeof subscriptions.$inferInsert;
