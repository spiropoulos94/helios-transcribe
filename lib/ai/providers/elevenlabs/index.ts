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

export interface ElevenLabsProviderConfig {
  /** ElevenLabs API key (defaults to ELEVENLABS_API_KEY env var) */
  apiKey?: string;
  /** Model to use: 'scribe_v1' or 'scribe_v2' (default: 'scribe_v2') */
  model?: 'scribe_v1' | 'scribe_v2';
  /** Optional keyterms to improve transcription accuracy (max 100 terms, 50 chars each) */
  keyterms?: string[];
}


export class ElevenLabsProvider implements AITranscriptionProvider {
  readonly name = 'elevenlabs';
  private readonly client: ElevenLabsClient;
  private readonly model: 'scribe_v1' | 'scribe_v2';
  private readonly keyterms?: string[];

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
    this.keyterms = config.keyterms;

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

      // Validate and prepare keyterms
      const validKeyterms = this.keyterms
        ?.filter(term => term.length > 0 && term.length <= 50)
        .slice(0, 100);

      if (validKeyterms && validKeyterms.length > 0) {
        console.log(`[ElevenLabs] Using ${validKeyterms.length} keyterms for improved accuracy`);
      }

      // Make API request using the SDK
      const response = await this.client.speechToText.convert({
        modelId: this.model,
        file,
        languageCode: 'el', // ISO-639-1 code for Greek
        diarize: config.enableSpeakerIdentification,
        timestampsGranularity: config.enableTimestamps ? 'word' : 'none',
        keyterms: validKeyterms,
      });

      // Type guard to check if response is a chunk response (not webhook or multichannel)
      if ('text' in response && 'words' in response) {
        const result = response as SpeechToTextChunkResponseModel;

        // Extract text
        let text = result.text || '';
        let structuredData: StructuredTranscription | undefined;
        let rawJson: string | undefined;

        // If word-level data is available, create structured output
        if (result.words && result.words.length > 0) {
          // Convert word-level data to structured format
          structuredData = this.convertWordsToStructuredOutput(result.words);
          rawJson = JSON.stringify(result);

          // Generate plain text from structured data (if speaker identification enabled)
          if (config.enableSpeakerIdentification) {
            text = structuredData.segments
              .map(seg => `[${seg.timestamp}] ${seg.speaker}: ${seg.content}`)
              .join('\n\n');
          }
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
   * Convert seconds to MM:SS or HH:MM:SS timestamp format
   */
  private formatTimestamp(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Convert word-level data to structured transcription format
   */
  private convertWordsToStructuredOutput(words: SpeechToTextWordResponseModel[]): StructuredTranscription {
    const segments: TranscriptionSegment[] = [];
    let currentSpeaker: string | null = null;
    let currentSegment: { words: string[]; startTime: number } = { words: [], startTime: 0 };

    for (const word of words) {
      const speakerId = word.speakerId ?? null;
      const startTime = word.start ?? 0;

      // New speaker detected or first word
      if (speakerId !== currentSpeaker && speakerId !== null) {
        // Flush current segment if it has content
        if (currentSegment.words.length > 0 && currentSpeaker !== null) {
          segments.push({
            speaker: `Speaker ${currentSpeaker}`,
            timestamp: this.formatTimestamp(currentSegment.startTime),
            content: currentSegment.words.join(' '),
            language: 'Greek',
            language_code: 'el',
          });
        }

        // Start new segment
        currentSpeaker = speakerId;
        currentSegment = { words: [word.text], startTime };
      } else {
        // Same speaker, add word
        currentSegment.words.push(word.text);
      }
    }

    // Flush final segment
    if (currentSegment.words.length > 0 && currentSpeaker !== null) {
      segments.push({
        speaker: `Speaker ${currentSpeaker}`,
        timestamp: this.formatTimestamp(currentSegment.startTime),
        content: currentSegment.words.join(' '),
        language: 'Greek',
        language_code: 'el',
      });
    }

    return {
      summary: `Transcription from ElevenLabs with ${segments.length} speaker segment${segments.length !== 1 ? 's' : ''}`,
      segments,
    };
  }

}
