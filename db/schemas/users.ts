import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Local user record — created on first login via HappySeeds OAuth.
 * openid is the authoritative identity key (from HappySeedsUser.openid).
 */
export const users = pgTable('users', {
  id:          text('id').primaryKey(),             // = openid
  email:       text('email'),
  displayName: text('display_name'),
  avatarUrl:   text('avatar_url'),
  // Stripe
  stripeCustomerId: text('stripe_customer_id'),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;
