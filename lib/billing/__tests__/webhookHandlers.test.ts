import { describe, it, expect } from 'vitest';
import type Stripe from 'stripe';
import {
  subscriptionStateFromStripe,
  deletedSubscriptionState,
  shouldApplyEvent,
} from '@/lib/billing/webhookHandlers';

const ENV = {
  STRIPE_PRICE_PRO_MONTHLY: 'price_pro_m',
  STRIPE_PRICE_CREATOR_ANNUAL: 'price_creator_y',
} as unknown as NodeJS.ProcessEnv;

interface SubOpts {
  id?: string;
  customer?: string;
  status?: string;
  cancelAtPeriodEnd?: boolean;
  priceId?: string;
  quantity?: number;
  periodStart?: number;
  periodEnd?: number;
  interval?: 'month' | 'year';
}

function makeSub(opts: SubOpts = {}): Stripe.Subscription {
  return {
    id: opts.id ?? 'sub_1',
    status: opts.status ?? 'active',
    cancel_at_period_end: opts.cancelAtPeriodEnd ?? false,
    customer: opts.customer ?? 'cus_1',
    items: {
      data: [
        {
          quantity: opts.quantity ?? 1,
          current_period_start: opts.periodStart ?? 1_700_000_000,
          current_period_end: opts.periodEnd ?? 1_702_000_000,
          price: {
            id: opts.priceId ?? 'price_pro_m',
            recurring: { interval: opts.interval ?? 'month' },
          },
        },
      ],
    },
  } as unknown as Stripe.Subscription;
}

describe('subscriptionStateFromStripe', () => {
  it('maps a known price id to the plan + interval', () => {
    const state = subscriptionStateFromStripe(makeSub({ priceId: 'price_pro_m' }), 100, ENV);
    expect(state.plan).toBe('pro');
    expect(state.interval).toBe('month');
    expect(state.stripePriceId).toBe('price_pro_m');
    expect(state.stripeCustomerId).toBe('cus_1');
    expect(state.stripeSubscriptionId).toBe('sub_1');
    expect(state.eventTs).toBe(100);
  });

  it('reads seats from the item quantity and period from the item', () => {
    const state = subscriptionStateFromStripe(
      makeSub({ priceId: 'price_creator_y', quantity: 5, periodStart: 1_710_000_000, periodEnd: 1_712_000_000 }),
      1,
      ENV
    );
    expect(state.plan).toBe('creator');
    expect(state.interval).toBe('year');
    expect(state.seats).toBe(5);
    expect(state.currentPeriodStart).toEqual(new Date(1_710_000_000 * 1000));
    expect(state.currentPeriodEnd).toEqual(new Date(1_712_000_000 * 1000));
  });

  it('falls back to Free for an unmapped price (never grants unknown access)', () => {
    const state = subscriptionStateFromStripe(makeSub({ priceId: 'price_unknown' }), 1, ENV);
    expect(state.plan).toBe('free');
    // interval still derived from the Stripe price recurring interval
    expect(state.interval).toBe('month');
  });

  it('carries the Stripe status through', () => {
    const state = subscriptionStateFromStripe(makeSub({ status: 'past_due' }), 1, ENV);
    expect(state.status).toBe('past_due');
  });
});

describe('deletedSubscriptionState', () => {
  it('resets to Free/canceled and clears the subscription id', () => {
    const state = deletedSubscriptionState(makeSub({ customer: 'cus_9' }), 42);
    expect(state.plan).toBe('free');
    expect(state.status).toBe('canceled');
    expect(state.stripeSubscriptionId).toBeNull();
    expect(state.stripePriceId).toBeNull();
    expect(state.stripeCustomerId).toBe('cus_9');
    expect(state.eventTs).toBe(42);
  });
});

describe('shouldApplyEvent (out-of-order guard)', () => {
  it('applies the first-ever event', () => {
    expect(shouldApplyEvent(null, 100)).toBe(true);
    expect(shouldApplyEvent(undefined, 100)).toBe(true);
  });

  it('applies a newer or equal event', () => {
    expect(shouldApplyEvent(100, 100)).toBe(true); // idempotent replay of same ts
    expect(shouldApplyEvent(100, 150)).toBe(true);
  });

  it('ignores a stale (older) event', () => {
    expect(shouldApplyEvent(150, 100)).toBe(false);
  });
});
