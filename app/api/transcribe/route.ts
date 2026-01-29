import { NextRequest, NextResponse } from 'next/server';
import { TranscriptionInput, TranscriptionConfig, AITranscriptionProvider } from '@/lib/ai';
import { ElevenLabsProvider } from '@/lib/ai/providers/elevenlabs';
import { GoogleGeminiProvider } from '@/lib/ai/providers/google';
import { OpenAIProvider } from '@/lib/ai/providers/openai';
import { KeytermExtractor } from '@/lib/ai/keyterm-extractor';
import { TranscriptionCorrector } from '@/lib/ai/transcription-corrector';
import { extractAudioFromYouTube } from '@/lib/youtube';
import { readFile } from 'fs/promises';
import { featureFlags } from '@/lib/config';
import { getAudioDuration, shouldUseChunking, processWithChunking, optimizeAudioForTranscription } from '@/lib/audio';
import { MODELS_TO_PROCESS } from '@/lib/constants';

// Default configuration for Greek transcription
const DEFAULT_CONFIG: TranscriptionConfig = {
  targetLanguage: 'Greek (Ελληνικά)',
  enableSpeakerIdentification: true,
  enableTimestamps: true,
  enableKeytermExtraction: true, // Enable by default for ElevenLabs
  enableTranscriptionCorrection: true, // Enable post-processing correction by default
  enableAudioVerification: true, // Disabled by default (doubles cost, but much more accurate for proper nouns)
};

export async function POST(request: NextRequest) {
  let cleanup: (() => Promise<void>) | null = null;

  try {
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

    // Optimize audio for better transcription accuracy
    console.log('[Transcription] Optimizing audio with FFmpeg (16kHz mono, -23 LUFS, noise reduction)...');
    let optimizedInput: TranscriptionInput;
    try {
      optimizedInput = await optimizeAudioForTranscription(input);
      console.log('[Transcription] Audio optimization complete');
    } catch (error) {
      console.warn('[Transcription] Audio optimization failed, using original audio:', error);
      optimizedInput = input;
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
        duration = await getAudioDuration(optimizedInput);
      } catch (error) {
        console.warn('[Transcription] Failed to detect duration, proceeding without chunking:', error);
      }
    }

    // Process each model sequentially
    const results = [];
    const totalStartTime = Date.now();
    let successCount = 0;
    let failureCount = 0;

    for (const modelConfig of MODELS_TO_PROCESS) {
      const modelStartTime = Date.now();

      try {
        console.log(`[Multi-Model] Processing with ${modelConfig.displayName}...`);

        // Get provider instance based on provider type
        let provider: AITranscriptionProvider;
        const providerType = modelConfig.providerType as string;

        if (providerType === 'elevenlabs') {
          provider = new ElevenLabsProvider({
            model: modelConfig.modelName as 'scribe_v1' | 'scribe_v2',
            // No keyterms here - will be set per-chunk
          });
        } else if (providerType === 'google-gemini') {
          provider = new GoogleGeminiProvider({
            model: modelConfig.modelName,
            enableStructuredOutput: true, // Enable structured JSON output with speakers, timestamps, emotions
          });
        } else if (providerType === 'openai') {
          provider = new OpenAIProvider({
            whisperModel: modelConfig.modelName,
            gptModel: modelConfig.modelName,
          });
        } else {
          throw new Error(`Unsupported provider type: ${providerType}`);
        }

        // Validate input for this provider
        const validation = provider.validateInput(optimizedInput);
        if (!validation.valid) {
          throw new Error(validation.error || 'Input validation failed');
        }

        // Determine if keyterms should be used for this model
        const useKeyterms = modelConfig.enableKeytermExtraction ?? config.enableKeytermExtraction;

        // Track extracted keyterms for metadata
        let extractedKeyterms: string[] | undefined;

        // Decide whether to use chunking
        let result;
        if (duration && shouldUseChunking(duration)) {
          console.log(`[${modelConfig.displayName}] Using chunking`);

          // Create extractor for providers that support keyterms (ElevenLabs and Gemini)
          const keytermExtractor = (providerType === 'elevenlabs' || providerType === 'google-gemini') && useKeyterms
            ? new KeytermExtractor()
            : undefined;

          // Create corrector if transcription correction is enabled
          const transcriptionCorrector = config.enableTranscriptionCorrection
            ? new TranscriptionCorrector()
            : undefined;

          result = await processWithChunking(optimizedInput, config, provider, keytermExtractor, transcriptionCorrector);
        } else {
          // Non-chunked transcription - extract keyterms if enabled
          if ((providerType === 'elevenlabs' || providerType === 'google-gemini') && useKeyterms) {
            console.log(`[${modelConfig.displayName}] Extracting keyterms for non-chunked file...`);

            try {
              const keytermExtractor = new KeytermExtractor();
              const keyterms = await keytermExtractor.extractKeyterms(optimizedInput, {
                maxKeyterms: 100,
                minLength: 2,
                languageCode: 'el',
              });

              console.log(`[${modelConfig.displayName}] Extracted ${keyterms.length} keyterms`);
              extractedKeyterms = keyterms; // Save for metadata

              // Create new provider instance with keyterms
              if (providerType === 'elevenlabs') {
                provider = new ElevenLabsProvider({
                  model: modelConfig.modelName as 'scribe_v1' | 'scribe_v2',
                  keyterms: keyterms,
                });
              } else if (providerType === 'google-gemini') {
                provider = new GoogleGeminiProvider({
                  model: modelConfig.modelName,
                  enableStructuredOutput: true,
                  keyterms: keyterms,
                });
              }
            } catch (error) {
              console.warn(`[${modelConfig.displayName}] Failed to extract keyterms, continuing without:`, error);
            }
          }

          result = await provider.transcribe(optimizedInput, config);

          // Apply correction for non-chunked files (if enabled)
          if (config.enableTranscriptionCorrection || config.enableAudioVerification) {
            try {
              const corrector = new TranscriptionCorrector();

              if (config.enableAudioVerification) {
                console.log(`[${modelConfig.displayName}] Applying audio-aware correction...`);
                const correctionResult = await corrector.correctTranscription(result.text, {
                  languageCode: 'el',
                  preserveTimestamps: true,
                  preserveSpeakers: true,
                  audioInput: optimizedInput,
                  enableAudioVerification: true,
                });
                result.text = correctionResult.correctedText;
                console.log(`[${modelConfig.displayName}] Audio-aware correction: ${correctionResult.correctionCount || 0} corrections in ${correctionResult.processingTimeMs}ms`);
              } else if (config.enableTranscriptionCorrection) {
                console.log(`[${modelConfig.displayName}] Applying text-only correction...`);
                const correctionResult = await corrector.correctTranscription(result.text, {
                  languageCode: 'el',
                  preserveTimestamps: true,
                  preserveSpeakers: true,
                });
                result.text = correctionResult.correctedText;
                console.log(`[${modelConfig.displayName}] Text-only correction: ${correctionResult.correctionCount || 0} corrections in ${correctionResult.processingTimeMs}ms`);
              }
            } catch (error) {
              console.warn(`[${modelConfig.displayName}] Correction failed, using original transcription:`, error);
            }
          }
        }

        results.push({
          model: `++ ${modelConfig.displayName}`,
          text: result.text,
          fileName: input.fileName,
          metadata: {
            ...result.metadata,
            audioDurationSeconds: duration,
            processingTimeMs: Date.now() - modelStartTime,
            pricing: modelConfig.pricing,
            // Pass through structured data if available (from Gemini)
            structuredData: result.structuredData,
            rawJson: result.rawJson,
            // Include extracted keyterms if available
            keyterms: extractedKeyterms,
            keytermCount: extractedKeyterms?.length,
          },
          provider: result.provider,
          success: true,
        });

        successCount++;
        console.log(`[${modelConfig.displayName}] Success in ${Date.now() - modelStartTime}ms`);
      } catch (error: unknown) {
        failureCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[${modelConfig.displayName}] Failed:`, errorMessage);

        // Save failed result with error info
        results.push({
          model: `++ ${modelConfig.displayName}`,
          text: '',
          fileName: input.fileName,
          metadata: {
            error: errorMessage,
            processingTimeMs: Date.now() - modelStartTime,
            audioDurationSeconds: duration,
            pricing: modelConfig.pricing,
          },
          provider: modelConfig.providerType,
          success: false,
        });

        // Continue with next model instead of failing entirely
      }
    }

    const totalProcessingTimeMs = Date.now() - totalStartTime;

    return NextResponse.json({
      results,
      fileName: input.fileName,
      totalProcessingTimeMs,
      successCount,
      failureCount,
    });
  } catch (error: unknown) {
    console.error('Multi-Model Transcription Error:', error);
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
