'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, TrendingUp, X } from 'lucide-react';
import { POPULAR_TICKERS } from '@/lib/valuation';

interface Props {
  onSearch: (ticker: string) => void;
  loading: boolean;
}

export function StockSearch({ onSearch, loading }: Props) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = value.trim().toUpperCase();
    if (t) onSearch(t);
  };

  const handleQuick = (ticker: string) => {
    setValue(ticker);
    onSearch(ticker);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300"
          style={{
            background: 'var(--card)',
            border: `1px solid ${focused ? 'var(--border-hover)' : 'var(--border-subtle)'}`,
            boxShadow: focused ? '0 0 0 3px rgba(0,212,255,0.1), 0 20px 40px rgba(0,0,0,0.4)' : 'none',
          }}
        >
          <Search
            size={20}
            style={{ color: focused ? 'var(--accent-cyan)' : 'var(--text-tertiary)', flexShrink: 0 }}
            className="transition-colors duration-200"
          />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value.toUpperCase())}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Digite o ticker  (ex: PETR4, VALE3, ITUB4)"
            className="flex-1 bg-transparent border-none outline-none text-base"
            style={{
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-geist-mono)',
              letterSpacing: '0.05em',
            }}
            maxLength={10}
            autoComplete="off"
            spellCheck={false}
          />
          {value && (
            <button
              type="button"
              onClick={() => setValue('')}
              style={{ color: 'var(--text-tertiary)' }}
              className="hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          )}
          <button
            type="submit"
            disabled={!value.trim() || loading}
            className="px-5 py-2 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40"
            style={{
              background: loading ? 'rgba(0,212,255,0.2)' : 'var(--gradient-accent)',
              color: '#050505',
              minWidth: 80,
            }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span
                  className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin"
                />
                <span>...</span>
              </span>
            ) : (
              'Analisar'
            )}
          </button>
        </div>
      </form>

      {/* Popular tickers */}
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp size={13} style={{ color: 'var(--text-tertiary)' }} />
          <span
            className="text-xs uppercase tracking-widest"
            style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-geist-mono)' }}
          >
            Ações populares
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {POPULAR_TICKERS.map(({ ticker, name }) => (
            <button
              key={ticker}
              onClick={() => handleQuick(ticker)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-geist-mono)',
              }}
              title={name}
            >
              {ticker}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
