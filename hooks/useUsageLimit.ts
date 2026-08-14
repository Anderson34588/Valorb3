'use client';

import { useEffect, useState } from 'react';

const DAILY_LIMIT = 5;
const STORAGE_KEY = 'vb3_usage';

interface UsageData {
  date: string; // "YYYY-MM-DD"
  count: number;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function readUsage(): UsageData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { date: todayStr(), count: 0 };
    const parsed: UsageData = JSON.parse(raw);
    // Reset counter if it's a new day
    if (parsed.date !== todayStr()) return { date: todayStr(), count: 0 };
    return parsed;
  } catch {
    return { date: todayStr(), count: 0 };
  }
}

function writeUsage(data: UsageData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

interface UsageLimit {
  /** true quando ainda tem análises disponíveis hoje */
  allowed: boolean;
  /** quantas análises já foram feitas hoje */
  used: number;
  /** limite diário */
  limit: number;
  /** registra +1 uso e retorna se ainda estava dentro do limite */
  consume: () => boolean;
}

/**
 * Controla o limite de 5 análises/dia para usuários não-Pro.
 * isPro = true → acesso ilimitado, nenhum consumo é registrado.
 */
export function useUsageLimit(isPro: boolean): UsageLimit {
  const [used, setUsed] = useState(0);

  useEffect(() => {
    if (isPro) return;
    const data = readUsage();
    setUsed(data.count);
  }, [isPro]);

  const allowed = isPro || used < DAILY_LIMIT;

  const consume = (): boolean => {
    if (isPro) return true;
    const data = readUsage();
    if (data.count >= DAILY_LIMIT) return false;
    const updated = { date: todayStr(), count: data.count + 1 };
    writeUsage(updated);
    setUsed(updated.count);
    return true;
  };

  return { allowed, used, limit: DAILY_LIMIT, consume };
}
