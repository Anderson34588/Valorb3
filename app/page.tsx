'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BarChart2 } from 'lucide-react';
import { StockSearch } from '@/components/valuation/StockSearch';
import { AuthButton } from '@/components/AuthButton';

// Tickers populares — links estáticos ajudam o Google a indexar as páginas
const POPULAR_TICKERS = [
  { ticker: 'PETR4', label: 'Petrobras' },
  { ticker: 'VALE3', label: 'Vale' },
  { ticker: 'ITUB4', label: 'Itaú Unibanco' },
  { ticker: 'WEGE3', label: 'WEG' },
  { ticker: 'BBAS3', label: 'Banco do Brasil' },
  { ticker: 'PRIO3', label: 'PRIO' },
  { ticker: 'EGIE3', label: 'Engie Brasil' },
  { ticker: 'ABEV3', label: 'Ambev' },
  { ticker: 'MXRF11', label: 'Maxi Renda FII' },
  { ticker: 'BOVA11', label: 'ETF Ibovespa' },
  { ticker: 'TAEE11', label: 'Taesa' },
  { ticker: 'HGLG11', label: 'CSHG Logística FII' },
];

export default function Home() {
  const router = useRouter();

  const handleSearch = useCallback((ticker: string) => {
    router.push(`/acao/${ticker.toUpperCase().trim()}`);
  }, [router]);

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}
    >
      {/* Top bar */}
      <header
        className="sticky top-0 z-50 w-full"
        style={{
          background: 'rgba(5,5,5,0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--gradient-accent)' }}
            >
              <BarChart2 size={14} color="#050505" strokeWidth={2.5} />
            </div>
            <span
              className="font-bold text-sm tracking-tight"
              style={{ letterSpacing: '-0.02em' }}
            >
              <span className="gradient-text">Valor</span>
              <span style={{ color: 'var(--text-primary)' }}>B3</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/planos"
              className="hidden sm:flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all hover:opacity-80"
              style={{
                background: 'rgba(0,212,255,0.1)',
                border: '1px solid rgba(0,212,255,0.3)',
                color: 'var(--accent-cyan)',
              }}
            >
              ✦ Planos
            </Link>
            <Link
              href="/filtrar"
              className="hidden sm:flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all hover:opacity-80"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              Filtrar Ações
            </Link>
            <Link
              href="/minha-lista"
              className="hidden sm:flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all hover:opacity-80"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              Minha Lista
            </Link>
            <AuthButton />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 pb-20">
        {/* Hero */}
        <section className="text-center mb-12">
          <h1
            className="text-4xl sm:text-5xl font-bold mb-3"
            style={{ letterSpacing: '-0.03em' }}
          >
            Descubra o{' '}
            <span className="gradient-text">valor justo</span>
            <br className="hidden sm:block" /> de qualquer ação da B3
          </h1>
          <p
            className="text-base sm:text-lg mb-8 max-w-xl mx-auto"
            style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}
          >
            Análise fundamentalista com Bazin, Graham, Múltiplos e FCD (DCF) —
            dados em tempo real para ações, FIIs, BDRs e ETFs.
          </p>
          <StockSearch onSearch={handleSearch} loading={false} />
        </section>

        {/* Popular tickers grid — links estáticos para SEO + ux */}
        <section aria-label="Ações mais analisadas">
          <h2
            className="text-xs uppercase tracking-widest mono mb-4 text-center"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Ações & FIIs populares
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {POPULAR_TICKERS.map(({ ticker, label }) => (
              <Link
                key={ticker}
                href={`/acao/${ticker}`}
                className="flex flex-col items-center gap-1 p-3 rounded-xl text-center transition-all duration-200 hover:scale-[1.03]"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border-subtle)',
                  textDecoration: 'none',
                }}
              >
                <span
                  className="font-bold mono text-sm"
                  style={{ color: 'var(--accent-cyan)' }}
                >
                  {ticker}
                </span>
                <span
                  className="text-xs leading-tight"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Features section — for SEO and user education */}
        <section className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4" aria-label="Funcionalidades">
          {[
            {
              icon: '📊',
              title: 'Múltiplos Modelos',
              desc: 'Bazin, Graham, P/L e DCF (Fluxo de Caixa Descontado) calculados automaticamente.',
            },
            {
              icon: '⚡',
              title: 'Dados em Tempo Real',
              desc: 'Cotações, indicadores fundamentalistas e histórico atualizado diariamente.',
            },
            {
              icon: '🏢',
              title: 'Todos os Tickers B3',
              desc: 'Ações, FIIs, BDRs e ETFs — mais de 500 ativos analisados.',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="p-5 rounded-2xl"
              style={{ background: 'var(--card)', border: '1px solid var(--border-subtle)' }}
            >
              <div className="text-2xl mb-2">{f.icon}</div>
              <h3
                className="font-semibold text-sm mb-1"
                style={{ color: 'var(--text-primary)' }}
              >
                {f.title}
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {f.desc}
              </p>
            </div>
          ))}
        </section>
      </main>

      {/* Footer */}
      <footer
        className="w-full py-6 text-center"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <p className="text-xs mono" style={{ color: 'var(--text-tertiary)' }}>
          Dados via{' '}
          <a href="https://www.fundamentus.com.br" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-cyan)' }}>
            Fundamentus
          </a>
          {' · '}
          <a href="https://finance.yahoo.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-cyan)' }}>
            Yahoo Finance
          </a>
          {' · '}
          Apenas para fins educacionais · Não é recomendação de investimento
        </p>
      </footer>
    </div>
  );
}
