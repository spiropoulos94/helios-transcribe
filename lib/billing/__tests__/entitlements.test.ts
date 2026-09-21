import { describe, it, expect } from 'vitest';
import {
  entitlementsForPlan,
  resolveEffectivePlan,
  canUseAiTool,
  canExport,
  minPlanForAiTool,
  minPlanForFeature,
  planRank,
  PLAN_ORDER,
} from '@/lib/billing/entitlements';

describe('entitlementsForPlan', () => {
  it('returns the right entitlements per plan', () => {
    expect(entitlementsForPlan('free').limits.monthlyMinutes).toBe(30);
    expect(entitlementsForPlan('pro').limits.monthlyMinutes).toBe(300);
    expect(entitlementsForPlan('creator').limits.monthlyMinutes).toBe(1800);
    expect(entitlementsForPlan('newsroom').limits.monthlyMinutes).toBe(1800);
  });

  it('defaults unknown/empty plans to Free', () => {
    expect(entitlementsForPlan('nonsense').plan).toBe('free');
    expect(entitlementsForPlan(null).plan).toBe('free');
    expect(entitlementsForPlan(undefined).plan).toBe('free');
  });

  it('only Free carries a watermark and is limited to txt', () => {
    expect(entitlementsForPlan('free').features.watermark).toBe(true);
    expect(entitlementsForPlan('free').features.allowedExports).toEqual(['txt']);
    expect(entitlementsForPlan('pro').features.watermark).toBe(false);
  });

  it('Free has 1 saved file, paid plans are unlimited', () => {
    expect(entitlementsForPlan('free').limits.savedFiles).toBe(1);
    expect(entitlementsForPlan('pro').limits.savedFiles).toBeNull();
  });

  it('is inclusive: higher tiers keep lower-tier tools', () => {
    const pro = entitlementsForPlan('pro').features.aiTools;
    const creator = entitlementsForPlan('creator').features.aiTools;
    for (const tool of pro) expect(creator).toContain(tool);
    expect(creator).toContain('show-notes');
    expect(creator).toContain('clips');
    expect(pro).not.toContain('show-notes');
  });

  it('gates features to the right tiers', () => {
    expect(entitlementsForPlan('pro').features.rss).toBe(false);
    expect(entitlementsForPlan('creator').features.rss).toBe(true);
    expect(entitlementsForPlan('creator').features.team).toBe(false);
    expect(entitlementsForPlan('newsroom').features.team).toBe(true);
  });
});

describe('capability helpers', () => {
  it('canUseAiTool respects the plan', () => {
    expect(canUseAiTool(entitlementsForPlan('free'), 'summary')).toBe(false);
    expect(canUseAiTool(entitlementsForPlan('pro'), 'summary')).toBe(true);
    expect(canUseAiTool(entitlementsForPlan('pro'), 'clips')).toBe(false);
    expect(canUseAiTool(entitlementsForPlan('creator'), 'clips')).toBe(true);
  });

  it('canExport respects the plan', () => {
    expect(canExport(entitlementsForPlan('free'), 'srt')).toBe(false);
    expect(canExport(entitlementsForPlan('free'), 'txt')).toBe(true);
    expect(canExport(entitlementsForPlan('pro'), 'srt')).toBe(true);
  });

  it('minPlanForAiTool / minPlanForFeature point at the unlocking tier', () => {
    expect(minPlanForAiTool('summary')).toBe('pro');
    expect(minPlanForAiTool('clips')).toBe('creator');
    expect(minPlanForFeature('rss')).toBe('creator');
    expect(minPlanForFeature('team')).toBe('newsroom');
    expect(minPlanForFeature('highlights')).toBe('pro');
  });

  it('planRank orders low → high', () => {
    expect(planRank('free')).toBeLessThan(planRank('pro'));
    expect(planRank('pro')).toBeLessThan(planRank('creator'));
    expect(planRank('creator')).toBeLessThan(planRank('newsroom'));
    expect(PLAN_ORDER).toEqual(['free', 'pro', 'creator', 'newsroom']);
  });
});

describe('resolveEffectivePlan', () => {
  const future = new Date('2030-01-01');
  const past = new Date('2000-01-01');
  const now = new Date('2026-01-01');

  it('defaults to free when there is no subscription', () => {
    expect(resolveEffectivePlan(null, now)).toBe('free');
  });

  it('grants the plan while active', () => {
    expect(resolveEffectivePlan({ plan: 'pro', status: 'active' }, now)).toBe('pro');
    expect(resolveEffectivePlan({ plan: 'creator', status: 'trialing' }, now)).toBe('creator');
  });

  it('keeps access during the past_due grace window', () => {
    expect(resolveEffectivePlan({ plan: 'pro', status: 'past_due' }, now)).toBe('pro');
  });

  it('drops to free for canceled/unpaid statuses', () => {
    expect(resolveEffectivePlan({ plan: 'pro', status: 'canceled' }, now)).toBe('free');
    expect(resolveEffectivePlan({ plan: 'pro', status: 'incomplete_expired' }, now)).toBe('free');
  });

  it('keeps the plan until period end when set to cancel', () => {
    expect(
      resolveEffectivePlan(
        { plan: 'creator', status: 'active', cancelAtPeriodEnd: true, currentPeriodEnd: future },
        now
      )
    ).toBe('creator');
  });

  it('drops to free once a cancel-at-period-end period has ended', () => {
    expect(
      resolveEffectivePlan(
        { plan: 'creator', status: 'active', cancelAtPeriodEnd: true, currentPeriodEnd: past },
        now
      )
    ).toBe('free');
  });

  it('never grants an unknown plan string', () => {
    expect(resolveEffectivePlan({ plan: 'enterprise', status: 'active' }, now)).toBe('free');
  });
});
