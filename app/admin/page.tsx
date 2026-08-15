'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart2, Download, RefreshCw, Users, Crown, UserCheck, AlertCircle } from 'lucide-react';
import { AuthButton } from '@/components/AuthButton';

interface UserRow {
  id: string;
  email: string;
  nome: string;
  stripeCustomerId: string;
  criadoEm: string;
  plano: 'Pro' | 'Gratuito';
  statusAssinatura: string;
  stripeSubscriptionId: string;
  periodoInicio: string;
  periodoFim: string;
  cancelaAoFinal: string;
}

function fmtDate(iso: string) {
  if (!iso || iso === '—') return '—';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return iso; }
}

function exportCSV(rows: UserRow[]) {
  const headers = [
    'Nome', 'Email', 'Plano', 'Status Assinatura',
    'Período Início', 'Período Fim', 'Cancela ao Final',
    'Stripe Customer ID', 'Stripe Subscription ID', 'Cadastrado Em',
  ];
  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [
    headers.map(escape).join(','),
    ...rows.map((r) => [
      r.nome, r.email, r.plano, r.statusAssinatura,
      fmtDate(r.periodoInicio), fmtDate(r.periodoFim), r.cancelaAoFinal,
      r.stripeCustomerId, r.stripeSubscriptionId, fmtDate(r.criadoEm),
    ].map(escape).join(',')),
  ];
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ValorB3_usuarios_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Erro desconhecido'); return; }
      setRows(data.users ?? []);
    } catch {
      setError('Falha de conexão.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const totalPro = rows.filter((r) => r.plano === 'Pro').length;
  const totalGratis = rows.filter((r) => r.plano === 'Gratuito').length;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full"
        style={{ background: 'rgba(5,5,5,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--gradient-accent)' }}>
                <BarChart2 size={14} color="#050505" strokeWidth={2.5} />
              </div>
              <span className="font-bold text-sm" style={{ letterSpacing: '-0.02em' }}>
                <span className="gradient-text">Valor</span><span>B3</span>
              </span>
            </Link>
            <span style={{ color: 'var(--border-subtle)' }}>/</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Admin</span>
          </div>
          <AuthButton />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-20">

        {/* Título */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ letterSpacing: '-0.03em' }}>
              Painel de <span className="gradient-text">Usuários</span>
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Todos os cadastros e assinaturas do ValorB3
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80 disabled:opacity-50"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Atualizar
            </button>
            <button onClick={() => exportCSV(rows)} disabled={rows.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: 'var(--gradient-accent)', color: '#050505' }}>
              <Download size={14} />
              Exportar Excel / CSV
            </button>
          </div>
        </div>

        {/* Cards de resumo */}
        {!loading && !error && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
            {[
              { label: 'Total de Usuários', value: rows.length, icon: <Users size={18} />, color: 'var(--text-primary)' },
              { label: 'Assinantes Pro', value: totalPro, icon: <Crown size={18} />, color: 'var(--accent-cyan)' },
              { label: 'Plano Gratuito', value: totalGratis, icon: <UserCheck size={18} />, color: 'var(--accent-green)' },
            ].map(({ label, value, icon, color }) => (
              <div key={label} className="rounded-2xl p-4 flex items-center gap-3"
                style={{ background: 'var(--card)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ color }}>{icon}</div>
                <div>
                  <p className="text-2xl font-bold mono" style={{ color, letterSpacing: '-0.03em' }}>{value}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-2xl mb-6"
            style={{ background: 'rgba(255,69,96,0.08)', border: '1px solid rgba(255,69,96,0.25)' }}>
            <AlertCircle size={16} style={{ color: 'var(--accent-red)' }} />
            <p className="text-sm" style={{ color: 'var(--accent-red)' }}>
              {error === 'Acesso negado'
                ? 'Acesso negado. Adicione seu email em ADMIN_EMAILS no .env da Vercel.'
                : error}
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 animate-spin"
              style={{ borderColor: 'var(--accent-cyan)', borderTopColor: 'transparent' }} />
          </div>
        )}

        {/* Tabela */}
        {!loading && !error && rows.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border-subtle)' }}>
                    {['Nome', 'Email', 'Plano', 'Status', 'Próxima Cobrança', 'Cancela', 'Cadastro'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider"
                        style={{ color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.id}
                      style={{
                        background: i % 2 === 0 ? 'var(--card)' : 'rgba(255,255,255,0.01)',
                        borderBottom: '1px solid var(--border-subtle)',
                      }}>
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                        {r.nome}
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {r.email}
                      </td>
                      <td className="px-4 py-3">
                        {r.plano === 'Pro' ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold w-fit"
                            style={{ background: 'rgba(0,212,255,0.12)', color: 'var(--accent-cyan)', border: '1px solid rgba(0,212,255,0.3)' }}>
                            <Crown size={10} /> Pro
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-tertiary)' }}>
                            Gratuito
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium"
                          style={{ color: r.statusAssinatura === 'active' ? 'var(--accent-green)' : r.statusAssinatura === '—' ? 'var(--text-tertiary)' : 'var(--accent-red)' }}>
                          {r.statusAssinatura === 'active' ? 'Ativo' : r.statusAssinatura === 'canceled' ? 'Cancelado' : r.statusAssinatura === 'trialing' ? 'Trial' : r.statusAssinatura === 'past_due' ? 'Inadimplente' : r.statusAssinatura}
                        </span>
                      </td>
                      <td className="px-4 py-3 mono text-xs" style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {fmtDate(r.periodoFim)}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: r.cancelaAoFinal === 'Sim' ? 'var(--accent-red)' : 'var(--text-tertiary)' }}>
                        {r.cancelaAoFinal}
                      </td>
                      <td className="px-4 py-3 mono text-xs" style={{ color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                        {fmtDate(r.criadoEm)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 text-xs" style={{ background: 'var(--surface)', color: 'var(--text-tertiary)', borderTop: '1px solid var(--border-subtle)' }}>
              {rows.length} usuário{rows.length !== 1 ? 's' : ''} encontrado{rows.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="text-center py-20" style={{ color: 'var(--text-tertiary)' }}>
            Nenhum usuário cadastrado ainda.
          </div>
        )}
      </main>
    </div>
  );
}
