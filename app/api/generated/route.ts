import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { isAiToolType } from '@/lib/ai/journalistPrompts';
import { upsertGenerated, listForTranscription } from '@/lib/server/generatedContentRepo';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const a = await requireAuth();
  if (!a.authorized) return a.response;
  const userId = a.session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();

    if (!body || typeof body.transcriptionId !== 'string' || body.transcriptionId.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid transcriptionId' }, { status: 400 });
    }
    if (!isAiToolType(body.type)) {
      return NextResponse.json({ error: 'Missing or invalid type' }, { status: 400 });
    }
    if (typeof body.content !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid content' }, { status: 400 });
    }

    const item = await upsertGenerated(userId, {
      transcriptionId: body.transcriptionId,
      type: body.type,
      content: body.content,
    });

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error('[Generated] POST error:', error);
    return NextResponse.json({ error: 'Failed to save generated content' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const a = await requireAuth();
  if (!a.authorized) return a.response;
  const userId = a.session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const transcriptionId = request.nextUrl.searchParams.get('transcriptionId');
    if (!transcriptionId) {
      return NextResponse.json({ error: 'Missing transcriptionId' }, { status: 400 });
    }

    const items = await listForTranscription(userId, transcriptionId);
    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error('[Generated] GET error:', error);
    return NextResponse.json({ error: 'Failed to list generated content' }, { status: 500 });
  }
}
