/**
 * Server-only idempotency ledger for Stripe webhooks. One row per processed event id.
 */

import { prisma } from '@/lib/prisma';

/**
 * Atomically mark a Stripe event as processed. Returns `true` if this is the first time
 * we've seen the event (caller should process it), `false` if it was already recorded
 * (caller should skip — a duplicate delivery).
 */
export async function markEventProcessed(id: string, type: string): Promise<boolean> {
  try {
    await prisma.processedStripeEvent.create({ data: { id, type } });
    return true;
  } catch {
    // Unique-constraint violation → already processed.
    return false;
  }
}

/**
 * Release a previously-claimed event id. Called when handling fails, so a Stripe retry
 * of the same event is reprocessed rather than skipped as a duplicate.
 */
export async function releaseEvent(id: string): Promise<void> {
  try {
    await prisma.processedStripeEvent.delete({ where: { id } });
  } catch {
    // Already gone — nothing to release.
  }
}
