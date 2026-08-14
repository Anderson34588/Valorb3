import {
  pgTable,
  text,
  timestamp,
  real,
  index,
} from 'drizzle-orm/pg-core';

export const screenerCache = pgTable(
  'screener_cache',
  {
    ticker:       text('ticker').primaryKey(),
    name:         text('name'),
    sector:       text('sector'),
    // Preço
    price:        real('price'),
    changePct:    real('change_pct'),
    marketCap:    real('market_cap'),
    // Valuation
    pl:           real('pl'),           // P/L
    pvp:          real('pvp'),          // P/VP
    psr:          real('psr'),          // P/Receita
    evEbitda:     real('ev_ebitda'),    // EV/EBITDA
    evEbit:       real('ev_ebit'),      // EV/EBIT
    // Rentabilidade
    dy:           real('dy'),           // Dividend Yield %
    roe:          real('roe'),          // ROE %
    roa:          real('roa'),          // ROA %
    roic:         real('roic'),         // ROIC %
    // Margens
    netMargin:    real('net_margin'),   // Margem Líquida %
    ebitMargin:   real('ebit_margin'),  // Margem EBIT %
    grossMargin:  real('gross_margin'), // Margem Bruta %
    // Endividamento
    debtEquity:   real('debt_equity'),  // Dívida/PL
    currentRatio: real('current_ratio'),
    // Crescimento
    revenueGrowth5y: real('revenue_growth_5y'),
    // Tipo
    type:         text('type'),         // 'stock' | 'fii' | 'etf' | 'bdr'
    updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('screener_pl_idx').on(t.pl),
    index('screener_dy_idx').on(t.dy),
    index('screener_roe_idx').on(t.roe),
  ]
);

export type ScreenerRow = typeof screenerCache.$inferSelect;
