import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import type {
  SpeechToTextChunkResponseModel,
  SpeechToTextWordResponseModel,
} from '@elevenlabs/elevenlabs-js/api';
import type {
  AITranscriptionProvider,
  TranscriptionInput,
  TranscriptionConfig,
  TranscriptionResult,
  ProviderCapabilities,
  StructuredTranscription,
  TranscriptionSegment,
} from '../../types';
import { transcriptionStore } from '../../../transcription-store';
  
export interface ElevenLabsProviderConfig {
  /** ElevenLabs API key (defaults to ELEVENLABS_API_KEY env var) */
  apiKey?: string;
  /** Model to use: 'scribe_v1' or 'scribe_v2' (default: 'scribe_v2') */
  model?: 'scribe_v1' | 'scribe_v2';
  /** Timeout in milliseconds for API requests (default: 3600000 = 60 minutes) */
  timeoutMs?: number;
  /** Use async mode with polling instead of synchronous (default: true) */
  useAsyncMode?: boolean;
  /** Polling interval in milliseconds when using async mode (default: 2000 = 2 seconds) */
  pollingIntervalMs?: number;
}

export class ElevenLabsProvider implements AITranscriptionProvider {
  readonly name = 'elevenlabs';
  private readonly client: ElevenLabsClient;
  private readonly model: 'scribe_v1' | 'scribe_v2';
  private readonly useAsyncMode: boolean;
  private readonly pollingIntervalMs: number;

  readonly capabilities: ProviderCapabilities = {
    supportedMimeTypes: [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/wave',
      'audio/x-wav',
      'audio/mp4',
      'audio/m4a',
      'audio/aac',
      'audio/flac',
      'audio/ogg',
      'audio/webm',
      'video/mp4',
      'video/mpeg',
      'video/webm',
    ],
    maxFileSizeBytes: 2 * 1024 * 1024 * 1024, // 2GB
    supportsSpeakerIdentification: true,
    supportsTranslation: false, // Scribe only does transcription
  };

  constructor(config: ElevenLabsProviderConfig = {}) {
    const apiKey = config.apiKey || process.env.ELEVENLABS_API_KEY;
    const timeoutMs = config.timeoutMs ?? 3600000; // Default 60 minutes (1 hour)

    this.client = new ElevenLabsClient({
      apiKey,
      timeoutInSeconds: Math.floor(timeoutMs / 1000),
    });
    this.model = config.model || 'scribe_v2';
    // Default to async mode with webhooks for handling large files without timeouts
    // Requires webhook configuration in ElevenLabs account settings
    this.useAsyncMode = config.useAsyncMode ?? true;
    this.pollingIntervalMs = config.pollingIntervalMs ?? 2000; // Default 2 seconds

    if (!apiKey) {
      console.warn('[ElevenLabs] No API key provided. Set ELEVENLABS_API_KEY environment variable.');
    }
  }

  isConfigured(): boolean {
    return !!this.client;
  }

  validateInput(input: TranscriptionInput): { valid: boolean; error?: string } {
    // Check file size
    if (input.buffer.byteLength > this.capabilities.maxFileSizeBytes) {
      return {
        valid: false,
        error: `File size ${(input.buffer.byteLength / 1024 / 1024).toFixed(2)}MB exceeds ElevenLabs limit of 2GB`,
      };
    }

    // Check MIME type
    if (!this.capabilities.supportedMimeTypes.includes(input.mimeType)) {
      return {
        valid: false,
        error: `Unsupported file type: ${input.mimeType}`,
      };
    }

    return { valid: true };
  }

  async transcribe(
    input: TranscriptionInput,
    config: TranscriptionConfig
  ): Promise<TranscriptionResult> {
    if (!this.isConfigured()) {
      throw new Error('ElevenLabs API key not configured');
    }

    const startTime = Date.now();

    try {
      console.log(`[ElevenLabs] Starting transcription with ${this.model}...`);

      // Create a File object from the buffer
      const blob = new Blob([input.buffer], { type: input.mimeType });
      const file = new File([blob], input.fileName, { type: input.mimeType });

      // Use async mode with polling or synchronous mode
      const response = this.useAsyncMode
        ? await this.transcribeAsync(file, config)
        : await this.transcribeSync(file, config);

      // Type guard to check if response is a chunk response (not webhook or multichannel)
      if ('text' in response && 'words' in response) {
        const result = response as SpeechToTextChunkResponseModel;

        // Extract text
        let text = result.text || '';
        let structuredData: StructuredTranscription | undefined;
        let rawJson: string | undefined;

        // Handle both camelCase (from SDK) and snake_case (from webhook)
        const formats = (result as any).additionalFormats || (result as any).additional_formats;

        console.log('[ElevenLabs] Result has additionalFormats:', !!(result as any).additionalFormats);
        console.log('[ElevenLabs] Result has additional_formats:', !!(result as any).additional_formats);
        console.log('[ElevenLabs] Result has words:', !!result.words);
        if (formats) {
          console.log('[ElevenLabs] formats length:', formats.length);
        }

        // Try to use segmented_json format first, then fall back to word-level conversion
        if (formats && formats.length > 0) {
          const segmentedJson = formats.find(
            (format: any) => format?.requestedFormat === 'segmented_json' ||
                            format?.requested_format === 'segmented_json'
          );

          if (segmentedJson) {
            console.log('[ElevenLabs] Using segmented_json format from API');
            structuredData = this.convertSegmentedJsonToStructuredOutput(segmentedJson);
            rawJson = segmentedJson.content;
          }
        }

        // Fallback: If segmented_json not available, use word-level data
        if (!structuredData && result.words && result.words.length > 0) {
          console.log('[ElevenLabs] Falling back to word-level conversion');
          structuredData = this.convertWordsToStructuredOutput(result.words);
          rawJson = JSON.stringify(result);
        }

        const processingTimeMs = Date.now() - startTime;

        console.log(`[ElevenLabs] Transcription complete in ${processingTimeMs}ms`);

        return {
          text,
          provider: `elevenlabs-${this.model}`,
          structuredData,
          rawJson,
          metadata: {
            model: this.model,
            processingTimeMs,
            wordCount: text.split(/\s+/).length,
          },
        };
      } else {
        throw new Error('Unexpected response format from ElevenLabs API');
      }
    } catch (error) {
      console.error('[ElevenLabs] Transcription failed:', error);
      throw new Error(
        `ElevenLabs transcription failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Synchronous transcription - waits for the entire transcription to complete
   */
  private async transcribeSync(
    file: File,
    config: TranscriptionConfig
  ): Promise<SpeechToTextChunkResponseModel> {
    console.log('[ElevenLabs] Using synchronous mode');

    const response = await this.client.speechToText.convert({
      modelId: this.model,
      file,
      languageCode: 'el', // ISO-639-1 code for Greek
      diarize: config.enableSpeakerIdentification,
      timestampsGranularity: config.enableTimestamps ? 'word' : 'none',
      temperature: 0.0,
      additionalFormats: [
        {
          format: 'segmented_json',
          includeSpeakers: config.enableSpeakerIdentification,
          includeTimestamps: config.enableTimestamps ?? true,
        },
      ],
    });

    // Type guard to check if response is a chunk response
    if ('text' in response && 'words' in response) {
      return response as SpeechToTextChunkResponseModel;
    }

    throw new Error('Unexpected response format from ElevenLabs API');
  }

  /**
   * Asynchronous transcription - submits job and polls for completion via webhook
   */
  private async transcribeAsync(
    file: File,
    config: TranscriptionConfig
  ): Promise<SpeechToTextChunkResponseModel> {
    console.log('[ElevenLabs] Using async mode with webhook');

    // Submit transcription job with webhook enabled
    const submitResponse = await this.client.speechToText.convert({
      modelId: this.model,
      file,
      languageCode: 'el', // ISO-639-1 code for Greek
      diarize: config.enableSpeakerIdentification,
      timestampsGranularity: config.enableTimestamps ? 'word' : 'none',
      temperature: 0.0,
      webhook: true, // Enable async mode - will POST to configured webhook
      additionalFormats: [
        {
          format: 'segmented_json',
          includeSpeakers: config.enableSpeakerIdentification,
          includeTimestamps: config.enableTimestamps ?? true,
        },
      ],
    });

    // Type guard to check if this is a webhook response with request_id
    if ('requestId' in submitResponse && submitResponse.requestId) {
      const requestId = submitResponse.requestId;
      const normalizedId = this.normalizeRequestId(requestId);

      console.log(`[ElevenLabs] Job submitted with request ID: ${requestId}`);
      console.log(`[ElevenLabs] Normalized ID for storage: ${normalizedId}`);
      console.log('[ElevenLabs] Waiting for webhook callback...');

      // Store the pending transcription with normalized ID
      transcriptionStore.create(normalizedId);
      transcriptionStore.updateStatus(normalizedId, 'processing');

      // Poll the store for webhook result using normalized ID
      return await this.pollForWebhookResult(normalizedId);
    }

    throw new Error('Failed to get request ID from async submission');
  }

  /**
   * Poll for webhook result from transcription store
   */
  private async pollForWebhookResult(
    requestId: string
  ): Promise<SpeechToTextChunkResponseModel> {
    let attempts = 0;
    const maxAttempts = 1800; // 60 minutes (1 hour) with 2-second intervals

    while (attempts < maxAttempts) {
      // Check the store for the result
      const stored = transcriptionStore.get(requestId);

      if (stored?.status === 'completed' && stored.result) {
        console.log(`[ElevenLabs] Webhook result received after ${attempts + 1} polling attempts`);

        // Extract the transcription from the webhook payload
        const { transcription } = stored.result;

        // Convert webhook transcription format to SpeechToTextChunkResponseModel
        return transcription as SpeechToTextChunkResponseModel;
      }

      if (stored?.status === 'failed') {
        throw new Error(`Transcription failed: ${stored.error || 'Unknown error'}`);
      }

      // If not ready yet, wait and retry
      attempts++;
      if (attempts % 10 === 0) {
        console.log(`[ElevenLabs] Still waiting for webhook... (${attempts} attempts)`);
      }
      await this.sleep(this.pollingIntervalMs);
    }

    throw new Error(`Webhook polling timed out after ${maxAttempts} attempts (${maxAttempts * this.pollingIntervalMs / 1000}s)`);
  }

  /**
   * Sleep utility for polling
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Normalize request ID for consistent storage lookup
   * Converts to lowercase to handle SDK/webhook casing differences
   */
  private normalizeRequestId(requestId: string): string {
    return requestId.toLowerCase();
  }

  /**
   * Convert segmented_json format to structured transcription format
   */
  private convertSegmentedJsonToStructuredOutput(
    format: any
  ): StructuredTranscription | undefined {
    try {
      // Decode base64 if needed
      const isEncoded = format.isBase64Encoded || format.is_base64_encoded;
      let jsonContent = format.content;
      if (isEncoded) {
        jsonContent = Buffer.from(format.content, 'base64').toString('utf-8');
      }

      const data = JSON.parse(jsonContent);

      // ElevenLabs segmented_json format has a 'segments' array
      if (!data.segments || !Array.isArray(data.segments)) {
        console.warn('[ElevenLabs] Invalid segmented_json format: missing segments array');
        return undefined;
      }

      const segments: TranscriptionSegment[] = data.segments.map((segment: any) => {
        // Extract speaker and timing from the words array
        const words = segment.words || [];
        const firstWord = words.find((w: any) => w.type === 'word');
        const lastWord = words.filter((w: any) => w.type === 'word').pop();

        const speakerId = firstWord?.speaker_id || 'unknown';
        const startTime = firstWord?.start ?? 0;
        const endTime = lastWord?.end ?? startTime;

        // Convert speaker ID to number and add 1 to start from Speaker 1
        const speakerNumber = speakerId.replace('speaker_', '');
        const displayNumber = isNaN(Number(speakerNumber)) ? speakerNumber : String(Number(speakerNumber) + 1);

        return {
          speaker: `Speaker ${displayNumber}`,
          startTime,
          endTime,
          text: segment.text || '',
        };
      });

      return { segments };
    } catch (error) {
      console.error('[ElevenLabs] Failed to parse segmented_json:', error);
      return undefined;
    }
  }

  /**
   * Convert word-level data to structured transcription format
   */
  private convertWordsToStructuredOutput(words: SpeechToTextWordResponseModel[]): StructuredTranscription {
    const segments: TranscriptionSegment[] = [];
    let currentSpeaker: string | null = null;
    let currentSegment: { words: string[]; startTime: number; endTime: number } = {
      words: [],
      startTime: 0,
      endTime: 0
    };

    for (const word of words) {
      const speakerId = word.speakerId ?? null;
      const startTime = word.start ?? 0;
      const endTime = word.end ?? startTime;

      // New speaker detected or first word
      if (speakerId !== currentSpeaker && speakerId !== null) {
        // Flush current segment if it has content
        if (currentSegment.words.length > 0 && currentSpeaker !== null) {
          // Convert speaker ID to number and add 1 to start from Speaker 1
          const speakerNumber = isNaN(Number(currentSpeaker)) ? currentSpeaker : String(Number(currentSpeaker) + 1);
          segments.push({
            speaker: `Speaker ${speakerNumber}`,
            startTime: currentSegment.startTime,
            endTime: currentSegment.endTime,
            text: currentSegment.words.join(' '),
          });
        }

        // Start new segment
        currentSpeaker = speakerId;
        currentSegment = { words: [word.text], startTime, endTime };
      } else {
        // Same speaker, add word and update end time
        currentSegment.words.push(word.text);
        currentSegment.endTime = endTime;
      }
    }

    // Flush final segment
    if (currentSegment.words.length > 0 && currentSpeaker !== null) {
      // Convert speaker ID to number and add 1 to start from Speaker 1
      const speakerNumber = isNaN(Number(currentSpeaker)) ? currentSpeaker : String(Number(currentSpeaker) + 1);
      segments.push({
        speaker: `Speaker ${speakerNumber}`,
        startTime: currentSegment.startTime,
        endTime: currentSegment.endTime,
        text: currentSegment.words.join(' '),
      });
    }

    return {
      segments,
    };
  }

}
