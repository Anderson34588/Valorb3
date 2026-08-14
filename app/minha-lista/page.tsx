'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BarChart2, Trash2, TrendingUp, TrendingDown, Minus, Bookmark } from 'lucide-react';
import { AuthButton } from '@/components/AuthButton';
import { useAuth } from '@/hooks/useAuth';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useSubscription } from '@/hooks/useSubscription';

interface TickerSummary {
  ticker: string;
  name?: string;
  price?: number;
  change?: number;
  changePct?: number;
  loading: boolean;
  error: boolean;
}

export default function MinhaListaPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { pro, loading: subLoading } = useSubscription();
  const { tickers, loading: wlLoading, remove } = useWatchlist();
  const [summaries, setSummaries] = useState<Record<string, TickerSummary>>({});

  // Redireciona para /planos se não for Pro
  useEffect(() => {
    if (!subLoading && !pro) {
      router.replace('/planos?motivo=pro');
    }
  }, [pro, subLoading, router]);

  // Busca o preço de cada ativo salvo
  useEffect(() => {
    if (!tickers.length) return;
    tickers.forEach((ticker) => {
      if (summaries[ticker]?.loading === false) return;
      setSummaries((prev) => ({
        ...prev,
        [ticker]: { ticker, loading: true, error: false },
      }));
      fetch(`/api/stock?ticker=${encodeURIComponent(ticker)}`)
        .then((r) => r.json())
        .then((d) => {
          const s = d.stock;
          setSummaries((prev) => ({
            ...prev,
            [ticker]: {
              ticker,
              name: s?.name,
              price: s?.price,
              change: s?.change,
              changePct: s?.changePct,
              loading: false,
              error: false,
            },
          }));
        })
        .catch(() => {
          setSummaries((prev) => ({
            ...prev,
            [ticker]: { ticker, loading: false, error: true },
          }));
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickers.join(',')]);

  if (authLoading || wlLoading) {
    return <PageShell><LoadingState /></PageShell>;
  }

  if (!user) {
    return (
      <PageShell>
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)' }}
          >
            <Bookmark size={28} style={{ color: 'var(--accent-cyan)' }} />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>
              Sua Lista de Ações
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Entre com Google para salvar e acompanhar suas ações favoritas.
            </p>
          </div>
          <Link
            href="/login"
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
            style={{ background: 'var(--gradient-accent)', color: '#050505' }}
          >
            Entrar com Google
          </Link>
        </div>
      </PageShell>
    );
  }

  if (!tickers.length) {
    return (
      <PageShell>
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)' }}
          >
            <Bookmark size={28} style={{ color: 'var(--accent-cyan)' }} />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>
              Sua lista está vazia
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Pesquise uma ação e clique em{' '}
              <span style={{ color: 'var(--accent-cyan)' }}>Salvar na Lista</span>
              {' '}para acompanhar aqui.
            </p>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
            style={{ background: 'var(--gradient-accent)', color: '#050505' }}
          >
            Buscar ações
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ letterSpacing: '-0.03em' }}>
            Minha <span className="gradient-text">Lista de Ações</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            {tickers.length} ativo{tickers.length !== 1 ? 's' : ''} salvo{tickers.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="grid gap-3">
          {tickers.map((ticker) => {
            const s = summaries[ticker];
            const isUp = (s?.changePct ?? 0) > 0;
            const isDown = (s?.changePct ?? 0) < 0;

            return (
              <div
                key={ticker}
                className="group rounded-2xl p-4 flex items-center justify-between gap-4 transition-all"
                style={{ background: 'var(--card)', border: '1px solid var(--border-subtle)' }}
              >
                {/* Ativo */}
                <Link
                  href={`/acao/${ticker}`}
                  className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs"
                    style={{ background: 'var(--gradient-accent)', color: '#050505', letterSpacing: '-0.01em' }}
                  >
                    {ticker.slice(0, 4)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm mono" style={{ color: 'var(--text-primary)' }}>
                      {ticker}
                    </p>
                    {s?.name && (
                      <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                        {s.name}
                      </p>
                    )}
                  </div>
                </Link>

                {/* Cotação */}
                <div className="flex items-center gap-4 shrink-0">
                  {s?.loading ? (
                    <div className="w-20 h-8 rounded-lg animate-pulse" style={{ background: 'var(--surface)' }} />
                  ) : s?.error ? (
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>—</span>
                  ) : (
                    <div className="text-right">
                      <p className="font-bold text-sm mono" style={{ color: 'var(--text-primary)' }}>
                        {s?.price != null
                          ? `R$ ${s.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : '—'}
                      </p>
                      <div
                        className="flex items-center justify-end gap-0.5 text-xs mono"
                        style={{ color: isUp ? 'var(--accent-green)' : isDown ? 'var(--accent-red)' : 'var(--text-tertiary)' }}
                      >
                        {isUp ? <TrendingUp size={11} /> : isDown ? <TrendingDown size={11} /> : <Minus size={11} />}
                        {s?.changePct != null ? `${isUp ? '+' : ''}${s.changePct.toFixed(2)}%` : '—'}
                      </div>
                    </div>
                  )}

                  <Link
                    href={`/acao/${ticker}`}
                    className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl transition-all hover:opacity-80 font-medium"
                    style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', color: 'var(--accent-cyan)' }}
                  >
                    Analisar
                  </Link>

                  <button
                    onClick={() => remove(ticker)}
                    className="p-2 rounded-xl transition-all hover:opacity-80 opacity-0 group-hover:opacity-100"
                    style={{ background: 'rgba(255,69,96,0.08)', border: '1px solid rgba(255,69,96,0.2)', color: 'var(--accent-red)' }}
                    title={`Remover ${ticker} da lista`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <header
        className="w-full h-14 flex items-center justify-between px-6 sticky top-0 z-50"
        style={{ background: 'rgba(5,5,5,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--gradient-accent)' }}>
            <BarChart2 size={14} color="#050505" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-sm" style={{ letterSpacing: '-0.02em' }}>
            <span className="gradient-text">Valor</span>
            <span style={{ color: 'var(--text-primary)' }}>B3</span>
          </span>
        </Link>
        <AuthButton />
      </header>
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}

function LoadingState() {
  return (
    <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
      <div className="mb-6">
        <div className="w-48 h-7 rounded-lg animate-pulse" style={{ background: 'var(--surface)' }} />
        <div className="w-24 h-4 rounded-lg mt-2 animate-pulse" style={{ background: 'var(--surface)' }} />
      </div>
      <div className="grid gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl p-4 h-16 animate-pulse"
            style={{ background: 'var(--card)', border: '1px solid var(--border-subtle)' }} />
        ))}
      </div>
    </main>
  );
}
