'use client';

import { useEffect, useState } from 'react';

export interface SubscriptionState {
  pro: boolean;
  loading: boolean;
  status?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}

export function useSubscription(): SubscriptionState {
  const [state, setState] = useState<SubscriptionState>({ pro: false, loading: true });

  useEffect(() => {
    fetch('/api/subscription')
      .then((r) => r.json())
      .then((d) =>
        setState({
          pro: d.pro ?? false,
          loading: false,
          status: d.subscription?.status,
          currentPeriodEnd: d.subscription?.currentPeriodEnd,
          cancelAtPeriodEnd: d.subscription?.cancelAtPeriodEnd,
        })
      )
      .catch(() => setState({ pro: false, loading: false }));
  }, []);

  return state;
}
