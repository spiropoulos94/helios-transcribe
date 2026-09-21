import { NextRequest, NextResponse } from 'next/server';
import { Transcriber } from '@/lib/transcriber';
import { requireAuth } from '@/lib/auth-utils';
import { requireTranscriptionQuota } from '@/lib/server/entitlementGuards';
import { recordUsage } from '@/lib/server/usageRepo';
import { durationSecondsFromSegments } from '@/lib/billing/duration';

// Route segment config for App Router
export const maxDuration = 7200; // 2 hours for very long audio files (Railway supports up to 6h)
export const dynamic = 'force-dynamic';

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
  const userId = authResult.session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Client-declared duration (optional hint) lets us reject over-limit jobs up-front.
    // Authoritative minutes are recorded after processing, from the returned segments.
    const declaredSeconds = Number(formData.get('durationSeconds')) || 0;

    // Enforce the plan's remaining minutes BEFORE doing any (paid) work.
    const quota = await requireTranscriptionQuota(userId, declaredSeconds);
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: quota.error,
          plan: quota.snapshot.plan,
          requiredPlan: quota.requiredPlan,
          usage: quota.snapshot,
        },
        { status: quota.status }
      );
    }

    // Transcribe (config from env vars)
    const transcriber = new Transcriber();
    const result = await transcriber.transcribe({
      buffer: await file.arrayBuffer(),
      mimeType: file.type,
      fileName: file.name,
    });

    // Meter the actual minutes consumed. Prefer the true audio length derived from the
    // transcript segments; fall back to the client-declared duration.
    const actualSeconds =
      durationSecondsFromSegments(result.metadata.structuredData?.segments) ||
      declaredSeconds;
    await recordUsage({
      userId,
      durationSeconds: actualSeconds,
      provider: result.metadata.provider,
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
