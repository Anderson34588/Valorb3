'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart2 } from 'lucide-react';
import Link from 'next/link';

declare global {
  interface Window {
    openHappySeedsLogin?: () => void;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Check if already logged in
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d?.user) router.replace('/');
      })
      .catch(() => {});
  }, [router]);

  // Poll /api/auth/me after login popup closes
  const startPolling = () => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data?.user) {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          router.replace('/');
        }
      } catch {
        // keep polling
      }
    }, 1000);
    // Stop after 3 minutes
    setTimeout(() => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }, 180000);
  };

  const handleLogin = () => {
    if (typeof window !== 'undefined' && window.openHappySeedsLogin) {
      window.openHappySeedsLogin();
    } else {
      window.open('/api/auth/login', '_blank', 'width=520,height=620');
    }
    startPolling();
  };

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}
    >
      {/* Header */}
      <header
        className="w-full h-14 flex items-center px-6"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--gradient-accent)' }}
          >
            <BarChart2 size={14} color="#050505" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-sm" style={{ letterSpacing: '-0.02em' }}>
            <span className="gradient-text">Valor</span>
            <span style={{ color: 'var(--text-primary)' }}>B3</span>
          </span>
        </Link>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div
          className="w-full max-w-sm rounded-3xl p-8 flex flex-col items-center gap-6"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 0 40px rgba(0,212,255,0.06)',
          }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--gradient-accent)' }}
            >
              <BarChart2 size={26} color="#050505" strokeWidth={2.5} />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold" style={{ letterSpacing: '-0.03em' }}>
                <span className="gradient-text">Valor</span>B3
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Valuation de ações da B3
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="w-full h-px" style={{ background: 'var(--border-subtle)' }} />

          {/* Benefits */}
          <ul className="w-full space-y-2">
            {[
              '📊 Análise fundamentalista completa',
              '💹 Cotações em tempo real',
              '🔢 Bazin, Graham, Múltiplos e DCF',
              '🏢 Ações, FIIs, BDRs e ETFs',
            ].map((item) => (
              <li
                key={item}
                className="text-sm flex items-center gap-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                {item}
              </li>
            ))}
          </ul>

          {/* Divider */}
          <div className="w-full h-px" style={{ background: 'var(--border-subtle)' }} />

          {/* Login button */}
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'var(--gradient-accent)',
              color: '#050505',
            }}
          >
            {/* Google icon */}
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#050505" fillOpacity=".7"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#050505" fillOpacity=".7"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#050505" fillOpacity=".7"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#050505" fillOpacity=".7"/>
            </svg>
            Entrar com Google
          </button>

          <p className="text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>
            Ao entrar, você concorda com os{' '}
            <span style={{ color: 'var(--accent-cyan)' }}>termos de uso</span>
            {' '}e a{' '}
            <span style={{ color: 'var(--accent-cyan)' }}>política de privacidade</span>.
          </p>
        </div>
      </main>
    </div>
  );
}
