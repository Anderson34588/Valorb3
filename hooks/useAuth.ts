'use client';

import { useEffect, useState } from 'react';

export interface AuthUser {
  id: string;
  name?: string;
  email?: string;
  picture?: string;
}

export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  csrf_token?: string;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setState({ user: d.user ?? null, loading: false, csrf_token: d.csrf_token }))
      .catch(() => setState({ user: null, loading: false }));
  }, []);

  return state;
}
