'use client';

import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { StockData } from '@/lib/valuation';
import { formatCurrency } from '@/lib/valuation';

interface Props {
  stock: StockData;
}

type Range = '1m' | '3m' | '6m' | '1y';

const RANGES: { key: Range; label: string; days: number }[] = [
  { key: '1m', label: '1M', days: 30 },
  { key: '3m', label: '3M', days: 90 },
  { key: '6m', label: '6M', days: 180 },
  { key: '1y', label: '1A', days: 365 },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-xl text-sm"
      style={{
        background: 'var(--card-hover)',
        border: '1px solid var(--border-hover)',
        color: 'var(--text-primary)',
      }}
    >
      <div className="mono text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>
        {label}
      </div>
      <div className="mono font-bold" style={{ color: 'var(--accent-cyan)' }}>
        {formatCurrency(payload[0].value)}
      </div>
    </div>
  );
}

export function PriceChart({ stock }: Props) {
  const [range, setRange] = useState<Range>('6m');
  const historical = stock.historicalDataPrice;

  const chartData = useMemo(() => {
    if (!historical || historical.length === 0) return [];
    const cutDays = RANGES.find((r) => r.key === range)?.days ?? 180;
    const cutMs = Date.now() - cutDays * 24 * 60 * 60 * 1000;
    return historical
      .filter((d) => d.date * 1000 >= cutMs)
      .map((d) => ({
        date: new Date(d.date * 1000).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'short',
        }),
        close: Math.round((d.adjustedClose ?? d.close) * 100) / 100,
      }));
  }, [historical, range]);

  const isUp =
    chartData.length >= 2
      ? chartData[chartData.length - 1].close >= chartData[0].close
      : true;

  const accentColor = isUp ? '#00ff88' : '#ff4560';
  const gradientId = `priceGrad-${stock.symbol}`;

  if (!historical || historical.length === 0) {
    return (
      <div className="glow-card p-6">
        <h3
          className="text-sm uppercase tracking-widest mono mb-4"
          style={{ color: 'var(--accent-cyan)' }}
        >
          Histórico de Preços
        </h3>
        <div
          className="flex items-center justify-center h-40 text-sm"
          style={{ color: 'var(--text-tertiary)' }}
        >
          Dados históricos não disponíveis para este ticker.
        </div>
      </div>
    );
  }

  return (
    <div className="glow-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-sm uppercase tracking-widest mono"
          style={{ color: 'var(--accent-cyan)' }}
        >
          Histórico de Preços
        </h3>
        {/* Range selector */}
        <div
          className="flex gap-1 p-1 rounded-xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}
        >
          {RANGES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              className="px-3 py-1 rounded-lg text-xs font-semibold mono transition-all duration-200"
              style={{
                background: range === key ? 'rgba(0,212,255,0.15)' : 'transparent',
                color: range === key ? 'var(--accent-cyan)' : 'var(--text-tertiary)',
                border: range === key ? '1px solid rgba(0,212,255,0.3)' : '1px solid transparent',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={accentColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={accentColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fill: '#666', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: '#666', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `R$${v.toFixed(0)}`}
            width={56}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="close"
            stroke={accentColor}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4, fill: accentColor, stroke: 'var(--bg)', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
