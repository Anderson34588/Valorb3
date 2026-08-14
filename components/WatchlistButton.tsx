'use client';

import { useState } from 'react';
import { Bookmark, BookmarkCheck, LogIn } from 'lucide-react';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

interface WatchlistButtonProps {
  ticker: string;
  companyName?: string;
}

export function WatchlistButton({ ticker, companyName }: WatchlistButtonProps) {
  const { user, loading: authLoading } = useAuth();
  const { tickers, loading: wlLoading, toggle } = useWatchlist();
  const [animating, setAnimating] = useState(false);
  const up = ticker.toUpperCase();
  const inWatchlist = tickers.includes(up);

  const handleToggle = async () => {
    if (!user) return;
    setAnimating(true);
    await toggle(up);
    setTimeout(() => setAnimating(false), 400);
  };

  if (authLoading || wlLoading) {
    return (
      <div
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: 'var(--surface)' }} />
      </div>
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all hover:opacity-80"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-tertiary)',
        }}
      title="Entre para salvar na sua lista"
      >
        <Bookmark size={14} />
        <span className="hidden sm:inline">Entrar para salvar</span>
        <LogIn size={11} style={{ color: 'var(--accent-cyan)' }} />
      </Link>
    );
  }

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
        animating ? 'scale-95' : 'hover:scale-[1.03]'
      }`}
      style={
        inWatchlist
          ? {
              background: 'rgba(0,212,255,0.12)',
              border: '1px solid rgba(0,212,255,0.35)',
              color: 'var(--accent-cyan)',
            }
          : {
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
            }
      }
      title={inWatchlist ? `Remover ${up} da lista` : `Salvar ${up} na sua lista`}
    >
      {inWatchlist ? (
        <BookmarkCheck size={14} />
      ) : (
        <Bookmark size={14} />
      )}
      <span className="hidden sm:inline">{inWatchlist ? 'Salvo' : 'Salvar na Lista'}</span>
    </button>
  );
}
