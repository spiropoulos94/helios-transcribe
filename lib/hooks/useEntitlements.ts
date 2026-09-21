'use client';

/**
 * Client hook for the current user's entitlements + usage. Backed by
 * `GET /api/billing/entitlements`. **UI only** — never trust this for enforcement;
 * every gate is re-checked server-side.
 *
 * Fail-soft: while loading or on error it returns the Free entitlements (the most
 * restrictive), so gated UI stays locked until confirmed rather than flashing open.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  entitlementsForPlan,
  type Entitlements,
} from '@/lib/billing/entitlements';
import type { UsageSnapshot } from '@/lib/billing/usage';
import type { PlanId } from '@/lib/pricing/plans';

interface EntitlementsResponse {
  plan: PlanId;
  entitlements: Entitlements;
  usage: UsageSnapshot;
}

export interface UseEntitlements {
  plan: PlanId;
  entitlements: Entitlements;
  usage: UsageSnapshot | null;
  loading: boolean;
  error: boolean;
  refresh: () => void;
}

const FREE = entitlementsForPlan('free');

export function useEntitlements(): UseEntitlements {
  const [data, setData] = useState<EntitlementsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/billing/entitlements');
      if (!res.ok) {
        setError(true);
        setData(null);
        return;
      }
      setData((await res.json()) as EntitlementsResponse);
    } catch {
      setError(true);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    plan: data?.plan ?? 'free',
    entitlements: data?.entitlements ?? FREE,
    usage: data?.usage ?? null,
    loading,
    error,
    refresh: () => void load(),
  };
}
