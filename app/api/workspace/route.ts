import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { requireFeature } from '@/lib/server/entitlementGuards';
import { getSubscription } from '@/lib/server/subscriptionRepo';
import { createWorkspace, getUserWorkspaces } from '@/lib/server/workspaceRepo';

export const dynamic = 'force-dynamic';

/** GET /api/workspace — list workspaces the user belongs to. */
export async function GET() {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;
  const userId = auth.session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const memberships = await getUserWorkspaces(userId);
  return NextResponse.json({
    workspaces: memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      role: m.role,
      seats: m.workspace.seats,
    })),
  });
}

/** POST /api/workspace — create a team workspace (Newsroom). Body: { name }. */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;
  const userId = auth.session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const guard = await requireFeature(userId, 'team');
  if (!guard.allowed) {
    return NextResponse.json(
      { error: guard.error, requiredPlan: guard.requiredPlan },
      { status: guard.status }
    );
  }

  let body: { name?: string };
  try {
    body = (await request.json()) as { name?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 });

  // Seat capacity mirrors the owner's billed Newsroom seats.
  const sub = await getSubscription(userId);
  const workspace = await createWorkspace(userId, name, sub?.seats ?? 1);
  return NextResponse.json({ workspace });
}
