'use client';

import { DollarSign } from 'lucide-react';
import type { StockData } from '@/lib/valuation';

interface Props {
  stock: StockData;
}

export function DividendsCard({ stock }: Props) {
  const dividends = stock.dividendsData?.cashDividends;

  if (!dividends || dividends.length === 0) return null;

  const recent = dividends.slice(0, 6);

  return (
    <div className="glow-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign size={14} style={{ color: 'var(--accent-cyan)' }} />
        <h3
          className="text-sm uppercase tracking-widest mono"
          style={{ color: 'var(--accent-cyan)' }}
        >
          Últimos Proventos
        </h3>
      </div>

      <div className="space-y-2">
        {recent.map((d, i) => (
          <div
            key={i}
            className="flex items-center justify-between py-2 px-3 rounded-xl"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div>
              <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {d.label || d.relatedTo}
              </div>
              <div className="text-xs mono" style={{ color: 'var(--text-tertiary)' }}>
                Pagamento:{' '}
                {d.paymentDate
                  ? new Date(d.paymentDate).toLocaleDateString('pt-BR')
                  : '—'}
              </div>
            </div>
            <div className="text-right">
              <div
                className="text-sm font-bold mono"
                style={{ color: 'var(--accent-green)' }}
              >
                R$ {d.rate.toFixed(4)}
              </div>
              <div className="text-xs mono" style={{ color: 'var(--text-tertiary)' }}>
                por ação
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
