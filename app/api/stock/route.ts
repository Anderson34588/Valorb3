import { NextRequest, NextResponse } from 'next/server';
import https from 'https';
import type { StockData } from '@/lib/valuation';
import { fetchFundamentus } from '@/lib/fundamentus';

// Node.js runtime — uses native https module
export const runtime = 'nodejs';

// ────────────────────────────────────────────────────────────────────────────
// Data strategy (runs in parallel):
//  1. Yahoo Finance v8/chart  — real-time price + history + dividends
//     Uses Googlebot UA to avoid 429 rate-limiting on sandbox IPs
//     Covers ALL .SA tickers: ações, BDRs, FIIs, ETFs
//  2. Fundamentus.com.br      — fundamentals for ações & FIIs (not BDRs)
//  3. Brapi (bonus)           — additional price fallback for popular tickers
//
// Price priority: Yahoo (real-time) > Brapi > Fundamentus (previous close)
// Fundamentals: Fundamentus > Brapi (when available)
// BDRs: Yahoo only (Fundamentus redirects BDRs to cotacoes.php with no data)
// ────────────────────────────────────────────────────────────────────────────

const YF_HOSTS = ['query2.finance.yahoo.com', 'query1.finance.yahoo.com'];
// Googlebot UA bypasses Yahoo's IP-based rate limiting on cloud/sandbox IPs
const YF_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

// BDR tickers end in 32, 33, 34, 35, 39 (e.g. AAPL34, MSFT34, GOOGL34)
function isBDR(ticker: string): boolean {
  return /^[A-Z]{2,5}3[2-5]$|^[A-Z]{2,5}39$/.test(ticker);
}

function toSATicker(t: string): string {
  return t.endsWith('.SA') ? t : `${t}.SA`;
}

// ── Native https helper ───────────────────────────────────────────────────────

function httpsGet(
  url: string,
  options?: { ua?: string; timeoutMs?: number }
): Promise<string> {
  const { ua = YF_UA, timeoutMs = 12000 } = options ?? {};
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.get(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        headers: {
          'User-Agent': ua,
          Accept: 'application/json',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
          Connection: 'close',
        },
      },
      (res) => {
        if (res.statusCode === 429) {
          reject(new Error('429'));
          res.resume();
          return;
        }
        if ((res.statusCode ?? 0) >= 400) {
          reject(new Error(String(res.statusCode)));
          res.resume();
          return;
        }
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => (body += chunk));
        res.on('end', () => resolve(body));
        res.on('error', reject);
      }
    );
    req.setTimeout(timeoutMs, () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

// ── Yahoo Finance v8/chart types ──────────────────────────────────────────────

interface YFMeta {
  currency: string;
  symbol: string;
  longName?: string;
  shortName?: string;
  regularMarketPrice: number;
  regularMarketChange?: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketVolume: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  chartPreviousClose?: number;
  regularMarketPreviousClose?: number;
  marketCap?: number;
}

interface YFChartResponse {
  chart: {
    result?: Array<{
      meta: YFMeta;
      timestamp?: number[];
      events?: {
        dividends?: Record<string, { amount: number; date: number }>;
      };
      indicators?: {
        quote?: Array<{
          open: (number | null)[];
          high: (number | null)[];
          low: (number | null)[];
          close: (number | null)[];
          volume: (number | null)[];
        }>;
        adjclose?: Array<{ adjclose: (number | null)[] }>;
      };
    }>;
    error?: { code: string; description: string };
  };
}

async function fetchYahooChart(saTicker: string): Promise<YFChartResponse | null> {
  const path = `/v8/finance/chart/${encodeURIComponent(saTicker)}?range=1y&interval=1d&events=dividends%2Csplits&includePrePost=false`;

  for (const host of YF_HOSTS) {
    try {
      const body = await httpsGet(`https://${host}${path}`);
      return JSON.parse(body) as YFChartResponse;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === '429') continue;
      // non-429: try next host
    }
  }
  return null;
}

// ── Brapi ─────────────────────────────────────────────────────────────────────

async function fetchBrapi(ticker: string): Promise<StockData | null> {
  try {
    const url = `https://brapi.dev/api/quote/${encodeURIComponent(ticker)}?range=1d&interval=1d&fundamental=true&dividends=true`;
    const body = await httpsGet(url, {
      ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
      timeoutMs: 10000,
    });
    const data = JSON.parse(body) as {
      results?: StockData[];
      error?: boolean;
      message?: string;
    };
    if (data.error || !data.results?.length) return null;
    const r = data.results[0];
    if (!r.regularMarketPrice) return null;
    return r;
  } catch {
    return null;
  }
}

// ── Build StockData from Yahoo chart response ─────────────────────────────────

function buildBaseFromYahoo(rawTicker: string, chart: YFChartResponse): StockData | null {
  const cr = chart.chart.result?.[0];
  if (!cr) return null;
  const meta = cr.meta;

  const price = meta.regularMarketPrice ?? 0;
  if (price === 0) return null;

  const ts = cr.timestamp ?? [];
  const q = cr.indicators?.quote?.[0];
  const adj = cr.indicators?.adjclose?.[0]?.adjclose ?? [];

  const historicalDataPrice = ts
    .map((t, i) => ({
      date: t,
      open: q?.open?.[i] ?? 0,
      high: q?.high?.[i] ?? 0,
      low: q?.low?.[i] ?? 0,
      close: q?.close?.[i] ?? 0,
      volume: q?.volume?.[i] ?? 0,
      adjustedClose: adj[i] ?? q?.close?.[i] ?? 0,
    }))
    .filter((d) => d.close > 0);

  // Derive previous close from last 2 valid data points
  // (meta.chartPreviousClose in 1y range = price from 1 year ago, not yesterday)
  let prevClose: number;
  if (historicalDataPrice.length >= 2) {
    prevClose = historicalDataPrice[historicalDataPrice.length - 2].close;
  } else if (meta.regularMarketPreviousClose) {
    prevClose = meta.regularMarketPreviousClose;
  } else {
    prevClose = price;
  }

  const change = price - prevClose;
  const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;

  // Trailing 12m DY from Yahoo dividend events
  const divEvents = cr.events?.dividends ?? {};
  const cutoff12m = Date.now() / 1000 - 365 * 24 * 3600;
  const annualDivSum = Object.values(divEvents)
    .filter((d) => d.date >= cutoff12m)
    .reduce((sum, d) => sum + d.amount, 0);
  const computedDy = price > 0 && annualDivSum > 0 ? annualDivSum / price : undefined;

  const dividendsData: StockData['dividendsData'] = {
    cashDividends: Object.values(divEvents)
      .sort((a, b) => b.date - a.date)
      .slice(0, 12)
      .map((d) => ({
        assetIssued: rawTicker,
        paymentDate: new Date(d.date * 1000).toISOString(),
        rate: d.amount,
        relatedTo: 'Dividendo',
        approvedOn: '',
        isinCode: '',
        label: 'Dividendo',
        lastDatePrior: new Date(d.date * 1000).toISOString(),
      })),
  };

  return {
    symbol: rawTicker,
    shortName: meta.shortName ?? rawTicker,
    longName: meta.longName,
    currency: meta.currency ?? 'BRL',
    regularMarketPrice: price,
    regularMarketChange: change,
    regularMarketChangePercent: changePct,
    regularMarketVolume: meta.regularMarketVolume ?? 0,
    regularMarketDayHigh: meta.regularMarketDayHigh ?? 0,
    regularMarketDayLow: meta.regularMarketDayLow ?? 0,
    regularMarketPreviousClose: prevClose,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? 0,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? 0,
    marketCap: meta.marketCap ?? 0,
    dividendYield: computedDy,
    trailingAnnualDividendYield: computedDy,
    historicalDataPrice,
    dividendsData,
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawTicker = (searchParams.get('ticker') ?? '').toUpperCase().trim();

  if (!rawTicker) {
    return NextResponse.json({ error: 'Ticker é obrigatório' }, { status: 400 });
  }

  const saTicker = toSATicker(rawTicker);
  const bdr = isBDR(rawTicker);

  // ── Run all sources in parallel ────────────────────────────────────────────
  // BDRs: skip Fundamentus (it redirects them to an empty page)
  const [chartResult, fundamentusResult, brapiResult] = await Promise.allSettled([
    fetchYahooChart(saTicker),
    bdr ? Promise.resolve(null) : fetchFundamentus(rawTicker),
    bdr ? Promise.resolve(null) : fetchBrapi(rawTicker),
  ]);

  const yahoo = chartResult.status === 'fulfilled' ? chartResult.value : null;
  const fund = fundamentusResult.status === 'fulfilled' ? fundamentusResult.value : null;
  const brapi = brapiResult.status === 'fulfilled' ? brapiResult.value : null;

  // ── Validate ticker exists ─────────────────────────────────────────────────
  const yahooError = yahoo?.chart?.error;
  const yahooHasPrice = (yahoo?.chart?.result?.[0]?.meta?.regularMarketPrice ?? 0) > 0;
  const fundHasData = !!(fund?.cotacao);
  const brapiHasData = !!(brapi?.regularMarketPrice);

  if (yahooError || (!yahooHasPrice && !fundHasData && !brapiHasData)) {
    const hint = bdr
      ? 'BDRs usam o sufixo sem .SA (ex: AAPL34, MSFT34, GOOGL34, TSLA34).'
      : 'Verifique o código (ex: PETR4, VALE3, WEGE3, MXRF11).';
    return NextResponse.json(
      { error: `Ticker "${rawTicker}" não encontrado. ${hint}` },
      { status: 404 }
    );
  }

  // ── Build base stock object from best price source ─────────────────────────
  // Priority: Yahoo (real-time) > Brapi > Fundamentus (previous close)
  let stock: StockData | null = null;
  let priceSource = 'unknown';

  if (yahooHasPrice && yahoo) {
    stock = buildBaseFromYahoo(rawTicker, yahoo);
    priceSource = 'yahoo';
  }

  // Merge Brapi on top if available (it has better structured dividend data)
  if (brapiHasData && brapi) {
    if (!stock) {
      stock = brapi;
      priceSource = 'brapi';
    } else {
      // Keep Yahoo real-time price but use Brapi dividendsData if richer
      if ((brapi.dividendsData?.cashDividends?.length ?? 0) >
          (stock.dividendsData?.cashDividends?.length ?? 0)) {
        stock.dividendsData = brapi.dividendsData;
      }
    }
  }

  // Last resort: Fundamentus price (previous close)
  if (!stock && fund?.cotacao) {
    stock = {
      symbol: rawTicker,
      shortName: fund.nome || rawTicker,
      longName: fund.nome,
      currency: 'BRL',
      regularMarketPrice: fund.cotacao,
      regularMarketChange: 0,
      regularMarketChangePercent: 0,
      regularMarketVolume: 0,
      regularMarketDayHigh: fund.cotacao,
      regularMarketDayLow: fund.cotacao,
      regularMarketPreviousClose: fund.cotacao,
      fiftyTwoWeekHigh: fund.max52sem ?? 0,
      fiftyTwoWeekLow: fund.min52sem ?? 0,
      marketCap: fund.valorMercado ?? 0,
    };
    priceSource = 'fundamentus';
  }

  if (!stock) {
    return NextResponse.json(
      { error: `Não foi possível carregar dados para "${rawTicker}".` },
      { status: 404 }
    );
  }

  // ── Merge Fundamentus fundamentals ─────────────────────────────────────────
  let fundSource = 'none';

  if (fund) {
    fundSource = 'fundamentus';

    stock.priceEarnings = fund.pl ?? stock.priceEarnings;
    stock.priceToBook = fund.pvp ?? stock.priceToBook;
    stock.earningsPerShare = fund.lpa ?? stock.earningsPerShare;
    stock.bookValuePerShareMRQ = fund.vpa ?? stock.bookValuePerShareMRQ;
    stock.returnOnEquity = fund.roe ?? stock.returnOnEquity;
    stock.grossMargins = fund.margBruta ?? stock.grossMargins;
    stock.profitMargins = fund.margLiquida ?? stock.profitMargins;
    stock.enterpriseToEbitda = fund.evEbitda ?? stock.enterpriseToEbitda;
    stock.enterpriseValue = fund.valorFirma ?? stock.enterpriseValue;
    stock.debtToEquity = fund.divLiqPatrim ?? stock.debtToEquity;
    stock.currentRatio = fund.liquidezCorr ?? stock.currentRatio;
    stock.totalDebt = fund.divBruta ?? stock.totalDebt;
    stock.totalCash = fund.disponibilidades ?? stock.totalCash;
    stock.ebitda = fund.ebit12m ?? stock.ebitda;
    stock.marketCap = fund.valorMercado ?? stock.marketCap ?? 0;
    stock.fiftyTwoWeekHigh = stock.fiftyTwoWeekHigh || fund.max52sem || 0;
    stock.fiftyTwoWeekLow = stock.fiftyTwoWeekLow || fund.min52sem || 0;

    // Dividend Yield — prefer Fundamentus (includes all distribution types)
    if (fund.divYield != null) {
      stock.dividendYield = fund.divYield;
      stock.trailingAnnualDividendYield = fund.divYield;
    }

    // FII-specific
    if (fund.tipo === 'fii' && fund.ffoYield) {
      stock.dividendYield = stock.dividendYield ?? fund.ffoYield;
    }

    // Extra indicators
    stock.roic = fund.roic ?? stock.roic;
    stock.ebitMargin = fund.margEbit ?? stock.ebitMargin;
    stock.revenueGrowth5y = fund.crescRec5a ?? stock.revenueGrowth5y;
    stock.evToEbit = fund.evEbit ?? stock.evToEbit;
    stock.priceToEbit = fund.pebit ?? stock.priceToEbit;
    stock.psr = fund.psr ?? stock.psr;
    stock.totalRevenue12m = fund.receitaLiquida12m ?? fund.receita12m ?? stock.totalRevenue12m;
    stock.netIncome12m = fund.lucroLiquido12m ?? stock.netIncome12m;
    stock.totalEquity = fund.patrimLiq ?? fund.patrimLiqFII ?? stock.totalEquity;
    stock.totalAssets = fund.ativo ?? fund.ativos ?? stock.totalAssets;
    stock.ffoYield = fund.ffoYield ?? stock.ffoYield;
    stock.ffoCota = fund.ffoCota ?? stock.ffoCota;
    stock.dividendoCota = fund.dividendoCota ?? stock.dividendoCota;

    if (fund.nome && !stock.longName) stock.longName = fund.nome;

  } else if (brapiHasData) {
    fundSource = 'brapi';
  }

  // ── Build note ─────────────────────────────────────────────────────────────
  let note: string | undefined;
  if (bdr && fundSource === 'none') {
    note = 'BDRs não possuem indicadores fundamentalistas no Fundamentus. Exibindo preço e histórico via Yahoo Finance.';
  } else if (fundSource === 'none' && priceSource !== 'brapi') {
    note = 'Indicadores fundamentalistas indisponíveis para este ticker.';
  }

  // ── Append price source label to note when using Fundamentus price ─────────
  if (priceSource === 'fundamentus') {
    const priceNote = 'Cotação via Fundamentus (fechamento do pregão anterior).';
    note = note ? `${note} ${priceNote}` : priceNote;
  }

  const sources = { price: priceSource, fundamentals: fundSource };

  return NextResponse.json({ stock, sources, note, fundamentus: fund ?? undefined });
}
