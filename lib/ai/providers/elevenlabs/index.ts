import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import type {
  SpeechToTextChunkResponseModel,
  SpeechToTextWordResponseModel,
  AdditionalFormatResponseModel,
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

export interface ElevenLabsProviderConfig {
  /** ElevenLabs API key (defaults to ELEVENLABS_API_KEY env var) */
  apiKey?: string;
  /** Model to use: 'scribe_v1' or 'scribe_v2' (default: 'scribe_v2') */
  model?: 'scribe_v1' | 'scribe_v2';
}

export class ElevenLabsProvider implements AITranscriptionProvider {
  readonly name = 'elevenlabs';
  private readonly client: ElevenLabsClient;
  private readonly model: 'scribe_v1' | 'scribe_v2';

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

    this.client = new ElevenLabsClient({
      apiKey,
    });
    this.model = config.model || 'scribe_v2';

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

      // Make API request using the SDK with segmented_json additional format
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

      // Type guard to check if response is a chunk response (not webhook or multichannel)
      if ('text' in response && 'words' in response) {
        const result = response as SpeechToTextChunkResponseModel;

        // Extract text
        let text = result.text || '';
        let structuredData: StructuredTranscription | undefined;
        let rawJson: string | undefined;

        // Try to use segmented_json format first, then fall back to word-level conversion
        if (result.additionalFormats && result.additionalFormats.length > 0) {
          const segmentedJson = result.additionalFormats.find(
            (format) => format?.requestedFormat === 'segmented_json'
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
   * Convert segmented_json format to structured transcription format
   */
  private convertSegmentedJsonToStructuredOutput(
    format: AdditionalFormatResponseModel
  ): StructuredTranscription | undefined {
    try {
      // Decode base64 if needed
      let jsonContent = format.content;
      if (format.isBase64Encoded) {
        jsonContent = Buffer.from(format.content, 'base64').toString('utf-8');
      }

      const data = JSON.parse(jsonContent);

      // ElevenLabs segmented_json format has a 'segments' array
      if (!data.segments || !Array.isArray(data.segments)) {
        console.warn('[ElevenLabs] Invalid segmented_json format: missing segments array');
        return undefined;
      }

      const segments: TranscriptionSegment[] = data.segments.map((segment: any) => ({
        speaker: segment.speaker || 'Unknown Speaker',
        startTime: segment.start_time ?? 0,
        endTime: segment.end_time ?? 0,
        text: segment.text || '',
      }));

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
          segments.push({
            speaker: `Speaker ${currentSpeaker}`,
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
      segments.push({
        speaker: `Speaker ${currentSpeaker}`,
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
