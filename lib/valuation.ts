// Valuation models for B3 stocks

export interface StockData {
  symbol: string;
  shortName: string;
  longName?: string;
  currency: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketPreviousClose: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  marketCap: number;
  // Fundamentals
  priceEarnings?: number;        // P/L
  priceToBook?: number;          // P/VP
  earningsPerShare?: number;     // LPA
  bookValuePerShareMRQ?: number; // VPA
  trailingAnnualDividendYield?: number; // DY
  dividendYield?: number;
  revenuePerShare?: number;
  profitMargins?: number;
  returnOnEquity?: number;       // ROE
  returnOnAssets?: number;       // ROA
  debtToEquity?: number;         // Dívida/PL
  currentRatio?: number;
  grossMargins?: number;
  ebitda?: number;
  totalDebt?: number;
  totalCash?: number;
  enterpriseValue?: number;
  enterpriseToEbitda?: number;  // EV/EBITDA
  enterpriseToRevenue?: number; // EV/Receita
  // Extra Fundamentus fields
  roic?: number;                // ROIC
  ebitMargin?: number;          // Marg. EBIT
  revenueGrowth5y?: number;     // Cres. Rec. (5a) — decimal
  evToEbit?: number;            // EV/EBIT
  priceToEbit?: number;         // P/EBIT
  psr?: number;                 // P/Receita (PSR)
  totalRevenue12m?: number;     // Receita Líquida 12m
  netIncome12m?: number;        // Lucro Líquido 12m
  totalEquity?: number;         // Patrimônio Líquido
  totalAssets?: number;         // Ativo Total
  // FII-specific
  ffoYield?: number;
  ffoCota?: number;
  dividendoCota?: number;
  // Historical prices
  historicalDataPrice?: Array<{
    date: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    adjustedClose: number;
  }>;
  // Dividends
  dividendsData?: {
    cashDividends?: Array<{
      assetIssued: string;
      paymentDate: string;
      rate: number;
      relatedTo: string;
      approvedOn: string;
      isinCode: string;
      label: string;
      lastDatePrior: string;
    }>;
  };
}

export interface ValuationMethod {
  fairPrice: number | null;
  method: string;
  description: string;
  verdict: 'subavaliada' | 'justa' | 'sobreavaliada' | 'indefinido';
  upside: number | null;
}

export interface DcfParams {
  growthRate1: number;   // % annual growth years 1-5
  growthRate2: number;   // % annual growth years 6-10
  terminalGrowth: number; // % perpetual terminal growth
  wacc: number;          // % weighted average cost of capital
  projectionYears: number; // typically 10
}

export interface DcfResult extends ValuationMethod {
  params: DcfParams;
  baseFcfe: number | null;           // base free cash flow per share
  projectedFcfe: number[];           // array of projected FCFEs per share
  presentValues: number[];           // PV of each year's FCFE
  terminalValue: number | null;      // terminal value per share (undiscounted)
  pvTerminalValue: number | null;    // PV of terminal value
  pvSum: number | null;              // sum of all PVs
  sharesUsed: string;                // what we used as base cash flow
}

export interface ValuationResult {
  bazin: ValuationMethod;
  graham: ValuationMethod;
  multiple: ValuationMethod;
  dcf: DcfResult;
  consensus: {
    verdict: 'subavaliada' | 'justa' | 'sobreavaliada' | 'indefinido';
    score: number;
    fairPriceAvg: number | null;
    upside: number | null;
  };
}

export const DEFAULT_DCF_PARAMS: DcfParams = {
  growthRate1: 10,
  growthRate2: 6,
  terminalGrowth: 3,
  wacc: 12,
  projectionYears: 10,
};

function calcVerdict(
  price: number,
  fairPrice: number
): 'subavaliada' | 'justa' | 'sobreavaliada' {
  const diff = (fairPrice - price) / price;
  if (diff > 0.1) return 'subavaliada';
  if (diff < -0.1) return 'sobreavaliada';
  return 'justa';
}

function calcUpside(price: number, fairPrice: number): number {
  return ((fairPrice - price) / price) * 100;
}

// Bazin method: fair price = average annual DPS / 0.06
// Uses 6% as the minimum acceptable dividend yield
function bazinValuation(stock: StockData): ValuationResult['bazin'] {
  const price = stock.regularMarketPrice;
  // Try to get DY and compute DPS
  const dy = stock.dividendYield ?? stock.trailingAnnualDividendYield;

  if (!dy || dy <= 0) {
    return {
      fairPrice: null,
      method: 'Bazin',
      description: 'Sem dados de dividendos disponíveis',
      verdict: 'indefinido',
      upside: null,
    };
  }

  // DPS = price * DY
  const dps = price * (dy > 1 ? dy / 100 : dy);
  const fairPrice = dps / 0.06;

  const verdict = calcVerdict(price, fairPrice);
  return {
    fairPrice: Math.round(fairPrice * 100) / 100,
    method: 'Bazin',
    description: `DPS anual estimado: R$ ${dps.toFixed(2)} / Taxa mínima: 6%`,
    verdict,
    upside: Math.round(calcUpside(price, fairPrice) * 10) / 10,
  };
}

// Graham simplified: √(22.5 × LPA × VPA)
function grahamValuation(stock: StockData): ValuationResult['graham'] {
  const price = stock.regularMarketPrice;
  const lpa = stock.earningsPerShare;
  const vpa = stock.bookValuePerShareMRQ;

  if (!lpa || !vpa || lpa <= 0 || vpa <= 0) {
    return {
      fairPrice: null,
      method: 'Graham',
      description: 'LPA ou VPA não disponível / negativos',
      verdict: 'indefinido',
      upside: null,
    };
  }

  const fairPrice = Math.sqrt(22.5 * lpa * vpa);

  const verdict = calcVerdict(price, fairPrice);
  return {
    fairPrice: Math.round(fairPrice * 100) / 100,
    method: 'Graham',
    description: `√(22,5 × LPA R$${lpa.toFixed(2)} × VPA R$${vpa.toFixed(2)})`,
    verdict,
    upside: Math.round(calcUpside(price, fairPrice) * 10) / 10,
  };
}

// P/L multiple: fair price = LPA × sector avg P/L (15 as conservative default)
function multipleValuation(stock: StockData): ValuationResult['multiple'] {
  const price = stock.regularMarketPrice;
  const lpa = stock.earningsPerShare;
  const targetPL = 15; // conservative market average for Brazil

  if (!lpa || lpa <= 0) {
    return {
      fairPrice: null,
      method: 'Múltiplo P/L',
      description: 'LPA não disponível ou negativo',
      verdict: 'indefinido',
      upside: null,
    };
  }

  const fairPrice = lpa * targetPL;

  const verdict = calcVerdict(price, fairPrice);
  return {
    fairPrice: Math.round(fairPrice * 100) / 100,
    method: 'Múltiplo P/L',
    description: `LPA R$${lpa.toFixed(2)} × P/L alvo de ${targetPL}x (média conservadora)`,
    verdict,
    upside: Math.round(calcUpside(price, fairPrice) * 10) / 10,
  };
}

// ── DCF (FCFE / earnings proxy) ──────────────────────────────────────────────
// Base FCF per share: we prefer EPS as a proxy when operating CF isn't in API.
// Formula: sum of PV(FCFE_t) for t=1..N  +  PV(Terminal Value)
// TV = FCFE_N+1 / (wacc - g_terminal)   [Gordon Growth]
export function dcfValuation(stock: StockData, params: DcfParams): DcfResult {
  const price = stock.regularMarketPrice;
  const { growthRate1, growthRate2, terminalGrowth, wacc, projectionYears } = params;

  // Validate params
  if (wacc <= terminalGrowth) {
    return {
      fairPrice: null,
      method: 'FCD (DCF)',
      description: 'WACC deve ser maior que o crescimento terminal',
      verdict: 'indefinido',
      upside: null,
      params,
      baseFcfe: null,
      projectedFcfe: [],
      presentValues: [],
      terminalValue: null,
      pvTerminalValue: null,
      pvSum: null,
      sharesUsed: '—',
    };
  }

  // Base cash flow per share: use EPS as earnings proxy
  const baseFcfe = stock.earningsPerShare ?? null;
  let sharesUsed = 'LPA (EPS)';

  if (!baseFcfe || baseFcfe <= 0) {
    return {
      fairPrice: null,
      method: 'FCD (DCF)',
      description: 'LPA não disponível ou negativo — DCF requer lucro positivo',
      verdict: 'indefinido',
      upside: null,
      params,
      baseFcfe,
      projectedFcfe: [],
      presentValues: [],
      terminalValue: null,
      pvTerminalValue: null,
      pvSum: null,
      sharesUsed,
    };
  }

  const waccDec = wacc / 100;
  const g1Dec = growthRate1 / 100;
  const g2Dec = growthRate2 / 100;
  const gTDec = terminalGrowth / 100;
  const half = Math.floor(projectionYears / 2);

  const projectedFcfe: number[] = [];
  const presentValues: number[] = [];

  let fcfe = baseFcfe;
  for (let t = 1; t <= projectionYears; t++) {
    const g = t <= half ? g1Dec : g2Dec;
    fcfe = fcfe * (1 + g);
    projectedFcfe.push(Math.round(fcfe * 10000) / 10000);
    const pv = fcfe / Math.pow(1 + waccDec, t);
    presentValues.push(Math.round(pv * 10000) / 10000);
  }

  // Terminal value (Gordon growth at end of projection period)
  const lastFcfe = projectedFcfe[projectedFcfe.length - 1];
  const fcfeTerminal = lastFcfe * (1 + gTDec);
  const terminalValue = fcfeTerminal / (waccDec - gTDec);
  const pvTerminalValue = terminalValue / Math.pow(1 + waccDec, projectionYears);

  const pvSum = presentValues.reduce((a, b) => a + b, 0) + pvTerminalValue;
  const fairPrice = Math.round(pvSum * 100) / 100;

  const verdict = calcVerdict(price, fairPrice);
  const description =
    `Base: LPA R$${baseFcfe.toFixed(2)} | Cresc. ${growthRate1}%→${growthRate2}% | WACC ${wacc}% | g∞ ${terminalGrowth}%`;

  return {
    fairPrice,
    method: 'FCD (DCF)',
    description,
    verdict,
    upside: Math.round(calcUpside(price, fairPrice) * 10) / 10,
    params,
    baseFcfe,
    projectedFcfe,
    presentValues,
    terminalValue: Math.round(terminalValue * 100) / 100,
    pvTerminalValue: Math.round(pvTerminalValue * 100) / 100,
    pvSum: Math.round(pvSum * 100) / 100,
    sharesUsed,
  };
}

export function calculateValuation(stock: StockData, dcfParams: DcfParams = DEFAULT_DCF_PARAMS): ValuationResult {
  const bazin = bazinValuation(stock);
  const graham = grahamValuation(stock);
  const multiple = multipleValuation(stock);
  const dcf = dcfValuation(stock, dcfParams);

  // Consensus: score each model
  const verdictScore = (v: string) => {
    if (v === 'subavaliada') return 1;
    if (v === 'sobreavaliada') return -1;
    return 0;
  };

  const scores: number[] = [bazin, graham, multiple, dcf]
    .filter((m) => m.verdict !== 'indefinido')
    .map((m) => verdictScore(m.verdict));

  const fairPrices = [bazin.fairPrice, graham.fairPrice, multiple.fairPrice, dcf.fairPrice].filter(
    (p): p is number => p !== null && p > 0
  );

  const avgFair =
    fairPrices.length > 0
      ? Math.round((fairPrices.reduce((a, b) => a + b, 0) / fairPrices.length) * 100) / 100
      : null;

  const avgScore: number = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  let consensusVerdict: ValuationResult['consensus']['verdict'] = 'indefinido';
  if (scores.length > 0) {
    if (avgScore > 0.2) consensusVerdict = 'subavaliada';
    else if (avgScore < -0.2) consensusVerdict = 'sobreavaliada';
    else consensusVerdict = 'justa';
  }

  return {
    bazin,
    graham,
    multiple,
    dcf,
    consensus: {
      verdict: consensusVerdict,
      score: Math.round(avgScore * 100) / 100,
      fairPriceAvg: avgFair,
      upside:
        avgFair !== null
          ? Math.round(calcUpside(stock.regularMarketPrice, avgFair) * 10) / 10
          : null,
    },
  };
}

export const POPULAR_TICKERS = [
  { ticker: 'PETR4', name: 'Petrobras' },
  { ticker: 'VALE3', name: 'Vale' },
  { ticker: 'ITUB4', name: 'Itaú Unibanco' },
  { ticker: 'BBDC4', name: 'Bradesco' },
  { ticker: 'BBAS3', name: 'Banco do Brasil' },
  { ticker: 'WEGE3', name: 'WEG' },
  { ticker: 'RENT3', name: 'Localiza' },
  { ticker: 'MGLU3', name: 'Magazine Luiza' },
  { ticker: 'ABEV3', name: 'Ambev' },
  { ticker: 'SUZB3', name: 'Suzano' },
  { ticker: 'EGIE3', name: 'Engie Brasil' },
  { ticker: 'TAEE11', name: 'Taesa' },
];

export function formatCurrency(value: number | undefined | null): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number | undefined | null, alreadyPercent = false): string {
  if (value == null) return '—';
  const pct = alreadyPercent ? value : value * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
}

export function formatLargeNumber(value: number | undefined | null): string {
  if (value == null) return '—';
  if (Math.abs(value) >= 1e12) return `R$ ${(value / 1e12).toFixed(2)}T`;
  if (Math.abs(value) >= 1e9) return `R$ ${(value / 1e9).toFixed(2)}B`;
  if (Math.abs(value) >= 1e6) return `R$ ${(value / 1e6).toFixed(2)}M`;
  return formatCurrency(value);
}
