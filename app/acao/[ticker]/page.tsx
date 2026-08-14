import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TickerPageClient } from './TickerPageClient';
import { fetchFundamentus } from '@/lib/fundamentus';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ ticker: string }>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeTicker(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function isValidTicker(t: string): boolean {
  // B3 tickers:
  //   Ações/FIIs/ETFs: 3-6 letters + 1-2 digits (PETR4, TAEE11, BOVA11)
  //   BDRs: 2-5 letters + 32/33/34/35/39 (AAPL34, MSFT34, GOOGL34)
  return /^[A-Z]{3,6}\d{1,2}$/.test(t) || /^[A-Z]{2,5}3[23459]$/.test(t);
}

function buildDescription(
  ticker: string,
  nome: string,
  cotacao: number | null,
  pl: number | null,
  roe: number | null,
  dy: number | null,
  pvp: number | null
): string {
  const parts: string[] = [
    `Análise completa de ${ticker} (${nome}).`,
  ];
  if (cotacao) parts.push(`Cotação atual: R$ ${cotacao.toFixed(2).replace('.', ',')}.`);

  const indicators: string[] = [];
  if (pl) indicators.push(`P/L ${pl.toFixed(1)}x`);
  if (pvp) indicators.push(`P/VP ${pvp.toFixed(2)}x`);
  if (roe) indicators.push(`ROE ${(roe * 100).toFixed(1)}%`);
  if (dy) indicators.push(`DY ${(dy * 100).toFixed(1)}%`);

  if (indicators.length > 0) {
    parts.push(`Indicadores: ${indicators.join(', ')}.`);
  }
  parts.push('Valuation com Bazin, Graham, Múltiplos e DCF. Dados em tempo real.');
  return parts.join(' ').slice(0, 160);
}

// ── generateMetadata ──────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ticker: rawTicker } = await params;
  const ticker = normalizeTicker(rawTicker);

  if (!isValidTicker(ticker)) {
    return {
      title: 'Ticker inválido — ValorB3',
      description: 'O ticker informado não é válido. Acesse ValorB3 para analisar ações da B3.',
    };
  }

  // Fetch from Fundamentus for rich metadata (no Yahoo needed for meta tags)
  const fund = await fetchFundamentus(ticker).catch(() => null);

  const nome = fund?.nome ?? ticker;
  const cotacao = fund?.cotacao ?? null;
  const pl = fund?.pl ?? null;
  const roe = fund?.roe ?? null;
  const dy = fund?.divYield ?? null;
  const pvp = fund?.pvp ?? null;

  const title = `${ticker} — Valuation e Indicadores | ValorB3`;
  const description = buildDescription(ticker, nome, cotacao, pl, roe, dy, pvp);
  const canonical = `https://valorb3.com.br/acao/${ticker}`;

  const keywords = [
    `${ticker} valuation`,
    `${ticker} valor justo`,
    `${ticker} análise fundamentalista`,
    `${ticker} P/L`,
    `${ticker} ROE`,
    `${ticker} dividend yield`,
    `ação ${ticker}`,
    `${nome} valuation`,
    'análise fundamentalista B3',
    'valor justo ação B3',
  ];

  return {
    title,
    description,
    keywords,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'ValorB3',
      locale: 'pt_BR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

// ── Page component ────────────────────────────────────────────────────────────

export default async function TickerPage({ params }: Props) {
  const { ticker: rawTicker } = await params;
  const ticker = normalizeTicker(rawTicker);

  if (!isValidTicker(ticker)) {
    notFound();
  }

  return <TickerPageClient ticker={ticker} />;
}

// ── Static params hint (optional — helps Next.js pre-render popular tickers) ─

export async function generateStaticParams() {
  // Pre-render the most searched tickers at build time
  const popular = [
    'PETR4', 'VALE3', 'ITUB4', 'BBAS3', 'WEGE3',
    'ABEV3', 'RENT3', 'PRIO3', 'EGIE3', 'TAEE11',
    'MXRF11', 'HGLG11', 'XPML11', 'VISC11', 'KNRI11',
    'BOVA11', 'IVVB11', 'PETR3', 'VALE5', 'MGLU3',
  ];
  return popular.map((ticker) => ({ ticker }));
}
