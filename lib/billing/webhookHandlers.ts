/**
 * Pure derivation of our stored subscription state from a Stripe subscription object,
 * plus the out-of-order guard. Kept free of DB/network so it can be unit-tested; the
 * repository (`lib/server/subscriptionRepo.ts`) persists the result and the webhook
 * route (`app/api/billing/webhook/route.ts`) wires it up with idempotency.
 */

import type Stripe from 'stripe';
import type { PlanId } from '@/lib/pricing/plans';
import { planFromPriceId, type BillingInterval } from '@/lib/billing/priceMapping';

/** The subset of `Subscription` columns a Stripe event drives. */
export interface SubscriptionState {
  plan: PlanId;
  status: string;
  interval: BillingInterval | null;
  seats: number;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  /** Unix seconds of the event that produced this state (out-of-order guard). */
  eventTs: number;
}

function toDate(unixSeconds: number | null | undefined): Date | null {
  return typeof unixSeconds === 'number' ? new Date(unixSeconds * 1000) : null;
}

function customerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer): string {
  return typeof customer === 'string' ? customer : customer.id;
}

/**
 * The billing period lives on the subscription item (Stripe API 2025+), not on the
 * subscription itself. Read it from the first item.
 */
function readPeriod(sub: Stripe.Subscription): { start: Date | null; end: Date | null } {
  const item = sub.items?.data?.[0];
  return {
    start: toDate(item?.current_period_start),
    end: toDate(item?.current_period_end),
  };
}

/**
 * Derive our stored state from a Stripe subscription object. The plan is resolved from
 * the price id via the env-driven map; an unknown price falls back to Free so we never
 * grant access we can't map.
 */
export function subscriptionStateFromStripe(
  sub: Stripe.Subscription,
  eventTs: number,
  env: NodeJS.ProcessEnv = process.env
): SubscriptionState {
  const item = sub.items?.data?.[0];
  const price = item?.price;
  const mapped = planFromPriceId(price?.id, env);
  const period = readPeriod(sub);
  const seats = item?.quantity ?? 1;

  return {
    plan: mapped?.plan ?? 'free',
    status: sub.status,
    interval: mapped?.interval ?? intervalFromPrice(price) ?? null,
    seats,
    cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
    currentPeriodStart: period.start,
    currentPeriodEnd: period.end,
    stripeCustomerId: customerId(sub.customer),
    stripeSubscriptionId: sub.id,
    stripePriceId: price?.id ?? null,
    eventTs,
  };
}

function intervalFromPrice(
  price: Stripe.Price | null | undefined
): BillingInterval | null {
  const recurring = price?.recurring?.interval;
  if (recurring === 'month' || recurring === 'year') return recurring;
  return null;
}

/** The Free reset applied when a subscription is deleted/canceled. */
export function deletedSubscriptionState(
  sub: Stripe.Subscription,
  eventTs: number
): SubscriptionState {
  return {
    plan: 'free',
    status: 'canceled',
    interval: null,
    seats: 1,
    cancelAtPeriodEnd: false,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    stripeCustomerId: customerId(sub.customer),
    stripeSubscriptionId: null,
    stripePriceId: null,
    eventTs,
  };
}

/**
 * Out-of-order guard: only apply an incoming event if it is at least as new as the last
 * one we applied. `storedEventTs === null` means we've never applied a Stripe event.
 */
export function shouldApplyEvent(
  storedEventTs: number | null | undefined,
  incomingEventTs: number
): boolean {
  if (storedEventTs === null || storedEventTs === undefined) return true;
  return incomingEventTs >= storedEventTs;
}
