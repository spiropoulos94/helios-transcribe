/**
 * Entitlements engine — the single source of truth for what each plan can do.
 *
 * This module is intentionally **pure**: no imports of Prisma, Stripe, or anything
 * server-only, so it can be shared by the API routes (for enforcement) and by client
 * components (for UX). Never trust the client copy for enforcement — every gate is
 * re-checked server-side at the point of value creation.
 *
 * Stripe products/prices are mirrored from this config (see `scripts/stripe-sync.ts`),
 * never the reverse.
 */

import type { PlanId } from '@/lib/pricing/plans';
import type { AiToolType } from '@/lib/ai/journalistPrompts';

export type ExportFormat = 'txt' | 'docx' | 'pdf' | 'srt' | 'vtt';

export interface Entitlements {
  plan: PlanId;
  limits: {
    /** Transcription minutes per billing period. `null` = unlimited. */
    monthlyMinutes: number | null;
    /** Number of saved files. `null` = unlimited. */
    savedFiles: number | null;
    /** Seats included with the base plan unit (team plans only). Non-team plans = 0. */
    teamSeats: number;
  };
  features: {
    /** Free exports carry a watermark. */
    watermark: boolean;
    allowedExports: ExportFormat[];
    /** AI content tools this plan may run. */
    aiTools: AiToolType[];
    /** Highlights & quote export. */
    highlights: boolean;
    /** RSS auto-import. */
    rss: boolean;
    /** Priority processing queue. */
    priorityProcessing: boolean;
    /** Team workspace, roles & seat-based collaboration. */
    team: boolean;
  };
}

/** Plan ordering, low → high. Used for inclusivity checks & upgrade messaging. */
export const PLAN_ORDER: PlanId[] = ['free', 'pro', 'creator', 'newsroom'];

export function planRank(plan: PlanId): number {
  const i = PLAN_ORDER.indexOf(plan);
  return i === -1 ? 0 : i;
}

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && (PLAN_ORDER as string[]).includes(value);
}

const HOUR = 60;

/**
 * Per-plan entitlements. Tiers are inclusive of lower tiers (Creator has everything
 * Pro has, etc.). Minutes for Newsroom match Creator but apply per member.
 */
export const PLAN_ENTITLEMENTS: Record<PlanId, Entitlements> = {
  free: {
    plan: 'free',
    limits: { monthlyMinutes: 30, savedFiles: 1, teamSeats: 0 },
    features: {
      watermark: true,
      allowedExports: ['txt'],
      aiTools: [],
      highlights: false,
      rss: false,
      priorityProcessing: false,
      team: false,
    },
  },
  pro: {
    plan: 'pro',
    limits: { monthlyMinutes: 5 * HOUR, savedFiles: null, teamSeats: 0 },
    features: {
      watermark: false,
      allowedExports: ['txt', 'docx', 'pdf', 'srt', 'vtt'],
      aiTools: ['summary', 'article'],
      highlights: true,
      rss: false,
      priorityProcessing: false,
      team: false,
    },
  },
  creator: {
    plan: 'creator',
    limits: { monthlyMinutes: 30 * HOUR, savedFiles: null, teamSeats: 0 },
    features: {
      watermark: false,
      allowedExports: ['txt', 'docx', 'pdf', 'srt', 'vtt'],
      aiTools: ['summary', 'article', 'show-notes', 'clips'],
      highlights: true,
      rss: true,
      priorityProcessing: true,
      team: false,
    },
  },
  newsroom: {
    plan: 'newsroom',
    limits: { monthlyMinutes: 30 * HOUR, savedFiles: null, teamSeats: 1 },
    features: {
      watermark: false,
      allowedExports: ['txt', 'docx', 'pdf', 'srt', 'vtt'],
      aiTools: ['summary', 'article', 'show-notes', 'clips'],
      highlights: true,
      rss: true,
      priorityProcessing: true,
      team: true,
    },
  },
};

/** Pure: resolve a plan id to its entitlements (defaults to Free for unknown input). */
export function entitlementsForPlan(plan: PlanId | string | null | undefined): Entitlements {
  if (isPlanId(plan)) return PLAN_ENTITLEMENTS[plan];
  return PLAN_ENTITLEMENTS.free;
}

export function canUseAiTool(ent: Entitlements, tool: AiToolType): boolean {
  return ent.features.aiTools.includes(tool);
}

export function canExport(ent: Entitlements, format: ExportFormat): boolean {
  return ent.features.allowedExports.includes(format);
}

/** The lowest plan that unlocks a given AI tool, for upgrade prompts. */
export function minPlanForAiTool(tool: AiToolType): PlanId {
  for (const plan of PLAN_ORDER) {
    if (PLAN_ENTITLEMENTS[plan].features.aiTools.includes(tool)) return plan;
  }
  return 'newsroom';
}

/** The lowest plan that unlocks a given feature flag, for upgrade prompts. */
export function minPlanForFeature(
  feature: keyof Entitlements['features']
): PlanId | null {
  for (const plan of PLAN_ORDER) {
    const value = PLAN_ENTITLEMENTS[plan].features[feature];
    if (value === true) return plan;
  }
  return null;
}

/** Minimal subscription shape needed to resolve the *effective* plan. */
export interface EffectivePlanInput {
  plan: string;
  status: string;
  cancelAtPeriodEnd?: boolean | null;
  currentPeriodEnd?: Date | null;
}

/** Stripe statuses that grant access to the paid tier (incl. the grace window). */
const ACCESS_STATUSES = new Set(['active', 'trialing', 'past_due']);

/**
 * Resolve the plan a subscription currently grants, accounting for status and
 * cancel-at-period-end. Pure and testable. Defaults to Free for missing/expired subs.
 */
export function resolveEffectivePlan(
  sub: EffectivePlanInput | null | undefined,
  now: Date = new Date()
): PlanId {
  if (!sub) return 'free';
  const plan = isPlanId(sub.plan) ? sub.plan : 'free';
  if (plan === 'free') return 'free';
  if (!ACCESS_STATUSES.has(sub.status)) return 'free';
  // Period has ended and the sub was set to cancel → drop to Free (the `deleted`
  // webhook normally does this; we also guard here against webhook lag).
  if (sub.cancelAtPeriodEnd && sub.currentPeriodEnd && now >= sub.currentPeriodEnd) {
    return 'free';
  }
  return plan;
}
