import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { requireFeature } from '@/lib/server/entitlementGuards';
import { createFeed, getUserFeeds, deleteFeed } from '@/lib/server/podcastFeedRepo';

export const dynamic = 'force-dynamic';

/** GET /api/rss — list the user's subscribed podcast feeds. */
export async function GET() {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;
  const userId = auth.session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const feeds = await getUserFeeds(userId);
  return NextResponse.json({ feeds });
}

/** POST /api/rss — subscribe to a feed (Creator+). Body: { url, title? }. */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;
  const userId = auth.session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const guard = await requireFeature(userId, 'rss');
  if (!guard.allowed) {
    return NextResponse.json(
      { error: guard.error, requiredPlan: guard.requiredPlan },
      { status: guard.status }
    );
  }

  let body: { url?: string; title?: string };
  try {
    body = (await request.json()) as { url?: string; title?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const url = body.url?.trim();
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: 'A valid feed URL is required' }, { status: 400 });
  }

  const feed = await createFeed(userId, url, body.title);
  return NextResponse.json({ feed });
}

/** DELETE /api/rss?id=... — unsubscribe from a feed. */
export async function DELETE(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;
  const userId = auth.session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing feed id' }, { status: 400 });

  const deleted = await deleteFeed(userId, id);
  return NextResponse.json({ deleted });
}
