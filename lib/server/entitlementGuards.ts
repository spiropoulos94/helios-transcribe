/**
 * Server-side entitlement guards for API routes. These are the real enforcement —
 * the client is UX only. Each guard reads the user's live entitlements and returns a
 * discriminated result; the route turns a denial into a NextResponse.
 */

import {
  canUseAiTool,
  minPlanForAiTool,
  minPlanForFeature,
  planRank,
  type Entitlements,
} from '@/lib/billing/entitlements';
import { getEntitlements } from '@/lib/server/subscriptionRepo';
import { getUsageSnapshot } from '@/lib/server/usageRepo';
import { evaluateQuota, type UsageSnapshot } from '@/lib/billing/usage';
import type { AiToolType } from '@/lib/ai/journalistPrompts';
import type { PlanId } from '@/lib/pricing/plans';

export type GuardResult =
  | { allowed: true; entitlements: Entitlements }
  | { allowed: false; status: number; error: string; requiredPlan: PlanId | null };

export async function requireAiTool(
  userId: string,
  tool: AiToolType
): Promise<GuardResult> {
  const entitlements = await getEntitlements(userId);
  if (canUseAiTool(entitlements, tool)) return { allowed: true, entitlements };
  return {
    allowed: false,
    status: 403,
    error: `The "${tool}" tool is not available on your plan.`,
    requiredPlan: minPlanForAiTool(tool),
  };
}

export async function requireMinPlan(
  userId: string,
  minPlan: PlanId
): Promise<GuardResult> {
  const entitlements = await getEntitlements(userId);
  if (planRank(entitlements.plan) >= planRank(minPlan)) {
    return { allowed: true, entitlements };
  }
  return {
    allowed: false,
    status: 403,
    error: `This feature requires the ${minPlan} plan or higher.`,
    requiredPlan: minPlan,
  };
}

export async function requireFeature(
  userId: string,
  feature: keyof Entitlements['features']
): Promise<GuardResult> {
  const entitlements = await getEntitlements(userId);
  if (entitlements.features[feature] === true) return { allowed: true, entitlements };
  return {
    allowed: false,
    status: 403,
    error: `This feature is not available on your plan.`,
    requiredPlan: minPlanForFeature(feature),
  };
}

export type QuotaResult =
  | { allowed: true; snapshot: UsageSnapshot }
  | {
      allowed: false;
      status: 402;
      error: string;
      snapshot: UsageSnapshot;
      requiredPlan: PlanId | null;
    };

/**
 * Enforce the transcription minutes quota. `estimatedSeconds` is a client-declared hint
 * used to reject up-front; authoritative metering happens after the job completes.
 */
export async function requireTranscriptionQuota(
  userId: string,
  estimatedSeconds = 0
): Promise<QuotaResult> {
  const snapshot = await getUsageSnapshot(userId);
  const decision = evaluateQuota(snapshot, estimatedSeconds);
  if (decision.allowed) return { allowed: true, snapshot };

  const nextPlan = suggestUpgradePlan(snapshot.plan);
  const error =
    decision.reason === 'would-exceed'
      ? `This file would exceed your remaining ${formatMinutes(
          snapshot.remainingMinutes
        )} this period.`
      : `You've used all ${formatMinutes(
          snapshot.limitMinutes
        )} of your ${snapshot.plan} plan this period.`;

  return { allowed: false, status: 402, error, snapshot, requiredPlan: nextPlan };
}

function formatMinutes(minutes: number | null): string {
  if (minutes === null) return 'unlimited minutes';
  return `${Math.max(0, Math.round(minutes))} min`;
}

/** The next plan up that offers more minutes (for upgrade messaging). */
function suggestUpgradePlan(plan: PlanId): PlanId | null {
  switch (plan) {
    case 'free':
      return 'pro';
    case 'pro':
      return 'creator';
    case 'creator':
    case 'newsroom':
      return null; // already at the top minute tier
  }
}
