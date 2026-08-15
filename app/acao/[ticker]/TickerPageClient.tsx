'use client';

import { useEffect, useState } from 'react';
import { BarChart2, ArrowLeft, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { AuthButton } from '@/components/AuthButton';
import { WatchlistButton } from '@/components/WatchlistButton';
import { PdfExportButton } from '@/components/PdfExportButton';
import { StockHeader } from '@/components/valuation/StockHeader';
import { FundamentalsGrid } from '@/components/valuation/FundamentalsGrid';
import { ValuationPanel } from '@/components/valuation/ValuationPanel';
import { PriceChart } from '@/components/valuation/PriceChart';
import { DividendsCard } from '@/components/valuation/DividendsCard';
import { DcfPanel } from '@/components/valuation/DcfPanel';
import { calculateValuation, type StockData } from '@/lib/valuation';

interface Props {
  ticker: string;
}

export function TickerPageClient({ ticker }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stock, setStock] = useState<StockData | null>(null);
  const [dataNote, setDataNote] = useState<string | null>(null);

  const fetchStock = async () => {
    setLoading(true);
    setError(null);
    setDataNote(null);

    try {
      const res = await fetch(`/api/stock?ticker=${encodeURIComponent(ticker)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Erro ao buscar dados');
        setStock(null);
        return;
      }

      setStock(data.stock);
      if (data.note) setDataNote(data.note);
    } catch {
      setError('Falha de conexão. Verifique sua internet e tente novamente.');
      setStock(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker]);

  const valuation = stock ? calculateValuation(stock) : null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
      {/* Top bar */}
      <header
        className="sticky top-0 z-50 w-full"
        style={{
          background: 'rgba(5,5,5,0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0 hover:opacity-80 transition-opacity">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--gradient-accent)' }}
            >
              <BarChart2 size={14} color="#050505" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-sm tracking-tight" style={{ letterSpacing: '-0.02em' }}>
              <span className="gradient-text">Valor</span>
              <span style={{ color: 'var(--text-primary)' }}>B3</span>
            </span>
          </Link>

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm min-w-0" aria-label="Navegação">
            <Link
              href="/"
              className="flex items-center gap-1 hover:opacity-80 transition-opacity shrink-0"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <ArrowLeft size={14} />
              <span className="hidden sm:inline">Busca</span>
            </Link>
            <span style={{ color: 'var(--border-subtle)' }}>/</span>
            <span
              className="mono font-semibold truncate"
              style={{ color: 'var(--accent-cyan)' }}
            >
              {ticker}
            </span>
          </nav>

          <div className="flex items-center gap-2">
            <WatchlistButton ticker={ticker.toUpperCase()} />
            {/* Search hint */}
            <Link
              href="/"
              className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all hover:opacity-80"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-tertiary)',
              }}
            >
              <span>Buscar outro ticker</span>
              <ExternalLink size={11} />
            </Link>
            <AuthButton />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-20">

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center gap-4 py-24">
            <div
              className="w-12 h-12 rounded-full border-2 animate-spin"
              style={{ borderColor: 'var(--accent-cyan)', borderTopColor: 'transparent' }}
            />
            <div className="text-sm mono" style={{ color: 'var(--text-secondary)' }}>
              Carregando dados de {ticker}...
            </div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center gap-4 py-16 mx-auto max-w-md text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,69,96,0.1)', border: '1px solid rgba(255,69,96,0.3)' }}
            >
              <AlertCircle size={22} style={{ color: 'var(--accent-red)' }} />
            </div>
            <div>
              <div className="font-semibold text-base mb-1" style={{ color: 'var(--text-primary)' }}>
                Dados não encontrados
              </div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{error}</div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={fetchStock}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all hover:opacity-80"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                <RefreshCw size={14} />
                Tentar novamente
              </button>
              <Link
                href="/"
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all hover:opacity-80"
                style={{
                  background: 'rgba(0,212,255,0.1)',
                  border: '1px solid rgba(0,212,255,0.3)',
                  color: 'var(--accent-cyan)',
                }}
              >
                <ArrowLeft size={14} />
                Voltar à busca
              </Link>
            </div>
          </div>
        )}

        {/* Results */}
        {!loading && stock && valuation && (
          <div className="flex flex-col gap-5">
            <StockHeader stock={stock} />

            {/* Ações da análise */}
            <div className="flex items-center gap-3 flex-wrap">
              <PdfExportButton stock={stock} valuation={valuation} />
            </div>

            {dataNote && (
              <div
                className="flex items-start gap-3 p-3 rounded-xl text-sm"
                style={{
                  background: 'rgba(255,215,0,0.06)',
                  border: '1px solid rgba(255,215,0,0.2)',
                }}
              >
                <span style={{ flexShrink: 0 }}>⚠️</span>
                <span style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{dataNote}</span>
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <ValuationPanel result={valuation} currentPrice={stock.regularMarketPrice} />
              <PriceChart stock={stock} />
            </div>

            <DcfPanel stock={stock} initialDcf={valuation.dcf} />
            <FundamentalsGrid stock={stock} />
            <DividendsCard stock={stock} />

            {/* SEO text block — visible but subtle; helps Google understand the page */}
            <SeoTextBlock ticker={ticker} stock={stock} valuation={valuation} />
          </div>
        )}
      </main>

      <footer className="w-full py-6 text-center" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <p className="text-xs mono" style={{ color: 'var(--text-tertiary)' }}>
          Dados via{' '}
          <a href="https://www.fundamentus.com.br" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-cyan)' }}>Fundamentus</a>
          {' · '}
          <a href="https://finance.yahoo.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-cyan)' }}>Yahoo Finance</a>
          {' · '}
          Apenas para fins educacionais · Não é recomendação de investimento
        </p>
      </footer>
    </div>
  );
}

// ── SEO text block ─────────────────────────────────────────────────────────────

function SeoTextBlock({
  ticker,
  stock,
  valuation,
}: {
  ticker: string;
  stock: StockData;
  valuation: ReturnType<typeof calculateValuation>;
}) {
  const nome = stock.longName ?? stock.shortName ?? ticker;
  const preco = stock.regularMarketPrice;
  const pl = stock.priceEarnings;
  const pvp = stock.priceToBook;
  const roe = stock.returnOnEquity ? (stock.returnOnEquity * 100).toFixed(1) : null;
  const dy = stock.dividendYield ? (stock.dividendYield * 100).toFixed(1) : null;
  const lpa = stock.earningsPerShare;
  const consensus = valuation.consensus;

  const verdictLabel =
    consensus.verdict === 'subavaliada'
      ? 'possivelmente subavaliada'
      : consensus.verdict === 'sobreavaliada'
      ? 'possivelmente sobreavaliada'
      : consensus.verdict === 'justa'
      ? 'próxima do valor justo'
      : null;

  return (
    <section
      className="rounded-2xl p-6"
      style={{ background: 'var(--card)', border: '1px solid var(--border-subtle)' }}
      aria-label={`Sobre a análise de ${ticker}`}
    >
      <h2 className="text-base font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
        Análise fundamentalista de {ticker}
      </h2>
      <div className="text-sm leading-relaxed space-y-2" style={{ color: 'var(--text-secondary)' }}>
        <p>
          <strong style={{ color: 'var(--text-primary)' }}>{ticker}</strong>
          {nome !== ticker ? ` (${nome})` : ''} é uma ação negociada na{' '}
          <strong style={{ color: 'var(--text-primary)' }}>B3 (Bolsa de Valores do Brasil)</strong>.
          {preco > 0 && (
            <> A cotação atual é de{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                R$ {preco.toFixed(2).replace('.', ',')}
              </strong>.
            </>
          )}
        </p>

        {(pl || pvp || roe || dy) && (
          <p>
            Os principais indicadores fundamentalistas são:
            {pl && <> <strong style={{ color: 'var(--text-primary)' }}>P/L de {pl.toFixed(1)}x</strong> (relação preço/lucro),</>}
            {pvp && <> <strong style={{ color: 'var(--text-primary)' }}>P/VP de {pvp.toFixed(2)}x</strong> (preço sobre valor patrimonial),</>}
            {roe && <> <strong style={{ color: 'var(--text-primary)' }}>ROE de {roe}%</strong> (retorno sobre patrimônio),</>}
            {dy && <> <strong style={{ color: 'var(--text-primary)' }}>Dividend Yield de {dy}%</strong> ao ano.</>}
          </p>
        )}

        {lpa && (
          <p>
            O LPA (Lucro por Ação) de {ticker} é{' '}
            <strong style={{ color: 'var(--text-primary)' }}>
              R$ {lpa.toFixed(2).replace('.', ',')}
            </strong>
            , usado como base no cálculo do DCF (Fluxo de Caixa Descontado).
          </p>
        )}

        {verdictLabel && consensus.fairPriceAvg && (
          <p>
            Pelos modelos de valuation (Bazin, Graham, Múltiplos e DCF), {ticker} aparenta estar{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{verdictLabel}</strong>.
            O preço justo médio estimado pelos modelos é de{' '}
            <strong style={{ color: 'var(--text-primary)' }}>
              R$ {consensus.fairPriceAvg.toFixed(2).replace('.', ',')}
            </strong>.
          </p>
        )}

        <p className="text-xs pt-1" style={{ color: 'var(--text-tertiary)' }}>
          ⚠️ Esta análise é apenas para fins educacionais e informativos. Não constitui recomendação
          de compra ou venda. Consulte um assessor de investimentos certificado antes de tomar
          decisões financeiras.
        </p>
      </div>
    </section>
  );
}
