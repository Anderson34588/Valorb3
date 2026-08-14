'use client';

import { CheckCircle, AlertTriangle, TrendingDown, HelpCircle } from 'lucide-react';
import type { ValuationResult } from '@/lib/valuation';
import { formatCurrency } from '@/lib/valuation';

interface Props {
  result: ValuationResult;
  currentPrice: number;
}

const VERDICT_CONFIG = {
  subavaliada: {
    label: 'Subavaliada',
    color: 'var(--accent-green)',
    bg: 'rgba(0,255,136,0.08)',
    border: 'rgba(0,255,136,0.3)',
    Icon: CheckCircle,
    description: 'O preço atual está abaixo do valor justo estimado.',
  },
  sobreavaliada: {
    label: 'Sobreavaliada',
    color: 'var(--accent-red)',
    bg: 'rgba(255,69,96,0.08)',
    border: 'rgba(255,69,96,0.3)',
    Icon: TrendingDown,
    description: 'O preço atual está acima do valor justo estimado.',
  },
  justa: {
    label: 'Preço Justo',
    color: 'var(--accent-yellow)',
    bg: 'rgba(255,215,0,0.08)',
    border: 'rgba(255,215,0,0.3)',
    Icon: AlertTriangle,
    description: 'O preço atual está próximo do valor justo estimado.',
  },
  indefinido: {
    label: 'Indefinido',
    color: 'var(--text-tertiary)',
    bg: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.1)',
    Icon: HelpCircle,
    description: 'Dados insuficientes para calcular o valuation.',
  },
};

function MethodCard({
  method,
  description,
  fairPrice,
  upside,
  verdict,
}: {
  method: string;
  description: string;
  fairPrice: number | null;
  upside: number | null;
  verdict: string;
}) {
  const config = VERDICT_CONFIG[verdict as keyof typeof VERDICT_CONFIG] ?? VERDICT_CONFIG.indefinido;
  const { Icon } = config;

  return (
    <div
      className="p-4 rounded-2xl transition-all duration-300"
      style={{
        background: config.bg,
        border: `1px solid ${config.border}`,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-xs uppercase tracking-widest mono font-semibold"
          style={{ color: config.color }}
        >
          {method}
        </span>
        <Icon size={14} style={{ color: config.color }} />
      </div>
      <div className="text-xl font-bold mono mb-1" style={{ color: 'var(--text-primary)' }}>
        {fairPrice != null ? formatCurrency(fairPrice) : '—'}
      </div>
      {upside != null && (
        <div className="text-sm font-semibold mono mb-2" style={{ color: config.color }}>
          {upside >= 0 ? '+' : ''}{upside.toFixed(1)}% upside
        </div>
      )}
      <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
        {description}
      </div>
    </div>
  );
}

export function ValuationPanel({ result, currentPrice }: Props) {
  const { bazin, graham, multiple, consensus } = result;
  const cfg = VERDICT_CONFIG[consensus.verdict] ?? VERDICT_CONFIG.indefinido;
  const { Icon } = cfg;

  return (
    <div className="glow-card p-6">
      <h3
        className="text-sm uppercase tracking-widest mono mb-4"
        style={{ color: 'var(--accent-cyan)' }}
      >
        Valuation
      </h3>

      {/* Consensus badge */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl mb-6"
        style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
          >
            <Icon size={20} style={{ color: cfg.color }} />
          </div>
          <div>
            <div
              className="text-xs uppercase tracking-widest mono"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Consenso dos modelos
            </div>
            <div className="text-lg font-bold" style={{ color: cfg.color }}>
              {cfg.label}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {cfg.description}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div
            className="text-xs uppercase tracking-widest mono mb-1"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Preço Justo Médio
          </div>
          <div className="text-2xl font-bold mono" style={{ color: cfg.color }}>
            {consensus.fairPriceAvg != null ? formatCurrency(consensus.fairPriceAvg) : '—'}
          </div>
          {consensus.upside != null && (
            <div className="text-sm mono" style={{ color: cfg.color }}>
              {consensus.upside >= 0 ? '+' : ''}{consensus.upside.toFixed(1)}% vs atual (
              {formatCurrency(currentPrice)})
            </div>
          )}
        </div>
      </div>

      {/* Method cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MethodCard
          method={bazin.method}
          description={bazin.description}
          fairPrice={bazin.fairPrice}
          upside={bazin.upside}
          verdict={bazin.verdict}
        />
        <MethodCard
          method={graham.method}
          description={graham.description}
          fairPrice={graham.fairPrice}
          upside={graham.upside}
          verdict={graham.verdict}
        />
        <MethodCard
          method={multiple.method}
          description={multiple.description}
          fairPrice={multiple.fairPrice}
          upside={multiple.upside}
          verdict={multiple.verdict}
        />
        {result.dcf && result.dcf.verdict !== 'indefinido' && (
          <MethodCard
            method={result.dcf.method}
            description={result.dcf.description}
            fairPrice={result.dcf.fairPrice}
            upside={result.dcf.upside}
            verdict={result.dcf.verdict}
          />
        )}
      </div>

      <p
        className="text-xs mt-4 p-3 rounded-xl"
        style={{
          color: 'var(--text-tertiary)',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border-subtle)',
          lineHeight: 1.6,
        }}
      >
        ⚠️ Este valuation é apenas educacional e não constitui recomendação de investimento.
        Os modelos utilizam dados históricos e premissas simplificadas. Consulte um assessor financeiro
        antes de tomar decisões de investimento.
      </p>
    </div>
  );
}
