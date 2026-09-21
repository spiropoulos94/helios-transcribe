import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import {
  hasWorkspaceRole,
  listMembers,
  removeMember,
} from '@/lib/server/workspaceRepo';

export const dynamic = 'force-dynamic';

/** GET /api/workspace/members?workspaceId=... — list members (any member). */
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;
  const userId = auth.session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = request.nextUrl.searchParams.get('workspaceId');
  if (!workspaceId) {
    return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 });
  }
  if (!(await hasWorkspaceRole(workspaceId, userId, ['owner', 'admin', 'member']))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const members = await listMembers(workspaceId);
  return NextResponse.json({
    members: members.map((m) => ({ userId: m.userId, email: m.user.email, role: m.role })),
  });
}

/** DELETE /api/workspace/members?workspaceId=...&userId=... — remove a member (owner/admin). */
export async function DELETE(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;
  const actingUserId = auth.session?.user?.id;
  if (!actingUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = request.nextUrl.searchParams.get('workspaceId');
  const targetUserId = request.nextUrl.searchParams.get('userId');
  if (!workspaceId || !targetUserId) {
    return NextResponse.json({ error: 'Missing workspaceId or userId' }, { status: 400 });
  }
  if (!(await hasWorkspaceRole(workspaceId, actingUserId, ['owner', 'admin']))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const result = await removeMember(workspaceId, targetUserId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ removed: true });
}
