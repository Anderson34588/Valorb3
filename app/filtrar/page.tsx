'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart2, ChevronUp, ChevronDown, ChevronsUpDown,
  SlidersHorizontal, X, Search, TrendingUp, TrendingDown, Minus, RefreshCw
} from 'lucide-react';
import { AuthButton } from '@/components/AuthButton';
import { WatchlistButton } from '@/components/WatchlistButton';
import { useSubscription } from '@/hooks/useSubscription';

// ── Types ─────────────────────────────────────────────────────
interface ScreenerRow {
  ticker: string;
  name?: string | null;
  sector?: string | null;
  type?: string | null;
  price?: number | null;
  changePct?: number | null;
  marketCap?: number | null;
  pl?: number | null;
  pvp?: number | null;
  dy?: number | null;
  roe?: number | null;
  roic?: number | null;
  evEbitda?: number | null;
  netMargin?: number | null;
  debtEquity?: number | null;
}

interface Filters {
  q: string;
  type: string;
  sector: string;
  pl_min: string; pl_max: string;
  pvp_min: string; pvp_max: string;
  dy_min: string;
  roe_min: string;
  roic_min: string;
  ev_ebitda_max: string;
  net_margin_min: string;
  debt_equity_max: string;
}

const DEFAULT_FILTERS: Filters = {
  q: '', type: '', sector: '',
  pl_min: '', pl_max: '', pvp_min: '', pvp_max: '',
  dy_min: '', roe_min: '', roic_min: '',
  ev_ebitda_max: '', net_margin_min: '', debt_equity_max: '',
};

// ── Filtros rápidos pré-definidos ─────────────────────────────
const FILTROS_RAPIDOS = [
  { label: 'Dividendo ≥ 6%', icon: '💰', filters: { dy_min: '6' } },
  { label: 'Ação Barata (Bazin)', icon: '📊', filters: { dy_min: '6', pl_max: '15', pvp_max: '3' } },
  { label: 'Rentável (ROE ≥ 15%)', icon: '💎', filters: { roe_min: '15' } },
  { label: 'Preço Baixo (P/L < 10)', icon: '🔍', filters: { pl_max: '10' } },
  { label: 'Fundos Imobiliários', icon: '🏢', filters: { type: 'fii' } },
  { label: 'ETFs', icon: '📈', filters: { type: 'etf' } },
];

type SortKey = keyof ScreenerRow;

// ── Formatadores ──────────────────────────────────────────────
const fmt = {
  pct: (v: number | null | undefined) => v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(2)}%`,
  brl: (v: number | null | undefined) => v == null ? '—' : `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  num: (v: number | null | undefined, dec = 2) => v == null ? '—' : v.toFixed(dec),
  cap: (v: number | null | undefined) => {
    if (v == null) return '—';
    if (v >= 1e12) return `R$ ${(v / 1e12).toFixed(1)}T`;
    if (v >= 1e9)  return `R$ ${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6)  return `R$ ${(v / 1e6).toFixed(0)}M`;
    return `R$ ${v.toFixed(0)}`;
  },
};

function numColor(v: number | null | undefined, goodPositive = true): string {
  if (v == null) return 'var(--text-tertiary)';
  if (goodPositive) return v > 0 ? 'var(--accent-green)' : v < 0 ? 'var(--accent-red)' : 'var(--text-secondary)';
  return v < 0 ? 'var(--accent-green)' : v > 0 ? 'var(--accent-red)' : 'var(--text-secondary)';
}

function tipoLabel(t?: string | null) {
  if (t === 'fii') return { label: 'FII', color: 'rgba(168,85,247,0.2)', text: '#c084fc' };
  if (t === 'etf') return { label: 'ETF', color: 'rgba(251,191,36,0.2)', text: '#fbbf24' };
  if (t === 'bdr') return { label: 'BDR', color: 'rgba(251,113,133,0.2)', text: '#fb7185' };
  return { label: 'AÇÃO', color: 'rgba(0,212,255,0.15)', text: 'var(--accent-cyan)' };
}

// ── Componente principal ──────────────────────────────────────
export default function FiltrarAcoesPage() {
  const router = useRouter();
  const { pro, loading: subLoading } = useSubscription();

  const [rows, setRows] = useState<ScreenerRow[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sortKey, setSortKey] = useState<SortKey>('dy');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

  // Redireciona para /planos se não for Pro
  useEffect(() => {
    if (!subLoading && !pro) {
      router.replace('/planos?motivo=pro');
    }
  }, [pro, subLoading, router]);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const buildQuery = useCallback((f: Filters, sk: SortKey, sd: string) => {
    const p = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => { if (v) p.set(k, v); });
    p.set('sort', sk as string);
    p.set('dir', sd);
    return p.toString();
  }, []);

  const fetchData = useCallback(async (f: Filters, sk: SortKey, sd: string, quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch(`/api/screener?${buildQuery(f, sk, sd)}`);
      const data = await res.json();
      setRows(data.rows ?? []);
      setSectors(data.sectors ?? []);
    } catch {
      // mantém os dados atuais
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [buildQuery]);

  // Carregamento inicial
  useEffect(() => { fetchData(filters, sortKey, sortDir); }, []); // eslint-disable-line

  const handleFilterChange = (key: keyof Filters, value: string) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    clearTimeout(debounceRef.current ?? undefined);
    debounceRef.current = setTimeout(() => fetchData(next, sortKey, sortDir, true), 400);
  };

  const handleSort = (key: SortKey) => {
    const newDir = key === sortKey && sortDir === 'desc' ? 'asc' : 'desc';
    setSortKey(key);
    setSortDir(newDir);
    fetchData(filters, key, newDir, true);
  };

  const aplicarFiltroRapido = (preset: typeof FILTROS_RAPIDOS[0]) => {
    const next = { ...DEFAULT_FILTERS, ...preset.filters };
    setFilters(next);
    fetchData(next, sortKey, sortDir);
  };

  const limparFiltros = () => {
    setFilters(DEFAULT_FILTERS);
    fetchData(DEFAULT_FILTERS, sortKey, sortDir);
  };

  const qtdFiltrosAtivos = Object.entries(filters).filter(([, v]) => v !== '').length;

  // ── Colunas da tabela ──────────────────────────────────────
  const colunas: { key: SortKey; label: string; title: string }[] = [
    { key: 'ticker',    label: 'Ticker',        title: 'Código do ativo' },
    { key: 'price',     label: 'Cotação',        title: 'Preço atual' },
    { key: 'changePct', label: 'Variação',       title: 'Variação do dia' },
    { key: 'marketCap', label: 'Val. Mercado',   title: 'Valor de Mercado' },
    { key: 'pl',        label: 'P/L',            title: 'Preço dividido pelo Lucro por ação' },
    { key: 'pvp',       label: 'P/VP',           title: 'Preço dividido pelo Valor Patrimonial' },
    { key: 'dy',        label: 'Div. Yield',     title: 'Rendimento de Dividendos (% ao ano)' },
    { key: 'roe',       label: 'ROE %',          title: 'Retorno sobre o Patrimônio (ROE)' },
    { key: 'roic',      label: 'ROIC %',         title: 'Retorno sobre Capital Investido' },
    { key: 'evEbitda',  label: 'EV/EBITDA',      title: 'Valor da Empresa / EBITDA' },
    { key: 'netMargin', label: 'Marg. Líquida',  title: 'Margem Líquida (lucro / receita)' },
    { key: 'debtEquity',label: 'Dívida/PL',      title: 'Relação Dívida / Patrimônio Líquido' },
  ];

  function IconeOrdenacao({ col }: { col: SortKey }) {
    if (col !== sortKey) return <ChevronsUpDown size={11} style={{ opacity: 0.35 }} />;
    return sortDir === 'asc'
      ? <ChevronUp size={11} style={{ color: 'var(--accent-cyan)' }} />
      : <ChevronDown size={11} style={{ color: 'var(--accent-cyan)' }} />;
  }

  // ── Renderização ───────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>

      {/* Cabeçalho */}
      <header
        className="sticky top-0 z-50 w-full"
        style={{ background: 'rgba(5,5,5,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--gradient-accent)' }}>
                <BarChart2 size={14} color="#050505" strokeWidth={2.5} />
              </div>
              <span className="font-bold text-sm hidden sm:block" style={{ letterSpacing: '-0.02em' }}>
                <span className="gradient-text">Valor</span><span>B3</span>
              </span>
            </Link>
            <span style={{ color: 'var(--border-subtle)' }}>/</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Filtrar Ações</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/minha-lista" className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full hover:opacity-80 transition-opacity"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
              Minha Lista
            </Link>
            <AuthButton />
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto w-full px-4 sm:px-6 py-6 pb-20">

        {/* Título */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold" style={{ letterSpacing: '-0.03em' }}>
              <span className="gradient-text">Filtrar</span> Ações da B3
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              {loading ? 'Carregando ativos…' : `${rows.length} ativo${rows.length !== 1 ? 's' : ''} encontrado${rows.length !== 1 ? 's' : ''}`}
              {refreshing && <span className="ml-2 text-xs" style={{ color: 'var(--accent-cyan)' }}>atualizando…</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchData(filters, sortKey, sortDir)}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl hover:opacity-80 transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)' }}
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              Atualizar
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-medium hover:opacity-80 transition-all"
              style={
                qtdFiltrosAtivos
                  ? { background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.3)', color: 'var(--accent-cyan)' }
                  : { background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }
              }
            >
              <SlidersHorizontal size={13} />
              Filtros {qtdFiltrosAtivos > 0 && `(${qtdFiltrosAtivos})`}
            </button>
            {qtdFiltrosAtivos > 0 && (
              <button onClick={limparFiltros} className="p-2 rounded-xl hover:opacity-80 transition-all"
                style={{ background: 'rgba(255,69,96,0.08)', border: '1px solid rgba(255,69,96,0.2)', color: 'var(--accent-red)' }}>
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Filtros rápidos */}
        <div className="flex flex-wrap gap-2 mb-4">
          {FILTROS_RAPIDOS.map((p) => (
            <button
              key={p.label}
              onClick={() => aplicarFiltroRapido(p)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium hover:opacity-80 transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
            >
              {p.icon} {p.label}
            </button>
          ))}
        </div>

        {/* Painel de filtros */}
        {showFilters && (
          <div className="mb-5 rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border-subtle)' }}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {/* Busca */}
              <div className="col-span-2 sm:col-span-3 lg:col-span-4">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
                  <input
                    type="text"
                    placeholder="Buscar por ticker ou nome da empresa…"
                    value={filters.q}
                    onChange={(e) => handleFilterChange('q', e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
              <FiltroSelect label="Tipo de ativo" value={filters.type} onChange={(v) => handleFilterChange('type', v)}
                options={[{ v: '', l: 'Todos' }, { v: 'stock', l: 'Ações' }, { v: 'fii', l: 'Fundos Imobiliários (FIIs)' }, { v: 'etf', l: 'ETFs' }]}
              />
              <FiltroSelect label="Setor" value={filters.sector} onChange={(v) => handleFilterChange('sector', v)}
                options={[{ v: '', l: 'Todos os setores' }, ...sectors.map((s) => ({ v: s!, l: s! }))]}
              />
              <FiltroIntervalo label="P/L (Preço / Lucro)" minKey="pl_min" maxKey="pl_max" filters={filters} onChange={handleFilterChange} />
              <FiltroIntervalo label="P/VP (Preço / Patrimônio)" minKey="pvp_min" maxKey="pvp_max" filters={filters} onChange={handleFilterChange} />
              <FiltroNumero label="Dividendo mínimo (%)" filterKey="dy_min" filters={filters} onChange={handleFilterChange} placeholder="ex: 6" />
              <FiltroNumero label="ROE mínimo (%)" filterKey="roe_min" filters={filters} onChange={handleFilterChange} placeholder="ex: 15" />
              <FiltroNumero label="ROIC mínimo (%)" filterKey="roic_min" filters={filters} onChange={handleFilterChange} placeholder="ex: 10" />
              <FiltroNumero label="EV/EBITDA máximo" filterKey="ev_ebitda_max" filters={filters} onChange={handleFilterChange} placeholder="ex: 8" />
              <FiltroNumero label="Margem Líquida mín. (%)" filterKey="net_margin_min" filters={filters} onChange={handleFilterChange} placeholder="ex: 10" />
              <FiltroNumero label="Dívida/PL máximo" filterKey="debt_equity_max" filters={filters} onChange={handleFilterChange} placeholder="ex: 1.5" />
            </div>
          </div>
        )}

        {/* Tabela */}
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
                  {colunas.map((col) => (
                    <th
                      key={col.key as string}
                      title={col.title}
                      onClick={() => handleSort(col.key)}
                      className="px-3 py-3 text-left whitespace-nowrap cursor-pointer select-none hover:opacity-80 transition-opacity"
                      style={{ color: sortKey === col.key ? 'var(--accent-cyan)' : 'var(--text-tertiary)', fontWeight: 600 }}
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        <IconeOrdenacao col={col.key} />
                      </div>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-right whitespace-nowrap" style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>
                    Ver
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      {Array.from({ length: 13 }).map((_, j) => (
                        <td key={j} className="px-3 py-3">
                          <div className="h-3 rounded animate-pulse" style={{ background: 'var(--surface)', width: j === 0 ? '60px' : '40px' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-6 py-12 text-center" style={{ color: 'var(--text-tertiary)' }}>
                      Nenhum ativo encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const tl = tipoLabel(row.type);
                    const isUp = (row.changePct ?? 0) > 0;
                    const isDown = (row.changePct ?? 0) < 0;
                    return (
                      <tr key={row.ticker} className="group hover:bg-white/[0.02] transition-colors"
                        style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        {/* Ticker */}
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <Link href={`/acao/${row.ticker}`} className="font-bold mono hover:opacity-70 transition-opacity" style={{ color: 'var(--text-primary)' }}>
                              {row.ticker}
                            </Link>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold" style={{ background: tl.color, color: tl.text }}>
                              {tl.label}
                            </span>
                          </div>
                          {row.name && (
                            <p className="text-[11px] truncate max-w-[120px]" style={{ color: 'var(--text-tertiary)' }}>{row.name}</p>
                          )}
                        </td>
                        {/* Cotação */}
                        <td className="px-3 py-2.5 mono font-semibold whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                          {fmt.brl(row.price)}
                        </td>
                        {/* Variação */}
                        <td className="px-3 py-2.5 mono whitespace-nowrap">
                          <div className="flex items-center gap-0.5" style={{ color: isUp ? 'var(--accent-green)' : isDown ? 'var(--accent-red)' : 'var(--text-tertiary)' }}>
                            {isUp ? <TrendingUp size={11} /> : isDown ? <TrendingDown size={11} /> : <Minus size={11} />}
                            {fmt.pct(row.changePct)}
                          </div>
                        </td>
                        {/* Val. Mercado */}
                        <td className="px-3 py-2.5 mono whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{fmt.cap(row.marketCap)}</td>
                        {/* P/L */}
                        <td className="px-3 py-2.5 mono whitespace-nowrap" style={{ color: row.pl != null && row.pl > 0 && row.pl < 15 ? 'var(--accent-green)' : row.pl != null && row.pl > 30 ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
                          {fmt.num(row.pl)}
                        </td>
                        {/* P/VP */}
                        <td className="px-3 py-2.5 mono whitespace-nowrap" style={{ color: row.pvp != null && row.pvp < 1 ? 'var(--accent-green)' : 'var(--text-secondary)' }}>
                          {fmt.num(row.pvp)}
                        </td>
                        {/* Div. Yield */}
                        <td className="px-3 py-2.5 mono font-semibold whitespace-nowrap" style={{ color: numColor(row.dy) }}>
                          {row.dy != null ? `${row.dy.toFixed(2)}%` : '—'}
                        </td>
                        {/* ROE */}
                        <td className="px-3 py-2.5 mono whitespace-nowrap" style={{ color: numColor(row.roe) }}>
                          {row.roe != null ? `${row.roe.toFixed(1)}%` : '—'}
                        </td>
                        {/* ROIC */}
                        <td className="px-3 py-2.5 mono whitespace-nowrap" style={{ color: numColor(row.roic) }}>
                          {row.roic != null ? `${row.roic.toFixed(1)}%` : '—'}
                        </td>
                        {/* EV/EBITDA */}
                        <td className="px-3 py-2.5 mono whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                          {fmt.num(row.evEbitda)}
                        </td>
                        {/* Margem Líquida */}
                        <td className="px-3 py-2.5 mono whitespace-nowrap" style={{ color: numColor(row.netMargin) }}>
                          {row.netMargin != null ? `${row.netMargin.toFixed(1)}%` : '—'}
                        </td>
                        {/* Dívida/PL */}
                        <td className="px-3 py-2.5 mono whitespace-nowrap" style={{ color: row.debtEquity != null && row.debtEquity > 2 ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
                          {fmt.num(row.debtEquity)}
                        </td>
                        {/* Botões */}
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <WatchlistButton ticker={row.ticker} />
                            <Link
                              href={`/acao/${row.ticker}`}
                              className="text-[11px] px-2.5 py-1.5 rounded-lg font-medium hover:opacity-80 transition-all whitespace-nowrap"
                              style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)', color: 'var(--accent-cyan)' }}
                            >
                              Analisar →
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-center mt-6" style={{ color: 'var(--text-tertiary)' }}>
          Dados atualizados a cada 4 horas · Fonte: Yahoo Finance + Fundamentus · Não constitui recomendação de investimento.
        </p>
      </main>
    </div>
  );
}

// ── Componentes auxiliares ────────────────────────────────────
function FiltroSelect({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 rounded-xl text-xs outline-none appearance-none"
        style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}

function FiltroNumero({ label, filterKey, filters, onChange, placeholder }: {
  label: string;
  filterKey: keyof Filters;
  filters: Filters;
  onChange: (k: keyof Filters, v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>{label}</label>
      <input type="number" step="any" placeholder={placeholder ?? ''}
        value={filters[filterKey]} onChange={(e) => onChange(filterKey, e.target.value)}
        className="px-3 py-2 rounded-xl text-xs outline-none"
        style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
      />
    </div>
  );
}

function FiltroIntervalo({ label, minKey, maxKey, filters, onChange }: {
  label: string;
  minKey: keyof Filters;
  maxKey: keyof Filters;
  filters: Filters;
  onChange: (k: keyof Filters, v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>{label}</label>
      <div className="flex items-center gap-1">
        <input type="number" step="any" placeholder="mín"
          value={filters[minKey]} onChange={(e) => onChange(minKey, e.target.value)}
          className="w-full px-2 py-2 rounded-xl text-xs outline-none"
          style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
        />
        <span style={{ color: 'var(--text-tertiary)' }}>–</span>
        <input type="number" step="any" placeholder="máx"
          value={filters[maxKey]} onChange={(e) => onChange(maxKey, e.target.value)}
          className="w-full px-2 py-2 rounded-xl text-xs outline-none"
          style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
        />
      </div>
    </div>
  );
}
