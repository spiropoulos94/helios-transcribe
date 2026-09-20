import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import {
  getTranscriptionForUser,
  deleteTranscriptionForUser,
} from '@/lib/server/transcriptionRepo';

export const dynamic = 'force-dynamic';

/**
 * GET /api/transcriptions/[id]
 * Fetch a single transcription owned by the current user.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.authorized) {
    return authResult.response;
  }
  const userId = authResult.session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  try {
    const transcription = await getTranscriptionForUser(userId, id);
    if (!transcription) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, transcription });
  } catch (error) {
    console.error('[Transcriptions] Get failed:', error);
    return NextResponse.json({ error: 'Failed to fetch transcription' }, { status: 500 });
  }
}

/**
 * DELETE /api/transcriptions/[id]
 * Delete a transcription owned by the current user.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.authorized) {
    return authResult.response;
  }
  const userId = authResult.session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  try {
    const { deleted } = await deleteTranscriptionForUser(userId, id);
    if (!deleted) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Transcriptions] Delete failed:', error);
    return NextResponse.json({ error: 'Failed to delete transcription' }, { status: 500 });
  }
}
