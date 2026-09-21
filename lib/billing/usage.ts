/**
 * Pure usage-metering math. No DB/network here so it can be unit-tested in isolation;
 * the repository layer (`lib/server/usageRepo.ts`) supplies the raw rows.
 */

import { entitlementsForPlan } from '@/lib/billing/entitlements';
import type { PlanId } from '@/lib/pricing/plans';

export interface UsageRow {
  durationSeconds: number;
  createdAt: Date;
}

export interface PeriodSubscription {
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
}

export interface BillingPeriod {
  start: Date;
  end: Date;
}

/**
 * The billing period to meter against.
 * - Paid subscription with Stripe period dates → use those.
 * - Free / no subscription → the calendar month (UTC, 1st → next 1st).
 */
export function getBillingPeriod(
  subscription: PeriodSubscription | null | undefined,
  now: Date = new Date()
): BillingPeriod {
  if (subscription?.currentPeriodStart && subscription?.currentPeriodEnd) {
    return {
      start: subscription.currentPeriodStart,
      end: subscription.currentPeriodEnd,
    };
  }
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

/** Sum minutes used within [period.start, period.end). */
export function minutesUsedInPeriod(rows: UsageRow[], period: BillingPeriod): number {
  const seconds = rows.reduce((sum, row) => {
    if (row.createdAt >= period.start && row.createdAt < period.end) {
      return sum + Math.max(0, row.durationSeconds);
    }
    return sum;
  }, 0);
  return seconds / 60;
}

export interface UsageSnapshot {
  plan: PlanId;
  limitMinutes: number | null; // null = unlimited
  usedMinutes: number;
  remainingMinutes: number | null; // null = unlimited
  periodStart: string; // ISO
  periodEnd: string; // ISO
}

export function buildUsageSnapshot(
  plan: PlanId,
  rows: UsageRow[],
  period: BillingPeriod
): UsageSnapshot {
  const limitMinutes = entitlementsForPlan(plan).limits.monthlyMinutes;
  const usedMinutes = Math.round(minutesUsedInPeriod(rows, period) * 100) / 100;
  const remainingMinutes =
    limitMinutes === null ? null : Math.max(0, limitMinutes - usedMinutes);
  return {
    plan,
    limitMinutes,
    usedMinutes,
    remainingMinutes,
    periodStart: period.start.toISOString(),
    periodEnd: period.end.toISOString(),
  };
}

export interface QuotaDecision {
  allowed: boolean;
  reason?: 'limit-reached' | 'would-exceed';
  remainingMinutes: number | null;
  limitMinutes: number | null;
}

/**
 * Decide whether a new transcription of `estimatedSeconds` may proceed.
 * `estimatedSeconds` is a client-declared hint; it is only used to reject up-front.
 * The authoritative minutes are recorded after processing (see the transcribe route).
 */
export function evaluateQuota(
  snapshot: UsageSnapshot,
  estimatedSeconds = 0
): QuotaDecision {
  if (snapshot.limitMinutes === null || snapshot.remainingMinutes === null) {
    return { allowed: true, remainingMinutes: null, limitMinutes: null };
  }
  if (snapshot.remainingMinutes <= 0) {
    return {
      allowed: false,
      reason: 'limit-reached',
      remainingMinutes: snapshot.remainingMinutes,
      limitMinutes: snapshot.limitMinutes,
    };
  }
  const estimatedMinutes = Math.max(0, estimatedSeconds) / 60;
  if (estimatedMinutes > snapshot.remainingMinutes) {
    return {
      allowed: false,
      reason: 'would-exceed',
      remainingMinutes: snapshot.remainingMinutes,
      limitMinutes: snapshot.limitMinutes,
    };
  }
  return {
    allowed: true,
    remainingMinutes: snapshot.remainingMinutes,
    limitMinutes: snapshot.limitMinutes,
  };
}
