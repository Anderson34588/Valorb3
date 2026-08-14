'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import type { StockData } from '@/lib/valuation';
import { formatCurrency, formatLargeNumber } from '@/lib/valuation';

interface Props {
  stock: StockData;
}

export function StockHeader({ stock }: Props) {
  const isPositive = stock.regularMarketChange >= 0;
  const pct = stock.regularMarketChangePercent;
  const fmtPct = `${isPositive ? '+' : ''}${pct?.toFixed(2) ?? '0.00'}%`;
  const fmtChange = `${isPositive ? '+' : ''}${formatCurrency(stock.regularMarketChange).replace('R$\xa0', 'R$ ')}`;

  return (
    <div className="glow-card p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Left: Name + ticker */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span
              className="text-xs uppercase tracking-widest mono px-2 py-0.5 rounded"
              style={{
                background: 'rgba(0,212,255,0.1)',
                color: 'var(--accent-cyan)',
                border: '1px solid rgba(0,212,255,0.2)',
              }}
            >
              {stock.symbol}
            </span>
            <span
              className="text-xs uppercase tracking-widest mono"
              style={{ color: 'var(--text-tertiary)' }}
            >
              B3
            </span>
          </div>
          <h2
            className="text-xl font-bold leading-tight"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}
          >
            {stock.shortName || stock.longName || stock.symbol}
          </h2>
        </div>

        {/* Right: Price */}
        <div className="text-right">
          <div
            className="text-4xl font-bold mono"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
          >
            {formatCurrency(stock.regularMarketPrice)}
          </div>
          <div
            className="flex items-center justify-end gap-1.5 mt-1"
            style={{ color: isPositive ? 'var(--accent-green)' : 'var(--accent-red)' }}
          >
            {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span className="mono text-sm font-semibold">{fmtChange}</span>
            <span className="mono text-sm font-semibold">({fmtPct})</span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div
        className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        {[
          { label: 'Mín do dia', value: formatCurrency(stock.regularMarketDayLow) },
          { label: 'Máx do dia', value: formatCurrency(stock.regularMarketDayHigh) },
          { label: 'Mín 52s', value: formatCurrency(stock.fiftyTwoWeekLow) },
          { label: 'Máx 52s', value: formatCurrency(stock.fiftyTwoWeekHigh) },
        ].map(({ label, value }) => (
          <div key={label}>
            <div
              className="text-xs uppercase tracking-widest mb-0.5 mono"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {label}
            </div>
            <div
              className="text-sm font-semibold mono"
              style={{ color: 'var(--text-secondary)' }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Market cap + volume */}
      <div
        className="flex flex-wrap gap-4 mt-3 pt-3"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <div>
          <span
            className="text-xs uppercase tracking-widest mono mr-2"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Market Cap
          </span>
          <span className="text-sm font-semibold mono" style={{ color: 'var(--text-secondary)' }}>
            {formatLargeNumber(stock.marketCap)}
          </span>
        </div>
        <div>
          <span
            className="text-xs uppercase tracking-widest mono mr-2"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Volume
          </span>
          <span className="text-sm font-semibold mono" style={{ color: 'var(--text-secondary)' }}>
            {stock.regularMarketVolume
              ? new Intl.NumberFormat('pt-BR').format(stock.regularMarketVolume)
              : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}
