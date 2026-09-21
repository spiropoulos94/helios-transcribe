import { describe, it, expect } from 'vitest';
import {
  getBillingPeriod,
  minutesUsedInPeriod,
  buildUsageSnapshot,
  evaluateQuota,
  type UsageSnapshot,
} from '@/lib/billing/usage';

describe('getBillingPeriod', () => {
  it('uses the subscription window when present', () => {
    const start = new Date('2026-03-10T00:00:00Z');
    const end = new Date('2026-04-10T00:00:00Z');
    const period = getBillingPeriod({ currentPeriodStart: start, currentPeriodEnd: end });
    expect(period.start).toEqual(start);
    expect(period.end).toEqual(end);
  });

  it('falls back to the calendar month (UTC) with no subscription', () => {
    const now = new Date('2026-03-15T12:00:00Z');
    const period = getBillingPeriod(null, now);
    expect(period.start.toISOString()).toBe('2026-03-01T00:00:00.000Z');
    expect(period.end.toISOString()).toBe('2026-04-01T00:00:00.000Z');
  });

  it('rolls the calendar month over in December', () => {
    const now = new Date('2026-12-20T00:00:00Z');
    const period = getBillingPeriod(undefined, now);
    expect(period.end.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });
});

describe('minutesUsedInPeriod', () => {
  const period = {
    start: new Date('2026-03-01T00:00:00Z'),
    end: new Date('2026-04-01T00:00:00Z'),
  };

  it('sums only rows inside the window', () => {
    const used = minutesUsedInPeriod(
      [
        { durationSeconds: 600, createdAt: new Date('2026-03-05T00:00:00Z') }, // 10 min in
        { durationSeconds: 300, createdAt: new Date('2026-02-28T00:00:00Z') }, // before
        { durationSeconds: 120, createdAt: new Date('2026-04-01T00:00:00Z') }, // at end (exclusive)
        { durationSeconds: 60, createdAt: new Date('2026-03-31T23:59:00Z') }, // 1 min in
      ],
      period
    );
    expect(used).toBeCloseTo(11, 5);
  });

  it('ignores negative durations', () => {
    const used = minutesUsedInPeriod(
      [{ durationSeconds: -600, createdAt: new Date('2026-03-05T00:00:00Z') }],
      period
    );
    expect(used).toBe(0);
  });
});

describe('buildUsageSnapshot', () => {
  const period = {
    start: new Date('2026-03-01T00:00:00Z'),
    end: new Date('2026-04-01T00:00:00Z'),
  };

  it('computes used/remaining against the plan limit', () => {
    const snap = buildUsageSnapshot(
      'free',
      [{ durationSeconds: 1200, createdAt: new Date('2026-03-02T00:00:00Z') }], // 20 min
      period
    );
    expect(snap.plan).toBe('free');
    expect(snap.limitMinutes).toBe(30);
    expect(snap.usedMinutes).toBe(20);
    expect(snap.remainingMinutes).toBe(10);
  });

  it('never reports negative remaining', () => {
    const snap = buildUsageSnapshot(
      'free',
      [{ durationSeconds: 3000, createdAt: new Date('2026-03-02T00:00:00Z') }], // 50 min > 30
      period
    );
    expect(snap.remainingMinutes).toBe(0);
  });
});

describe('evaluateQuota', () => {
  const base: UsageSnapshot = {
    plan: 'free',
    limitMinutes: 30,
    usedMinutes: 20,
    remainingMinutes: 10,
    periodStart: '2026-03-01T00:00:00.000Z',
    periodEnd: '2026-04-01T00:00:00.000Z',
  };

  it('allows a job that fits the remaining minutes', () => {
    expect(evaluateQuota(base, 300).allowed).toBe(true); // 5 min ≤ 10
  });

  it('rejects a job that would exceed the remainder', () => {
    const d = evaluateQuota(base, 900); // 15 min > 10
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe('would-exceed');
  });

  it('rejects when the limit is already reached', () => {
    const d = evaluateQuota({ ...base, usedMinutes: 30, remainingMinutes: 0 }, 60);
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe('limit-reached');
  });

  it('always allows unlimited plans', () => {
    const d = evaluateQuota(
      { ...base, limitMinutes: null, remainingMinutes: null },
      999999
    );
    expect(d.allowed).toBe(true);
  });
});
