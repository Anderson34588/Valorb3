'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LogIn, LogOut, User, ChevronDown, Crown, CreditCard } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';

export function AuthButton() {
  const { user, loading, csrf_token } = useAuth();
  const { pro, loading: subLoading } = useSubscription();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'x-csrf-token': csrf_token ?? '' },
    });
    window.location.href = '/';
  };

  if (loading) {
    return <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: 'var(--surface)' }} />;
  }

  if (!user) {
    return (
      <Link href="/login"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:opacity-80"
        style={{ background: 'var(--gradient-accent)', color: '#050505' }}>
        <LogIn size={12} strokeWidth={2.5} />
        Entrar
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-full transition-all hover:opacity-80"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)' }}
      >
        {user.picture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.picture} alt={user.name ?? 'Usuário'} className="w-6 h-6 rounded-full" />
        ) : (
          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--gradient-accent)' }}>
            <User size={12} color="#050505" />
          </div>
        )}
        <span className="text-xs font-medium hidden sm:block max-w-[100px] truncate" style={{ color: 'var(--text-primary)' }}>
          {user.name?.split(' ')[0] ?? 'Usuário'}
        </span>
        {/* PRO badge */}
        {!subLoading && pro && (
          <span className="hidden sm:flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md"
            style={{ background: 'rgba(0,212,255,0.2)', color: 'var(--accent-cyan)' }}>
            <Crown size={9} />PRO
          </span>
        )}
        <ChevronDown size={12} style={{ color: 'var(--text-tertiary)' }} />
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-52 rounded-2xl py-1 shadow-xl"
            style={{ background: 'var(--card)', border: '1px solid var(--border-subtle)' }}>
            <div className="px-4 py-2.5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                  {user.name ?? 'Usuário'}
                </p>
                {!subLoading && pro && (
                  <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
                    style={{ background: 'rgba(0,212,255,0.15)', color: 'var(--accent-cyan)' }}>
                    <Crown size={9} />PRO
                  </span>
                )}
              </div>
              <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{user.email}</p>
            </div>
            <Link href="/planos"
              onClick={() => setMenuOpen(false)}
              className="w-full flex items-center gap-2 px-4 py-2 text-xs transition-all hover:opacity-80"
              style={{ color: pro ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}>
              <CreditCard size={13} />
              {pro ? 'Minha assinatura Pro' : '✦ Fazer upgrade para Pro'}
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2 text-xs transition-all hover:opacity-80 text-left"
              style={{ color: 'var(--accent-red)' }}>
              <LogOut size={13} />
              Sair
            </button>
          </div>
        </>
      )}
    </div>
  );
}
