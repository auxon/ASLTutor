import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FREE_ENTITLEMENT,
  type Entitlement,
} from '@/engine/entitlement';
import { fetchMe } from '@/lib/billing';

export type PaywallReason = 'lesson' | 'camera' | 'srs' | 'pricing';

type BillingContextValue = {
  entitlement: Entitlement;
  loading: boolean;
  refresh: () => Promise<void>;
  paywallReason: PaywallReason | null;
  openPaywall: (reason: PaywallReason) => void;
  closePaywall: () => void;
};

const BillingContext = createContext<BillingContextValue | null>(null);

function readDevOverride(): Entitlement | null {
  if (!import.meta.env.DEV) return null;
  try {
    if (localStorage.getItem('signflow-dev-pro') === '1') {
      return {
        email: 'dev@localhost',
        status: 'active',
        plan: 'monthly',
        currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000,
        configured: true,
        pro: true,
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function BillingProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [paywallReason, setPaywallReason] = useState<PaywallReason | null>(null);
  const query = useQuery({
    queryKey: ['signflow-entitlement'],
    queryFn: fetchMe,
    staleTime: 30_000,
  });

  const entitlement = readDevOverride() ?? query.data ?? FREE_ENTITLEMENT;

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['signflow-entitlement'] });
  }, [queryClient]);

  const value = useMemo(
    () => ({
      entitlement,
      loading: query.isLoading,
      refresh,
      paywallReason,
      openPaywall: (reason: PaywallReason) => setPaywallReason(reason),
      closePaywall: () => setPaywallReason(null),
    }),
    [entitlement, query.isLoading, paywallReason, refresh],
  );

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
}

export function useBilling(): BillingContextValue {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error('useBilling must be used within BillingProvider');
  return ctx;
}
