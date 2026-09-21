import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { getEntitlements } from '@/lib/server/subscriptionRepo';
import { getUsageSnapshot } from '@/lib/server/usageRepo';

export const dynamic = 'force-dynamic';

/**
 * GET /api/billing/entitlements
 * Returns the signed-in user's plan, entitlements, and current-period usage.
 * For UI only — never trust this for enforcement (routes re-check server-side).
 */
export async function GET() {
  const authResult = await requireAuth();
  if (!authResult.authorized) return authResult.response;

  const userId = authResult.session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [entitlements, usage] = await Promise.all([
    getEntitlements(userId),
    getUsageSnapshot(userId),
  ]);

  return NextResponse.json({ plan: entitlements.plan, entitlements, usage });
}
