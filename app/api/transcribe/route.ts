import { NextRequest, NextResponse } from 'next/server';
import { getDefaultProvider, TranscriptionInput, TranscriptionConfig } from '@/lib/ai';
import { extractAudioFromYouTube } from '@/lib/youtube';
import { readFile } from 'fs/promises';
import { featureFlags } from '@/lib/config';
import { getAudioDuration, shouldUseChunking, processWithChunking } from '@/lib/audio';

// Default configuration for Greek transcription
const DEFAULT_CONFIG: TranscriptionConfig = {
  targetLanguage: 'Greek (Ελληνικά)',
  enableSpeakerIdentification: true,
  enableTimestamps: true,
};

export async function POST(request: NextRequest) {
  let cleanup: (() => Promise<void>) | null = null;

  try {
    // Get the configured provider
    const provider = getDefaultProvider();

    // Detect request type (JSON for YouTube URL, FormData for file upload)
    const contentType = request.headers.get('content-type');
    const isJsonRequest = contentType?.includes('application/json');

    let input: TranscriptionInput;
    let durationSeconds: number | undefined;

    if (isJsonRequest) {
      // YouTube URL mode
      const body = await request.json();
      const { youtubeUrl } = body;

      if (!youtubeUrl) {
        return NextResponse.json({ error: 'No YouTube URL provided' }, { status: 400 });
      }

      // Check if YouTube feature is disabled
      if (featureFlags.disableYouTube) {
        return NextResponse.json(
          { error: 'YouTube transcription is currently unavailable. This feature is coming soon!' },
          { status: 501 }
        );
      }

      // Extract audio from YouTube
      const extraction = await extractAudioFromYouTube(youtubeUrl);
      cleanup = extraction.cleanup;
      durationSeconds = extraction.duration;

      // Read file buffer and convert to ArrayBuffer
      const fileBuffer = await readFile(extraction.filePath);
      const arrayBuffer = fileBuffer.buffer.slice(
        fileBuffer.byteOffset,
        fileBuffer.byteOffset + fileBuffer.byteLength
      );

      input = {
        buffer: arrayBuffer,
        mimeType: extraction.mimeType,
        fileName: extraction.title,
      };
    } else {
      // File upload mode (existing)
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      input = {
        buffer: await file.arrayBuffer(),
        mimeType: file.type,
        fileName: file.name,
      };
    }

    // Validate input
    const validation = provider.validateInput(input);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Get optional config overrides
    const config: TranscriptionConfig = {
      ...DEFAULT_CONFIG,
      durationSeconds,
    };

    // Detect duration if not already available (for file uploads)
    let duration = durationSeconds;
    if (!duration) {
      try {
        duration = await getAudioDuration(input);
      } catch (error) {
        console.warn('[Transcription] Failed to detect duration, proceeding without chunking:', error);
      }
    }

    // Decide whether to use chunking
    let result;
    if (duration && shouldUseChunking(duration)) {
      console.log(`[Transcription] File duration ${Math.floor(duration / 60)} minutes - using chunking`);
      result = await processWithChunking(input, config, provider);
    } else {
      console.log(`[Transcription] Processing without chunking`);
      result = await provider.transcribe(input, config);
    }

    return NextResponse.json({
      text: result.text,
      fileName: input.fileName,
      metadata: result.metadata,
    });
  } catch (error: unknown) {
    console.error('Transcription Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process the media file.';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    // CRITICAL: Always cleanup temp files
    if (cleanup) {
      await cleanup().catch((err) =>
        console.error('Failed to cleanup temp file:', err)
      );
    }
  }
}
