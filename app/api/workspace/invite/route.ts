import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import {
  createInvite,
  hasWorkspaceRole,
  isWorkspaceRole,
} from '@/lib/server/workspaceRepo';

export const dynamic = 'force-dynamic';

/**
 * POST /api/workspace/invite — invite a member (owner/admin).
 * Body: { workspaceId, email, role? }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;
  const userId = auth.session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { workspaceId?: string; email?: string; role?: string };
  try {
    body = (await request.json()) as { workspaceId?: string; email?: string; role?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { workspaceId, email } = body;
  const role = body.role ?? 'member';
  if (!workspaceId || !email) {
    return NextResponse.json({ error: 'workspaceId and email are required' }, { status: 400 });
  }
  if (!isWorkspaceRole(role) || role === 'owner') {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }
  if (!(await hasWorkspaceRole(workspaceId, userId, ['owner', 'admin']))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const result = await createInvite(workspaceId, email.trim().toLowerCase(), role);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  // The invite token would normally be emailed; return it so callers can build the link.
  return NextResponse.json({ token: result.invite.token, email: result.invite.email });
}
