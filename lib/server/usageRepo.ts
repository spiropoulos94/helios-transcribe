/**
 * Server-only repository for usage metering. Writes one `UsageRecord` per completed
 * transcription and computes usage for the current billing period.
 */

import { prisma } from '@/lib/prisma';
import { getSubscription } from '@/lib/server/subscriptionRepo';
import { resolveEffectivePlan } from '@/lib/billing/entitlements';
import {
  getBillingPeriod,
  buildUsageSnapshot,
  type UsageSnapshot,
} from '@/lib/billing/usage';

/** Record consumed minutes for a user (called after a successful transcription). */
export async function recordUsage(input: {
  userId: string;
  durationSeconds: number;
  costUsd?: number | null;
  provider?: string | null;
}): Promise<void> {
  await prisma.usageRecord.create({
    data: {
      userId: input.userId,
      durationSeconds: Math.max(0, Math.round(input.durationSeconds)),
      costUsd: input.costUsd ?? null,
      provider: input.provider ?? null,
    },
  });
}

/**
 * Compute the usage snapshot for a user's current billing period: which plan, the
 * minutes limit, minutes used, minutes remaining, and the period window.
 */
export async function getUsageSnapshot(userId: string): Promise<UsageSnapshot> {
  const now = new Date();
  const sub = await getSubscription(userId);
  const plan = resolveEffectivePlan(sub, now);
  const period = getBillingPeriod(sub, now);

  const rows = await prisma.usageRecord.findMany({
    where: { userId, createdAt: { gte: period.start, lt: period.end } },
    select: { durationSeconds: true, createdAt: true },
  });

  return buildUsageSnapshot(plan, rows, period);
}
