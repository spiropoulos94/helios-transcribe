import { NextResponse } from 'next/server';

/**
 * POST /api/youtube/transcribe
 * YouTube transcription - Coming Soon!
 */
export async function POST() {
  return NextResponse.json(
    { error: 'YouTube transcription is coming soon! Currently only file uploads are supported.' },
    { status: 501 }
  );
}
