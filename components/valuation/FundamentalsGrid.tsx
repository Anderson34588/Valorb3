'use client';

import type { StockData } from '@/lib/valuation';

interface Props {
  stock: StockData;
}

function MetricCard({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: 'green' | 'red' | 'yellow' | null;
}) {
  const colors = {
    green: 'var(--accent-green)',
    red: 'var(--accent-red)',
    yellow: 'var(--accent-yellow)',
  };
  const color = highlight ? colors[highlight] : 'var(--text-primary)';

  return (
    <div
      className="p-4 rounded-2xl transition-all duration-300"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div
        className="text-xs uppercase tracking-widest mono mb-1.5"
        style={{ color: 'var(--text-tertiary)' }}
      >
        {label}
      </div>
      <div className="text-xl font-bold mono" style={{ color }}>
        {value}
      </div>
      {hint && (
        <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          {hint}
        </div>
      )}
    </div>
  );
}

function fmtRatio(v: number | undefined | null, decimals = 2): string {
  if (v == null) return '—';
  return v.toFixed(decimals) + 'x';
}

function fmtPct(v: number | undefined | null): string {
  if (v == null) return '—';
  // Values already as decimals (0.15 = 15%) or raw %
  const p = Math.abs(v) > 1 ? v : v * 100;
  return (p >= 0 ? '+' : '') + p.toFixed(2) + '%';
}

function fmtPctPlain(v: number | undefined | null): string {
  if (v == null) return '—';
  const p = Math.abs(v) > 1 ? v : v * 100;
  return p.toFixed(2) + '%';
}

function fmtBRL(v: number | undefined | null): string {
  if (v == null) return '—';
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtBig(v: number | undefined | null): string {
  if (v == null) return '—';
  if (v >= 1e12) return `R$ ${(v / 1e12).toFixed(2)} tri`;
  if (v >= 1e9) return `R$ ${(v / 1e9).toFixed(2)} bi`;
  if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(2)} mi`;
  return `R$ ${v.toFixed(0)}`;
}

function fmtNum(v: number | undefined | null, decimals = 2): string {
  if (v == null) return '—';
  return v.toFixed(decimals);
}

function roe_highlight(roe?: number | null): 'green' | 'red' | null {
  if (roe == null) return null;
  const p = Math.abs(roe) > 1 ? roe : roe * 100;
  if (p >= 15) return 'green';
  if (p < 5) return 'red';
  return null;
}

function pl_highlight(pl?: number | null): 'green' | 'yellow' | 'red' | null {
  if (pl == null) return null;
  if (pl > 0 && pl < 12) return 'green';
  if (pl >= 12 && pl <= 25) return null;
  if (pl > 25) return 'yellow';
  return 'red'; // negative
}

function pct_highlight(v?: number | null, goodAbove = 0.1): 'green' | 'red' | null {
  if (v == null) return null;
  const p = Math.abs(v) > 1 ? v / 100 : v;
  if (p > goodAbove) return 'green';
  if (p < 0) return 'red';
  return null;
}

function growth_highlight(v?: number | null): 'green' | 'red' | 'yellow' | null {
  if (v == null) return null;
  const p = Math.abs(v) > 1 ? v / 100 : v;
  if (p >= 0.1) return 'green';
  if (p < 0) return 'red';
  if (p > 0) return 'yellow';
  return null;
}

function isFII(stock: StockData): boolean {
  return !!(stock.ffoYield || stock.ffoCota || stock.dividendoCota);
}

export function FundamentalsGrid({ stock }: Props) {
  const {
    priceEarnings,
    priceToBook,
    earningsPerShare,
    bookValuePerShareMRQ,
    dividendYield,
    trailingAnnualDividendYield,
    returnOnEquity,
    returnOnAssets,
    profitMargins,
    grossMargins,
    debtToEquity,
    currentRatio,
    enterpriseToEbitda,
    enterpriseToRevenue,
    // Fundamentus extra
    roic,
    ebitMargin,
    revenueGrowth5y,
    evToEbit,
    priceToEbit,
    psr,
    totalRevenue12m,
    netIncome12m,
    totalEquity,
    totalAssets,
    ffoYield,
    ffoCota,
    dividendoCota,
  } = stock;

  const dy = dividendYield ?? trailingAnnualDividendYield;
  const dyPct = dy != null ? (Math.abs(dy) > 1 ? dy : dy * 100) : null;
  const roePct = returnOnEquity != null ? (Math.abs(returnOnEquity) > 1 ? returnOnEquity : returnOnEquity * 100) : null;
  const roaPct = returnOnAssets != null ? (Math.abs(returnOnAssets) > 1 ? returnOnAssets : returnOnAssets * 100) : null;
  const roicPct = roic != null ? (Math.abs(roic) > 1 ? roic : roic * 100) : null;

  const isFii = isFII(stock);

  return (
    <div className="glow-card p-6">
      <h3
        className="text-sm uppercase tracking-widest mono mb-4"
        style={{ color: 'var(--accent-cyan)' }}
      >
        {isFii ? 'Indicadores do FII' : 'Indicadores Fundamentalistas'}
      </h3>

      {isFii ? (
        // ── FII Layout ───────────────────────────────────────────────────────
        <>
          <div className="mb-3">
            <div className="text-xs uppercase tracking-widest mono mb-2" style={{ color: 'var(--text-tertiary)' }}>
              Rendimento & Precificação
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <MetricCard
                label="DY 12m"
                value={dyPct != null ? `${dyPct.toFixed(2)}%` : '—'}
                hint="Dividend Yield anual"
                highlight={dyPct != null ? (dyPct >= 8 ? 'green' : dyPct >= 5 ? null : 'yellow') : null}
              />
              <MetricCard
                label="FFO Yield"
                value={ffoYield != null ? `${(ffoYield * 100).toFixed(2)}%` : '—'}
                hint="FFO / Preço da cota"
                highlight={ffoYield != null ? ((ffoYield * 100) >= 8 ? 'green' : null) : null}
              />
              <MetricCard
                label="Rendimento/Cota"
                value={dividendoCota != null ? fmtBRL(dividendoCota) : '—'}
                hint="Dividendo por cota (12m)"
              />
              <MetricCard
                label="FFO/Cota"
                value={ffoCota != null ? fmtBRL(ffoCota) : '—'}
                hint="Funds From Operations por cota"
              />
              <MetricCard
                label="P/VP"
                value={fmtRatio(priceToBook)}
                hint="Preço / Valor Patrimonial"
                highlight={
                  priceToBook != null
                    ? priceToBook < 1 ? 'green' : priceToBook > 1.2 ? 'yellow' : null
                    : null
                }
              />
            </div>
          </div>
          {(totalRevenue12m || totalEquity || totalAssets) && (
            <div>
              <div className="text-xs uppercase tracking-widest mono mb-2" style={{ color: 'var(--text-tertiary)' }}>
                Patrimônio & Resultados (12m)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {totalRevenue12m && (
                  <MetricCard label="Receita" value={fmtBig(totalRevenue12m)} hint="Receita líquida 12m" />
                )}
                {totalEquity && (
                  <MetricCard label="Patrim. Líquido" value={fmtBig(totalEquity)} hint="Valor patrimonial total" />
                )}
                {totalAssets && (
                  <MetricCard label="Total de Ativos" value={fmtBig(totalAssets)} hint="Valor total dos ativos" />
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        // ── Stock Layout ─────────────────────────────────────────────────────
        <>
          {/* Valuation multiples */}
          <div className="mb-3">
            <div className="text-xs uppercase tracking-widest mono mb-2" style={{ color: 'var(--text-tertiary)' }}>
              Múltiplos de Valuation
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <MetricCard
                label="P/L"
                value={fmtRatio(priceEarnings)}
                hint="Preço / Lucro"
                highlight={pl_highlight(priceEarnings)}
              />
              <MetricCard
                label="P/VP"
                value={fmtRatio(priceToBook)}
                hint="Preço / Valor Patrimonial"
                highlight={
                  priceToBook != null
                    ? priceToBook < 1 ? 'green' : priceToBook > 3 ? 'yellow' : null
                    : null
                }
              />
              <MetricCard
                label="EV/EBITDA"
                value={fmtRatio(enterpriseToEbitda)}
                hint="Enterprise Value / EBITDA"
                highlight={
                  enterpriseToEbitda != null
                    ? enterpriseToEbitda < 8 ? 'green' : enterpriseToEbitda > 20 ? 'yellow' : null
                    : null
                }
              />
              {evToEbit && (
                <MetricCard
                  label="EV/EBIT"
                  value={fmtRatio(evToEbit)}
                  hint="Enterprise Value / EBIT"
                  highlight={evToEbit < 10 ? 'green' : evToEbit > 25 ? 'yellow' : null}
                />
              )}
              {priceToEbit && (
                <MetricCard label="P/EBIT" value={fmtRatio(priceToEbit)} hint="Preço / EBIT" />
              )}
              {psr && (
                <MetricCard
                  label="P/Receita"
                  value={fmtRatio(psr)}
                  hint="Preço / Receita (PSR)"
                />
              )}
            </div>
          </div>

          {/* Per share */}
          <div className="mb-3">
            <div className="text-xs uppercase tracking-widest mono mb-2" style={{ color: 'var(--text-tertiary)' }}>
              Por Ação
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <MetricCard
                label="LPA"
                value={earningsPerShare != null ? `R$ ${fmtNum(earningsPerShare)}` : '—'}
                hint="Lucro por Ação"
                highlight={earningsPerShare != null ? (earningsPerShare > 0 ? 'green' : 'red') : null}
              />
              <MetricCard
                label="VPA"
                value={bookValuePerShareMRQ != null ? `R$ ${fmtNum(bookValuePerShareMRQ)}` : '—'}
                hint="Valor Patrimonial / Ação"
              />
              <MetricCard
                label="DY"
                value={dyPct != null ? `${dyPct.toFixed(2)}%` : '—'}
                hint="Dividend Yield anual"
                highlight={dyPct != null ? (dyPct >= 6 ? 'green' : dyPct >= 3 ? null : 'yellow') : null}
              />
            </div>
          </div>

          {/* Profitability */}
          <div className="mb-3">
            <div className="text-xs uppercase tracking-widest mono mb-2" style={{ color: 'var(--text-tertiary)' }}>
              Rentabilidade
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <MetricCard
                label="ROE"
                value={roePct != null ? `${roePct.toFixed(2)}%` : '—'}
                hint="Retorno s/ Patrimônio"
                highlight={roe_highlight(returnOnEquity)}
              />
              {roaPct != null && (
                <MetricCard
                  label="ROA"
                  value={`${roaPct.toFixed(2)}%`}
                  hint="Retorno s/ Ativos"
                  highlight={roaPct >= 5 ? 'green' : roaPct < 0 ? 'red' : null}
                />
              )}
              {roicPct != null && (
                <MetricCard
                  label="ROIC"
                  value={`${roicPct.toFixed(2)}%`}
                  hint="Retorno s/ Capital Investido"
                  highlight={roicPct >= 15 ? 'green' : roicPct < 5 ? 'red' : null}
                />
              )}
              {grossMargins != null && (
                <MetricCard
                  label="Margem Bruta"
                  value={fmtPctPlain(grossMargins)}
                  hint="Lucro bruto / Receita"
                  highlight={pct_highlight(grossMargins, 0.25)}
                />
              )}
              {ebitMargin != null && (
                <MetricCard
                  label="Margem EBIT"
                  value={fmtPctPlain(ebitMargin)}
                  hint="EBIT / Receita"
                  highlight={pct_highlight(ebitMargin, 0.1)}
                />
              )}
              {profitMargins != null && (
                <MetricCard
                  label="Margem Líquida"
                  value={fmtPctPlain(profitMargins)}
                  hint="Lucro líquido / Receita"
                  highlight={pct_highlight(profitMargins, 0.1)}
                />
              )}
              {revenueGrowth5y != null && (
                <MetricCard
                  label="Cres. Receita 5a"
                  value={fmtPct(revenueGrowth5y)}
                  hint="Crescimento médio anual (5 anos)"
                  highlight={growth_highlight(revenueGrowth5y)}
                />
              )}
            </div>
          </div>

          {/* Debt */}
          <div className="mb-3">
            <div className="text-xs uppercase tracking-widest mono mb-2" style={{ color: 'var(--text-tertiary)' }}>
              Endividamento / Liquidez
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <MetricCard
                label="Dívida/PL"
                value={debtToEquity != null ? fmtRatio(debtToEquity) : '—'}
                hint="Dívida Líquida / Patrimônio"
                highlight={
                  debtToEquity != null
                    ? debtToEquity < 0 ? 'green' : debtToEquity < 0.5 ? 'green' : debtToEquity > 2 ? 'red' : 'yellow'
                    : null
                }
              />
              {currentRatio != null && (
                <MetricCard
                  label="Liquidez Corrente"
                  value={fmtRatio(currentRatio)}
                  hint="Ativo Circ. / Passivo Circ."
                  highlight={currentRatio > 1.5 ? 'green' : currentRatio < 1 ? 'red' : null}
                />
              )}
            </div>
          </div>

          {/* Resultados financeiros */}
          {(totalRevenue12m || netIncome12m || totalEquity || totalAssets) && (
            <div>
              <div className="text-xs uppercase tracking-widest mono mb-2" style={{ color: 'var(--text-tertiary)' }}>
                Resultados Financeiros (12m)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {totalRevenue12m && (
                  <MetricCard label="Receita Líquida" value={fmtBig(totalRevenue12m)} hint="Últimos 12 meses" />
                )}
                {netIncome12m && (
                  <MetricCard
                    label="Lucro Líquido"
                    value={fmtBig(netIncome12m)}
                    hint="Últimos 12 meses"
                    highlight={netIncome12m > 0 ? 'green' : 'red'}
                  />
                )}
                {totalEquity && (
                  <MetricCard label="Patrim. Líquido" value={fmtBig(totalEquity)} hint="Valor contábil" />
                )}
                {totalAssets && (
                  <MetricCard label="Total de Ativos" value={fmtBig(totalAssets)} hint="Ativo total" />
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
