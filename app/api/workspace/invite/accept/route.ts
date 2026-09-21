import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { acceptInvite } from '@/lib/server/workspaceRepo';

export const dynamic = 'force-dynamic';

/** POST /api/workspace/invite/accept — accept an invite. Body: { token }. */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;
  const userId = auth.session?.user?.id;
  const email = auth.session?.user?.email;
  if (!userId || !email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { token?: string };
  try {
    body = (await request.json()) as { token?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  if (!body.token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const result = await acceptInvite(body.token, userId, email);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ workspaceId: result.workspaceId });
}
