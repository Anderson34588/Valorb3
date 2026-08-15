'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BarChart2, Check, Crown, Zap, Lock, ExternalLink, AlertCircle } from 'lucide-react';
import { AuthButton } from '@/components/AuthButton';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';

const PLANO_GRATIS_FEATURES = [
  '5 análises por dia (reset à meia-noite)',
  'Cotações em tempo real',
  'Modelos Bazin e Graham',
  'Últimos dividendos',
  'Gráfico de preços (1 ano)',
];

const PLANO_PRO_FEATURES = [
  { text: 'Tudo do plano gratuito', highlight: false },
  { text: 'Filtrar Ações — busca avançada por indicadores', highlight: true },
  { text: 'Minha Lista — salvar ações favoritas', highlight: true },
  { text: 'Modelo DCF completo (2 estágios)', highlight: true },
  { text: 'Exportar relatório em PDF', highlight: true },
  { text: 'Suporte prioritário', highlight: false },
];

export default function PlanosPage() {
  return (
    <Suspense fallback={null}>
      <PlanosContent />
    </Suspense>
  );
}

function PlanosContent() {
  const { user, loading: authLoading } = useAuth();
  const { pro, loading: subLoading, status, currentPeriodEnd, cancelAtPeriodEnd } = useSubscription();
  const searchParams = useSearchParams();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [anual, setAnual] = useState(false);

  // Handle return from Stripe or usage limit redirect
  useEffect(() => {
    const s = searchParams.get('status');
    const motivo = searchParams.get('motivo');
    if (s === 'sucesso') setSuccessMsg('Assinatura ativada com sucesso! Bem-vindo ao Pro! 🎉');
    if (s === 'cancelado') setError('Pagamento cancelado. Você pode tentar novamente quando quiser.');
    if (motivo === 'limite') setError('Você atingiu o limite de 5 análises gratuitas hoje. Assine o Pro para análises ilimitadas!');
    if (motivo === 'pro') setError('Este recurso é exclusivo do plano Pro. Assine para desbloquear.');
  }, [searchParams]);

  const handleCheckout = async () => {
    if (!user) { window.location.href = '/login'; return; }
    setCheckoutLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: anual ? 'yearly' : 'monthly' }),
      });
      const data = await res.json();
      if (data.error === 'payments_not_configured') {
        setError('Pagamentos ainda não configurados. Entre em contato com o administrador.');
        return;
      }
      if (data.url) window.location.href = data.url;
      else setError('Não foi possível iniciar o pagamento. Tente novamente.');
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/billing-portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setError('Não foi possível abrir o portal de faturamento.');
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setPortalLoading(false);
    }
  };

  const isLoading = authLoading || subLoading;
  const periodEndDate = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full"
        style={{ background: 'rgba(5,5,5,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
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
            <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Planos</span>
          </div>
          <AuthButton />
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-12 pb-20">

        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4"
            style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)', color: 'var(--accent-cyan)' }}>
            <Zap size={12} />
            Análise fundamentalista profissional
          </div>
          <h1 className="text-4xl font-bold mb-3" style={{ letterSpacing: '-0.04em' }}>
            Escolha seu <span className="gradient-text">Plano</span>
          </h1>
          <p className="text-base max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Comece gratuitamente. Faça upgrade para o Pro e desbloqueie todas as ferramentas de análise.
          </p>

          {/* Toggle mensal / anual */}
          <div className="inline-flex items-center gap-3 mt-6 p-1 rounded-full"
            style={{ background: 'var(--card)', border: '1px solid var(--border-subtle)' }}>
            <button onClick={() => setAnual(false)}
              className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
              style={{
                background: !anual ? 'var(--gradient-accent)' : 'transparent',
                color: !anual ? '#050505' : 'var(--text-secondary)',
              }}>
              Mensal
            </button>
            <button onClick={() => setAnual(true)}
              className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2"
              style={{
                background: anual ? 'var(--gradient-accent)' : 'transparent',
                color: anual ? '#050505' : 'var(--text-secondary)',
              }}>
              Anual
              <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                style={{ background: anual ? 'rgba(0,0,0,0.2)' : 'rgba(0,255,136,0.15)', color: anual ? '#050505' : 'var(--accent-green)' }}>
                -30%
              </span>
            </button>
          </div>
        </div>

        {/* Alerts */}
        {successMsg && (
          <div className="mb-8 rounded-2xl p-4 flex items-center gap-3"
            style={{ background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.25)' }}>
            <Check size={16} style={{ color: 'var(--accent-green)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--accent-green)' }}>{successMsg}</p>
          </div>
        )}
        {error && (
          <div className="mb-8 rounded-2xl p-4 flex items-center gap-3"
            style={{ background: 'rgba(255,69,96,0.08)', border: '1px solid rgba(255,69,96,0.25)' }}>
            <AlertCircle size={16} style={{ color: 'var(--accent-red)' }} />
            <p className="text-sm" style={{ color: 'var(--accent-red)' }}>{error}</p>
          </div>
        )}

        {/* Status do plano atual (se Pro) */}
        {!isLoading && pro && (
          <div className="mb-8 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4"
            style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.25)' }}>
            <div className="flex items-center gap-3">
              <Crown size={20} style={{ color: 'var(--accent-cyan)' }} />
              <div>
                <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Você é <span style={{ color: 'var(--accent-cyan)' }}>ValorB3 Pro</span>
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  {cancelAtPeriodEnd
                    ? `Cancela em ${periodEndDate}`
                    : periodEndDate ? `Próxima cobrança: ${periodEndDate}` : `Status: ${status}`}
                </p>
              </div>
            </div>
            <button onClick={handlePortal} disabled={portalLoading}
              className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl font-medium hover:opacity-80 transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
              {portalLoading ? 'Abrindo…' : 'Gerenciar assinatura'}
              <ExternalLink size={11} />
            </button>
          </div>
        )}

        {/* Cards de plano */}
        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">

          {/* Plano Gratuito */}
          <div className="rounded-3xl p-6 flex flex-col gap-5"
            style={{ background: 'var(--card)', border: '1px solid var(--border-subtle)' }}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Gratuito</p>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold" style={{ letterSpacing: '-0.04em' }}>R$ 0</span>
                <span className="text-sm mb-1.5" style={{ color: 'var(--text-tertiary)' }}>/mês</span>
              </div>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Até 5 análises por dia. Sem cartão.
              </p>
            </div>

            <ul className="flex flex-col gap-2.5 flex-1">
              {PLANO_GRATIS_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <Check size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--accent-green)' }} />
                  {f}
                </li>
              ))}
            </ul>

            <Link href="/"
              className="w-full flex items-center justify-center py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
              Continuar grátis
            </Link>
          </div>

          {/* Plano Pro */}
          <div className="relative rounded-3xl p-6 flex flex-col gap-5"
            style={{ background: 'var(--card)', border: '1px solid rgba(0,212,255,0.4)', boxShadow: '0 0 40px rgba(0,212,255,0.08)' }}>
            {/* Badge popular */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: 'var(--gradient-accent)', color: '#050505' }}>
              ✦ Mais popular
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--accent-cyan)' }}>
                Pro
              </p>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold" style={{ letterSpacing: '-0.04em' }}>
                  R$ {anual ? '13' : '19'}
                </span>
                <span className="text-xl font-bold mb-0.5" style={{ letterSpacing: '-0.02em' }}>
                  {anual ? ',90' : ',90'}
                </span>
                <span className="text-sm mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
                  {anual ? '/mês · cobrado anualmente' : '/mês'}
                </span>
              </div>
              {anual && (
                <p className="text-xs mt-1" style={{ color: 'var(--accent-green)' }}>
                  R$ 166,80/ano · economize R$ 71,88 vs mensal
                </p>
              )}
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Todas as ferramentas para análise profissional.
              </p>
            </div>

            <ul className="flex flex-col gap-2.5 flex-1">
              {PLANO_PRO_FEATURES.map((f) => (
                <li key={f.text} className="flex items-start gap-2.5 text-sm">
                  {f.highlight
                    ? <Crown size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--accent-cyan)' }} />
                    : <Check size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--accent-green)' }} />}
                  <span style={{ color: f.highlight ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: f.highlight ? 500 : 400 }}>
                    {f.text}
                  </span>
                </li>
              ))}
            </ul>

            {isLoading ? (
              <div className="w-full h-12 rounded-xl animate-pulse" style={{ background: 'var(--surface)' }} />
            ) : pro ? (
              <button onClick={handlePortal} disabled={portalLoading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: 'var(--gradient-accent)', color: '#050505' }}>
                <Crown size={15} />
                {portalLoading ? 'Abrindo…' : 'Gerenciar assinatura'}
              </button>
            ) : !user ? (
              <Link href="/login"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: 'var(--gradient-accent)', color: '#050505' }}>
                <Lock size={15} />
                Entrar para assinar
              </Link>
            ) : (
              <button onClick={handleCheckout} disabled={checkoutLoading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: 'var(--gradient-accent)', color: '#050505' }}>
                <Crown size={15} />
                {checkoutLoading ? 'Redirecionando…' : 'Assinar agora — R$ 49,90/mês'}
              </button>
            )}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="text-lg font-bold text-center mb-6" style={{ letterSpacing: '-0.02em' }}>
            Dúvidas frequentes
          </h2>
          <div className="flex flex-col gap-4">
            {[
              { q: 'Posso cancelar a qualquer momento?', a: 'Sim. Você pode cancelar pelo portal de faturamento e continua com acesso Pro até o fim do período pago.' },
              { q: 'Quais formas de pagamento são aceitas?', a: 'Cartão de crédito/débito, Pix e boleto bancário. O pagamento é processado com segurança pela Stripe.' },
              { q: 'O plano gratuito continua funcionando?', a: 'Sim. Você pode analisar até 5 ações por dia gratuitamente, com cotações em tempo real e modelos Bazin/Graham.' },
              { q: 'Os dados são em tempo real?', a: 'Cotações são atualizadas via Yahoo Finance. Indicadores fundamentalistas via Fundamentus (atualizam diariamente).' },
            ].map(({ q, a }) => (
              <div key={q} className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border-subtle)' }}>
                <p className="text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>{q}</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Métodos de pagamento + Disclaimer */}
        <div className="mt-10 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Aceitos:</span>
            {[
              { label: 'Pix', bg: '#32bcad', color: '#fff' },
              { label: 'Cartão', bg: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)' },
              { label: 'Boleto', bg: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)' },
            ].map(({ label, bg, color }) => (
              <span key={label} className="px-2.5 py-1 rounded-md text-xs font-semibold"
                style={{ background: bg, color, border: '1px solid rgba(255,255,255,0.1)' }}>
                {label}
              </span>
            ))}
          </div>
          <p className="text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>
            Pagamentos processados pela Stripe · Cancele quando quiser · Não é recomendação de investimento
          </p>
        </div>
      </main>
    </div>
  );
}
