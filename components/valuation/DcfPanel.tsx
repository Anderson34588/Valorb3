'use client';

import { useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Settings2, ChevronDown, ChevronUp, Info } from 'lucide-react';
import type { DcfResult, DcfParams, StockData } from '@/lib/valuation';
import { DEFAULT_DCF_PARAMS, dcfValuation } from '@/lib/valuation';
import { formatCurrency } from '@/lib/valuation';

interface Props {
  stock: StockData;
  initialDcf: DcfResult;
}

const VERDICT_CONFIG = {
  subavaliada: { label: 'Subavaliada', color: 'var(--accent-green)', bg: 'rgba(0,255,136,0.08)', border: 'rgba(0,255,136,0.3)' },
  sobreavaliada: { label: 'Sobreavaliada', color: 'var(--accent-red)', bg: 'rgba(255,69,96,0.08)', border: 'rgba(255,69,96,0.3)' },
  justa: { label: 'Preço Justo', color: 'var(--accent-yellow)', bg: 'rgba(255,215,0,0.08)', border: 'rgba(255,215,0,0.3)' },
  indefinido: { label: 'Indefinido', color: 'var(--text-tertiary)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)' },
};

function Slider({
  label,
  hint,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div>
          <span className="text-xs font-semibold mono" style={{ color: 'var(--text-secondary)' }}>
            {label}
          </span>
          <span className="text-xs ml-1.5" style={{ color: 'var(--text-tertiary)' }}>
            {hint}
          </span>
        </div>
        <span
          className="text-sm font-bold mono px-2 py-0.5 rounded-lg"
          style={{ background: 'rgba(0,212,255,0.1)', color: 'var(--accent-cyan)' }}
        >
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, var(--accent-cyan) 0%, var(--accent-cyan) ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.12) ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.12) 100%)`,
          outline: 'none',
        }}
      />
      <div className="flex justify-between mt-0.5">
        <span className="text-xs mono" style={{ color: 'var(--text-tertiary)' }}>{min}{unit}</span>
        <span className="text-xs mono" style={{ color: 'var(--text-tertiary)' }}>{max}{unit}</span>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-xl text-sm"
      style={{ background: 'var(--card-hover)', border: '1px solid var(--border-hover)', color: 'var(--text-primary)' }}
    >
      <div className="mono text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>{label}</div>
      {payload.map((p: { name: string; value: number; color: string }, i: number) => (
        <div key={i} className="mono font-bold" style={{ color: p.color }}>
          {p.name}: R$ {p.value.toFixed(2)}
        </div>
      ))}
    </div>
  );
}

export function DcfPanel({ stock, initialDcf }: Props) {
  const [params, setParams] = useState<DcfParams>(initialDcf.params ?? DEFAULT_DCF_PARAMS);
  const [showSettings, setShowSettings] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const result: DcfResult = useCallback(
    () => dcfValuation(stock, params),
    [stock, params]
  )();

  const cfg = VERDICT_CONFIG[result.verdict] ?? VERDICT_CONFIG.indefinido;
  const price = stock.regularMarketPrice;

  // Chart data: PV of each year + TV bar
  const chartData = result.presentValues.map((pv, i) => ({
    year: `Ano ${i + 1}`,
    pv: Math.round(pv * 100) / 100,
  }));
  if (result.pvTerminalValue) {
    chartData.push({ year: 'Valor Terminal', pv: Math.round(result.pvTerminalValue * 100) / 100 });
  }

  const pvTotal = result.pvSum ?? 0;
  const terminalShare =
    result.pvTerminalValue != null && pvTotal > 0
      ? Math.round((result.pvTerminalValue / pvTotal) * 1000) / 10
      : null;

  const setParam = (key: keyof DcfParams) => (v: number) =>
    setParams((prev) => ({ ...prev, [key]: v }));

  return (
    <div className="glow-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm uppercase tracking-widest mono" style={{ color: 'var(--accent-cyan)' }}>
            Fluxo de Caixa Descontado
          </h3>
          <span
            className="text-xs mono px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(0,212,255,0.08)', color: 'var(--accent-cyan)', border: '1px solid rgba(0,212,255,0.2)' }}
          >
            FCD / DCF
          </span>
        </div>
        <button
          onClick={() => setShowSettings((s) => !s)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200"
          style={{
            background: showSettings ? 'rgba(0,212,255,0.12)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${showSettings ? 'rgba(0,212,255,0.4)' : 'var(--border-subtle)'}`,
            color: showSettings ? 'var(--accent-cyan)' : 'var(--text-secondary)',
          }}
        >
          <Settings2 size={13} />
          Premissas
          {showSettings ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div
          className="mb-5 p-4 rounded-2xl space-y-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Info size={13} style={{ color: 'var(--accent-cyan)' }} />
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Ajuste as premissas e o preço justo é recalculado em tempo real.
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Slider
              label="Crescimento (Anos 1–5)"
              hint="fase de alto crescimento"
              value={params.growthRate1}
              min={-10}
              max={40}
              step={0.5}
              unit="%"
              onChange={setParam('growthRate1')}
            />
            <Slider
              label="Crescimento (Anos 6–10)"
              hint="fase de maturidade"
              value={params.growthRate2}
              min={-5}
              max={25}
              step={0.5}
              unit="%"
              onChange={setParam('growthRate2')}
            />
            <Slider
              label="Crescimento Terminal"
              hint="perpetuidade (g∞)"
              value={params.terminalGrowth}
              min={0}
              max={8}
              step={0.25}
              unit="%"
              onChange={setParam('terminalGrowth')}
            />
            <Slider
              label="WACC"
              hint="custo médio de capital"
              value={params.wacc}
              min={5}
              max={30}
              step={0.5}
              unit="%"
              onChange={setParam('wacc')}
            />
          </div>
          <button
            onClick={() => setParams(DEFAULT_DCF_PARAMS)}
            className="text-xs mono transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-tertiary)' }}
          >
            ↺ Restaurar padrões
          </button>
        </div>
      )}

      {result.verdict === 'indefinido' ? (
        /* No data */
        <div
          className="flex items-center justify-center h-32 rounded-2xl text-sm"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)' }}
        >
          {result.description}
        </div>
      ) : (
        <>
          {/* Verdict + fair price */}
          <div
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl mb-5"
            style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
          >
            <div>
              <div className="text-xs uppercase tracking-widest mono mb-1" style={{ color: 'var(--text-tertiary)' }}>
                Preço justo pelo FCD
              </div>
              <div className="text-3xl font-bold mono" style={{ color: cfg.color }}>
                {result.fairPrice != null ? formatCurrency(result.fairPrice) : '—'}
              </div>
              {result.upside != null && (
                <div className="text-sm font-semibold mono mt-1" style={{ color: cfg.color }}>
                  {result.upside >= 0 ? '+' : ''}{result.upside.toFixed(1)}% vs preço atual ({formatCurrency(price)})
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-widest mono mb-1" style={{ color: 'var(--text-tertiary)' }}>
                Veredicto
              </div>
              <div className="text-lg font-bold" style={{ color: cfg.color }}>
                {cfg.label}
              </div>
              {terminalShare != null && (
                <div className="text-xs mono mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  {terminalShare}% do valor = Valor Terminal
                </div>
              )}
            </div>
          </div>

          {/* Decomposition summary */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              {
                label: 'VPL Fluxos (1–10)',
                value: result.pvTerminalValue != null && result.pvSum != null
                  ? formatCurrency(result.pvSum - result.pvTerminalValue)
                  : '—',
                color: 'var(--accent-cyan)',
              },
              {
                label: 'VP Valor Terminal',
                value: result.pvTerminalValue != null ? formatCurrency(result.pvTerminalValue) : '—',
                color: 'var(--accent-green)',
              },
              {
                label: 'LPA Base (proxy)',
                value: result.baseFcfe != null ? `R$ ${result.baseFcfe.toFixed(2)}` : '—',
                color: 'var(--text-secondary)',
              },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="p-3 rounded-xl text-center"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}
              >
                <div className="text-xs mono mb-1" style={{ color: 'var(--text-tertiary)' }}>{label}</div>
                <div className="text-sm font-bold mono" style={{ color }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Bar chart of PV by year */}
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="year"
                tick={{ fill: '#666', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                axisLine={false}
                tickLine={false}
                interval={0}
              />
              <YAxis
                tick={{ fill: '#666', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `R$${v.toFixed(1)}`}
                width={52}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="pv" name="VP" radius={[4, 4, 0, 0]}>
                {chartData.map((_, index) => (
                  <Cell
                    key={index}
                    fill={index === chartData.length - 1 ? '#00ff88' : '#00d4ff'}
                    fillOpacity={0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 justify-end">
            <div className="flex items-center gap-1.5 text-xs mono" style={{ color: 'var(--text-tertiary)' }}>
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#00d4ff' }} />
              VPL Fluxos anuais
            </div>
            <div className="flex items-center gap-1.5 text-xs mono" style={{ color: 'var(--text-tertiary)' }}>
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#00ff88' }} />
              VP Valor Terminal
            </div>
          </div>

          {/* Projection table toggle */}
          <button
            onClick={() => setShowTable((s) => !s)}
            className="flex items-center gap-1.5 text-xs mono mt-4 transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {showTable ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {showTable ? 'Ocultar' : 'Ver'} tabela de projeção detalhada
          </button>

          {showTable && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs mono" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {['Ano', 'Taxa', 'FCF/ação', 'VP (FCF)'].map((h) => (
                      <th
                        key={h}
                        className="text-left pb-2 pr-4 uppercase tracking-widest"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.projectedFcfe.map((fcfe, i) => {
                    const isFirstHalf = i < Math.floor(params.projectionYears / 2);
                    return (
                      <tr
                        key={i}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      >
                        <td className="py-1.5 pr-4" style={{ color: 'var(--text-tertiary)' }}>{i + 1}</td>
                        <td className="py-1.5 pr-4" style={{ color: isFirstHalf ? 'var(--accent-cyan)' : 'var(--accent-green)' }}>
                          {isFirstHalf ? params.growthRate1 : params.growthRate2}%
                        </td>
                        <td className="py-1.5 pr-4" style={{ color: 'var(--text-secondary)' }}>
                          R$ {fcfe.toFixed(4)}
                        </td>
                        <td className="py-1.5" style={{ color: 'var(--text-primary)' }}>
                          R$ {result.presentValues[i]?.toFixed(4) ?? '—'}
                        </td>
                      </tr>
                    );
                  })}
                  <tr style={{ borderTop: '1px solid rgba(0,212,255,0.2)' }}>
                    <td className="py-2 pr-4 font-semibold" style={{ color: 'var(--accent-green)' }}>TV</td>
                    <td className="py-2 pr-4" style={{ color: 'var(--accent-green)' }}>{params.terminalGrowth}% ∞</td>
                    <td className="py-2 pr-4" style={{ color: 'var(--accent-green)' }}>
                      R$ {result.terminalValue?.toFixed(2) ?? '—'}
                    </td>
                    <td className="py-2 font-bold" style={{ color: 'var(--accent-green)' }}>
                      R$ {result.pvTerminalValue?.toFixed(2) ?? '—'}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="pt-2 font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                      Preço Justo Total
                    </td>
                    <td className="pt-2 font-bold text-sm" style={{ color: cfg.color }}>
                      {formatCurrency(result.fairPrice)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <p
        className="text-xs mt-4 p-3 rounded-xl"
        style={{
          color: 'var(--text-tertiary)',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border-subtle)',
          lineHeight: 1.6,
        }}
      >
        <strong style={{ color: 'var(--text-secondary)' }}>Nota metodológica:</strong> O FCD usa o LPA (lucro por ação) como proxy do fluxo de caixa livre por ação,
        projetado em dois estágios de crescimento. O valor terminal usa o modelo de Gordon Growth.
        Resultados são sensíveis às premissas — ajuste o WACC e as taxas de crescimento para refletir sua visão.
      </p>
    </div>
  );
}
