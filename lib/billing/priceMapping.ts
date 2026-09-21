/**
 * Maps plans + billing intervals to Stripe price IDs, driven entirely by env vars.
 * Never hardcode a price id or amount here — amounts live in `lib/pricing/plans.ts`
 * and are pushed to Stripe by `scripts/stripe-sync.ts`, which prints the ids below.
 */

import type { PlanId } from '@/lib/pricing/plans';

export type BillingInterval = 'month' | 'year';

/** Plans that are actually billable through Stripe (everything except Free). */
export const BILLABLE_PLANS = ['pro', 'creator', 'newsroom'] as const;
export type BillablePlan = (typeof BILLABLE_PLANS)[number];

export function isBillablePlan(plan: string): plan is BillablePlan {
  return (BILLABLE_PLANS as readonly string[]).includes(plan);
}

export function isBillingInterval(value: unknown): value is BillingInterval {
  return value === 'month' || value === 'year';
}

/** The env var that holds the Stripe price id for a (plan, interval) pair. */
export function priceEnvKey(plan: BillablePlan, interval: BillingInterval): string {
  const suffix = interval === 'year' ? 'ANNUAL' : 'MONTHLY';
  return `STRIPE_PRICE_${plan.toUpperCase()}_${suffix}`;
}

/** Every (plan, interval, envKey) combination — used by the sync script and reverse map. */
export function allPriceSlots(): {
  plan: BillablePlan;
  interval: BillingInterval;
  envKey: string;
}[] {
  const slots: { plan: BillablePlan; interval: BillingInterval; envKey: string }[] = [];
  for (const plan of BILLABLE_PLANS) {
    for (const interval of ['month', 'year'] as BillingInterval[]) {
      slots.push({ plan, interval, envKey: priceEnvKey(plan, interval) });
    }
  }
  return slots;
}

/** Resolve the configured price id for a (plan, interval), or undefined if unset. */
export function getPriceId(
  plan: BillablePlan,
  interval: BillingInterval,
  env: NodeJS.ProcessEnv = process.env
): string | undefined {
  return env[priceEnvKey(plan, interval)] || undefined;
}

/** Reverse lookup: Stripe price id → { plan, interval }, or null if not configured. */
export function planFromPriceId(
  priceId: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env
): { plan: PlanId; interval: BillingInterval } | null {
  if (!priceId) return null;
  for (const { plan, interval, envKey } of allPriceSlots()) {
    if (env[envKey] && env[envKey] === priceId) return { plan, interval };
  }
  return null;
}
