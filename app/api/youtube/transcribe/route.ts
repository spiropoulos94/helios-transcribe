import { NextRequest, NextResponse } from 'next/server';
import { createPipeline, type TranscriptionRequest, type PipelineInput } from '@/lib/pipeline';
import { featureFlags } from '@/lib/config';

/**
 * POST /api/youtube/transcribe
 * Transcribe audio from a YouTube URL
 */
export async function POST(request: NextRequest) {
  try {
    // Check if YouTube feature is disabled
    if (featureFlags.disableYouTube) {
      return NextResponse.json(
        { error: 'YouTube transcription is currently unavailable. This feature is coming soon!' },
        { status: 501 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { youtubeUrl, provider, features } = body;

    if (!youtubeUrl) {
      return NextResponse.json({ error: 'No YouTube URL provided' }, { status: 400 });
    }

    // Build transcription request
    const transcriptionRequest: TranscriptionRequest = {
      provider: provider || {
        type: 'elevenlabs',
        model: 'scribe_v2',
      },
      features: features || {
        enableKeytermExtraction: true,
        enableTranscriptionCorrection: true,
        enableAudioVerification: false,
      },
      targetLanguage: 'Greek (Ελληνικά)',
      enableSpeakerIdentification: true,
      enableTimestamps: true,
    };

    // Create pipeline input
    const pipelineInput: PipelineInput = {
      source: {
        type: 'youtube',
        url: youtubeUrl,
      },
      request: transcriptionRequest,
    };

    // Create and execute pipeline
    console.log(`[YouTube Transcribe] Starting pipeline for: ${youtubeUrl}`);
    const pipeline = createPipeline(transcriptionRequest);
    const result = await pipeline.execute(pipelineInput);

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
    console.error('[YouTube Transcribe] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to transcribe YouTube video.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
