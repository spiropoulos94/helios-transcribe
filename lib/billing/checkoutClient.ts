/**
 * Client-side helpers to start Stripe Checkout and open the Customer Portal.
 * They call our server routes (which do the real work + enforcement) and redirect the
 * browser to the returned Stripe URL. No secrets here.
 */

import type { BillingInterval } from '@/lib/billing/priceMapping';
import type { PlanId } from '@/lib/pricing/plans';

async function postJson(url: string, body?: unknown): Promise<{ url?: string; error?: string }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return (await res.json().catch(() => ({}))) as { url?: string; error?: string };
}

/** Start Checkout for a plan+interval (+seats for Newsroom). Redirects on success. */
export async function startCheckout(
  plan: PlanId,
  interval: BillingInterval,
  seats?: number
): Promise<{ error?: string }> {
  const data = await postJson('/api/billing/checkout', { plan, interval, seats });
  if (data.url) {
    window.location.href = data.url;
    return {};
  }
  return { error: data.error ?? 'Could not start checkout' };
}

/** Open the Stripe Customer Portal. Redirects on success. */
export async function openBillingPortal(): Promise<{ error?: string }> {
  const data = await postJson('/api/billing/portal');
  if (data.url) {
    window.location.href = data.url;
    return {};
  }
  return { error: data.error ?? 'Could not open billing portal' };
}
