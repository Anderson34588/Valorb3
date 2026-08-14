import { pgTable, text, timestamp, serial, uniqueIndex } from 'drizzle-orm/pg-core';

export const watchlist = pgTable(
  'watchlist',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(),
    ticker: text('ticker').notNull(),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('watchlist_user_ticker_idx').on(t.userId, t.ticker)]
);

export type WatchlistItem = typeof watchlist.$inferSelect;
export type WatchlistInsert = typeof watchlist.$inferInsert;
