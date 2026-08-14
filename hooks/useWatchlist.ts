'use client';

import { useEffect, useState, useCallback } from 'react';

export function useWatchlist() {
  const [tickers, setTickers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/watchlist');
      if (res.status === 401) { setTickers([]); setLoading(false); return; }
      const data = await res.json();
      setTickers((data.items ?? []).map((i: { ticker: string }) => i.ticker));
    } catch {
      setTickers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const add = useCallback(async (ticker: string) => {
    setTickers((t) => [...new Set([...t, ticker.toUpperCase()])]);
    await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker }),
    });
  }, []);

  const remove = useCallback(async (ticker: string) => {
    setTickers((t) => t.filter((x) => x !== ticker.toUpperCase()));
    await fetch(`/api/watchlist?ticker=${encodeURIComponent(ticker)}`, { method: 'DELETE' });
  }, []);

  const toggle = useCallback(async (ticker: string) => {
    const up = ticker.toUpperCase();
    if (tickers.includes(up)) await remove(up);
    else await add(up);
  }, [tickers, add, remove]);

  return { tickers, loading, add, remove, toggle };
}
