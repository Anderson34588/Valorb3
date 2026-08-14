import { NextRequest } from 'next/server';
import { db } from '@/db';
import { screenerCache, type ScreenerRow } from '@/db/schemas/screenerCache';
import { SCREENER_TICKERS } from '@/lib/screenerTickers';
import { inArray, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// Cache TTL: 4 hours
const CACHE_TTL_MS = 4 * 60 * 60 * 1000;

// ── Fetch one ticker from our own /api/stock ──────────────────
async function fetchAndCache(ticker: string, type: string, sector?: string, baseUrl?: string): Promise<void> {
  try {
    const url = `${baseUrl ?? 'http://localhost:3000'}/api/stock?ticker=${encodeURIComponent(ticker)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return;
    const data = await res.json();
    const s = data.stock;
    if (!s) return;

    const dy = (s.dividendYield ?? s.trailingAnnualDividendYield ?? 0) * 100;

    await db
      .insert(screenerCache)
      .values({
        ticker: ticker.toUpperCase(),
        name: s.shortName ?? s.longName ?? ticker,
        sector: sector ?? null,
        type,
        price: s.regularMarketPrice ?? null,
        changePct: s.regularMarketChangePercent ?? null,
        marketCap: s.marketCap ?? null,
        pl: s.priceEarnings ?? null,
        pvp: s.priceToBook ?? null,
        psr: s.psr ?? null,
        evEbitda: s.enterpriseToEbitda ?? null,
        evEbit: s.evToEbit ?? null,
        dy: dy > 0 ? dy : null,
        roe: s.returnOnEquity != null ? s.returnOnEquity * 100 : null,
        roa: s.returnOnAssets != null ? s.returnOnAssets * 100 : null,
        roic: s.roic != null ? s.roic * 100 : null,
        netMargin: s.profitMargins != null ? s.profitMargins * 100 : null,
        ebitMargin: s.ebitMargin != null ? s.ebitMargin * 100 : null,
        grossMargin: s.grossMargins != null ? s.grossMargins * 100 : null,
        debtEquity: s.debtToEquity ?? null,
        currentRatio: s.currentRatio ?? null,
        revenueGrowth5y: s.revenueGrowth5y != null ? s.revenueGrowth5y * 100 : null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: screenerCache.ticker,
        set: {
          name: sql`excluded.name`,
          sector: sql`excluded.sector`,
          type: sql`excluded.type`,
          price: sql`excluded.price`,
          changePct: sql`excluded.change_pct`,
          marketCap: sql`excluded.market_cap`,
          pl: sql`excluded.pl`,
          pvp: sql`excluded.pvp`,
          psr: sql`excluded.psr`,
          evEbitda: sql`excluded.ev_ebitda`,
          evEbit: sql`excluded.ev_ebit`,
          dy: sql`excluded.dy`,
          roe: sql`excluded.roe`,
          roa: sql`excluded.roa`,
          roic: sql`excluded.roic`,
          netMargin: sql`excluded.net_margin`,
          ebitMargin: sql`excluded.ebit_margin`,
          grossMargin: sql`excluded.gross_margin`,
          debtEquity: sql`excluded.debt_equity`,
          currentRatio: sql`excluded.current_ratio`,
          revenueGrowth5y: sql`excluded.revenue_growth_5y`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
  } catch {
    // silently skip failed tickers
  }
}

// ── Filter helper ─────────────────────────────────────────────
function applyFilters(rows: ScreenerRow[], params: URLSearchParams): ScreenerRow[] {
  const num = (key: string) => {
    const v = params.get(key);
    return v !== null && v !== '' ? parseFloat(v) : null;
  };

  const plMax = num('pl_max');
  const plMin = num('pl_min');
  const pvpMax = num('pvp_max');
  const pvpMin = num('pvp_min');
  const dyMin = num('dy_min');
  const roeMin = num('roe_min');
  const roicMin = num('roic_min');
  const evEbitdaMax = num('ev_ebitda_max');
  const netMarginMin = num('net_margin_min');
  const debtEquityMax = num('debt_equity_max');
  const typeFilter = params.get('type') ?? '';
  const sectorFilter = params.get('sector') ?? '';
  const searchFilter = (params.get('q') ?? '').toUpperCase().trim();

  return rows.filter((r) => {
    if (typeFilter && r.type !== typeFilter) return false;
    if (sectorFilter && r.sector !== sectorFilter) return false;
    if (searchFilter && !r.ticker.includes(searchFilter) && !r.name?.toUpperCase().includes(searchFilter)) return false;
    if (plMin !== null && (r.pl == null || r.pl < plMin)) return false;
    if (plMax !== null && (r.pl == null || r.pl > plMax)) return false;
    if (pvpMin !== null && (r.pvp == null || r.pvp < pvpMin)) return false;
    if (pvpMax !== null && (r.pvp == null || r.pvp > pvpMax)) return false;
    if (dyMin !== null && (r.dy == null || r.dy < dyMin)) return false;
    if (roeMin !== null && (r.roe == null || r.roe < roeMin)) return false;
    if (roicMin !== null && (r.roic == null || r.roic < roicMin)) return false;
    if (evEbitdaMax !== null && (r.evEbitda == null || r.evEbitda > evEbitdaMax)) return false;
    if (netMarginMin !== null && (r.netMargin == null || r.netMargin < netMarginMin)) return false;
    if (debtEquityMax !== null && (r.debtEquity == null || r.debtEquity > debtEquityMax)) return false;
    return true;
  });
}

// ── Main handler ──────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  // 1. Load all rows from cache
  const cached = await db.select().from(screenerCache);

  // 2. Detect stale / missing tickers
  const now = Date.now();
  const cachedMap = new Map(cached.map((r) => [r.ticker, r]));
  const stale = SCREENER_TICKERS.filter((t) => {
    const row = cachedMap.get(t.ticker);
    if (!row) return true;
    return now - new Date(row.updatedAt).getTime() > CACHE_TTL_MS;
  });

  // 3. Refresh stale tickers in background (fire-and-forget, max 8 parallel)
  if (stale.length > 0) {
    const baseUrl = req.nextUrl.origin;
    const chunks: typeof stale[] = [];
    for (let i = 0; i < stale.length; i += 8) chunks.push(stale.slice(i, i + 8));

    // Fire off first chunk; don't await (background)
    void (async () => {
      for (const chunk of chunks) {
        await Promise.allSettled(
          chunk.map((t) => fetchAndCache(t.ticker, t.type, t.sector, baseUrl))
        );
      }
    })();
  }

  // 4. If cache completely empty, wait for first batch
  let rows: ScreenerRow[];
  if (cached.length === 0 && stale.length > 0) {
    const baseUrl = req.nextUrl.origin;
    const firstBatch = stale.slice(0, 16);
    await Promise.allSettled(
      firstBatch.map((t) => fetchAndCache(t.ticker, t.type, t.sector, baseUrl))
    );
    rows = await db.select().from(screenerCache);
  } else {
    rows = cached;
  }

  // 5. Apply filters
  const filtered = applyFilters(rows, searchParams);

  // 6. Sort
  const sortBy = searchParams.get('sort') ?? 'dy';
  const sortDir = searchParams.get('dir') ?? 'desc';
  filtered.sort((a, b) => {
    const av = (a as Record<string, unknown>)[sortBy] as number | null;
    const bv = (b as Record<string, unknown>)[sortBy] as number | null;
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return sortDir === 'asc' ? av - bv : bv - av;
  });

  // 7. Distinct sectors for filter UI
  const sectors = [...new Set(rows.map((r) => r.sector).filter(Boolean))].sort();

  return Response.json({
    rows: filtered,
    total: filtered.length,
    sectors,
    staleCount: stale.length,
    cachedCount: cached.length,
  });
}
