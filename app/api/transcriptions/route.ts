import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import {
  saveTranscriptionForUser,
  listTranscriptionsForUser,
  OwnershipError,
} from '@/lib/server/transcriptionRepo';
import type { TranscriptionSyncPayload } from '@/lib/serverTranscriptions';

export const dynamic = 'force-dynamic';

/**
 * POST /api/transcriptions
 * Back up (create or update) a transcription for the current user.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.authorized) {
    return authResult.response;
  }
  const userId = authResult.session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: TranscriptionSyncPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (
    !body ||
    typeof body.id !== 'string' ||
    typeof body.fileName !== 'string' ||
    typeof body.text !== 'string'
  ) {
    return NextResponse.json(
      { error: 'Missing required fields: id, fileName, text' },
      { status: 400 }
    );
  }

  try {
    const { created } = await saveTranscriptionForUser(userId, body);
    return NextResponse.json({ success: true, id: body.id, created });
  } catch (error) {
    if (error instanceof OwnershipError) {
      return NextResponse.json(
        { error: 'Transcription belongs to another user' },
        { status: 409 }
      );
    }
    console.error('[Transcriptions] Save failed:', error);
    return NextResponse.json({ error: 'Failed to save transcription' }, { status: 500 });
  }
}

/**
 * GET /api/transcriptions
 * List the current user's transcriptions (newest first).
 */
export async function GET() {
  const authResult = await requireAuth();
  if (!authResult.authorized) {
    return authResult.response;
  }
  const userId = authResult.session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const items = await listTranscriptionsForUser(userId);
    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error('[Transcriptions] List failed:', error);
    return NextResponse.json({ error: 'Failed to list transcriptions' }, { status: 500 });
  }
}
