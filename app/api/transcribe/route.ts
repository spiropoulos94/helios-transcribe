import { NextRequest, NextResponse } from 'next/server';
import { Transcriber } from '@/lib/transcriber';
import { requireAuth } from '@/lib/auth-utils';

/**
 * POST /api/transcribe
 * Transcribe audio from an uploaded file
 * Configuration comes from environment variables
 */
export async function POST(request: NextRequest) {
  // Check authentication
  const authResult = await requireAuth();
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Transcribe (config from env vars)
    const transcriber = new Transcriber();
    const result = await transcriber.transcribe({
      buffer: await file.arrayBuffer(),
      mimeType: file.type,
      fileName: file.name,
    });

    // Wrap result in array for backward compatibility with UI
    return NextResponse.json({
      results: [{
        model: `${result.metadata.provider} - ${result.metadata.model || 'default'}`,
        text: result.text,
        fileName: result.fileName,
        metadata: result.metadata,
        provider: result.metadata.provider,
        success: true,
      }],
      fileName: result.fileName,
      totalProcessingTimeMs: result.metadata.processingTimeMs,
      successCount: 1,
      failureCount: 0,
    });
  } catch (error: unknown) {
    console.error('[Transcribe] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process the media file.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
