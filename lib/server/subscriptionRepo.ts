/**
 * Server-only repository for subscriptions. Reads/writes the single `Subscription` row
 * per user and resolves entitlements. Every write from a Stripe webhook goes through
 * `applySubscriptionState`, which enforces the out-of-order guard.
 */

import { prisma } from '@/lib/prisma';
import {
  entitlementsForPlan,
  resolveEffectivePlan,
  type Entitlements,
} from '@/lib/billing/entitlements';
import { shouldApplyEvent, type SubscriptionState } from '@/lib/billing/webhookHandlers';
import type { Subscription } from '@prisma/client';

export function getSubscription(userId: string): Promise<Subscription | null> {
  return prisma.subscription.findUnique({ where: { userId } });
}

/** Resolve the entitlements a user currently has (defaults to Free). */
export async function getEntitlements(userId: string): Promise<Entitlements> {
  const sub = await getSubscription(userId);
  const plan = resolveEffectivePlan(sub, new Date());
  return entitlementsForPlan(plan);
}

/** Find a subscription by Stripe customer id (webhooks arrive keyed by customer). */
export function getSubscriptionByStripeCustomer(
  stripeCustomerId: string
): Promise<Subscription | null> {
  return prisma.subscription.findFirst({ where: { stripeCustomerId } });
}

/** Ensure a subscription row exists for a user (Free default), returning it. */
export async function ensureSubscription(userId: string): Promise<Subscription> {
  return prisma.subscription.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

/** Persist the Stripe customer id on a user's subscription (creating the row). */
export async function setStripeCustomerId(
  userId: string,
  stripeCustomerId: string
): Promise<Subscription> {
  return prisma.subscription.upsert({
    where: { userId },
    create: { userId, stripeCustomerId },
    update: { stripeCustomerId },
  });
}

/**
 * Apply a derived subscription state, keyed by Stripe customer id, honoring the
 * out-of-order guard. Returns the updated row, or null when the customer has no local
 * subscription row (should not happen once checkout has stored the customer id).
 */
export async function applySubscriptionState(
  state: SubscriptionState
): Promise<Subscription | null> {
  const existing = state.stripeCustomerId
    ? await getSubscriptionByStripeCustomer(state.stripeCustomerId)
    : null;

  if (!existing) return null;

  if (!shouldApplyEvent(existing.stripeEventTs, state.eventTs)) {
    // A newer event has already been applied; ignore this stale one.
    return existing;
  }

  return prisma.subscription.update({
    where: { id: existing.id },
    data: {
      plan: state.plan,
      status: state.status,
      interval: state.interval,
      seats: state.seats,
      cancelAtPeriodEnd: state.cancelAtPeriodEnd,
      currentPeriodStart: state.currentPeriodStart,
      currentPeriodEnd: state.currentPeriodEnd,
      stripeSubscriptionId: state.stripeSubscriptionId,
      stripePriceId: state.stripePriceId,
      stripeEventTs: state.eventTs,
    },
  });
}
