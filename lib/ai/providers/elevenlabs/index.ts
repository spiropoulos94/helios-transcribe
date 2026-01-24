import type {
  AITranscriptionProvider,
  TranscriptionInput,
  TranscriptionConfig,
  TranscriptionResult,
  ProviderCapabilities,
} from '../../types';

export interface ElevenLabsProviderConfig {
  /** ElevenLabs API key (defaults to ELEVENLABS_API_KEY env var) */
  apiKey?: string;
  /** Model to use: 'scribe_v1' or 'scribe_v2' (default: 'scribe_v2') */
  model?: 'scribe_v1' | 'scribe_v2';
}


export class ElevenLabsProvider implements AITranscriptionProvider {
  readonly name = 'elevenlabs';
  private readonly apiKey: string;
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
    this.apiKey = config.apiKey || process.env.ELEVENLABS_API_KEY || '';
    this.model = config.model || 'scribe_v2';

    if (!this.apiKey) {
      console.warn('[ElevenLabs] No API key provided. Set ELEVENLABS_API_KEY environment variable.');
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey;
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

      // Build form data
      const formData = new FormData();

      // Add audio file
      const blob = new Blob([input.buffer], { type: input.mimeType });
      formData.append('file', blob, input.fileName);

      // Add model
      formData.append('model_id', this.model);

      // Add language (Greek)
      formData.append('language_code', 'el'); // ISO-639-1 code for Greek

      // Add diarization if requested
      if (config.enableSpeakerIdentification) {
        formData.append('diarize', 'true');
      }

      // Add timestamps (word-level)
      if (config.enableTimestamps) {
        formData.append('timestamps_granularity', 'word');
      } else {
        formData.append('timestamps_granularity', 'none');
      }

      // Make API request
      const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error (${response.status}): ${errorText}`);
      }

      const result = await response.json();

      // Extract text
      let text = result.text || '';

      // If timestamps are enabled, format with speaker labels
      if (config.enableSpeakerIdentification && result.words && result.words.length > 0) {
        text = this.formatWithSpeakers(result.words);
      }

      const processingTimeMs = Date.now() - startTime;

      console.log(`[ElevenLabs] Transcription complete in ${processingTimeMs}ms`);

      return {
        text,
        provider: `elevenlabs-${this.model}`,
        metadata: {
          model: this.model,
          processingTimeMs,
          wordCount: text.split(/\s+/).length,
        },
      };
    } catch (error) {
      console.error('[ElevenLabs] Transcription failed:', error);
      throw new Error(
        `ElevenLabs transcription failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Format transcription with speaker labels from word-level data
   */
  private formatWithSpeakers(words: any[]): string {
    let currentSpeaker: number | null = null;
    let result = '';
    let currentSegment = '';

    for (const word of words) {
      const speakerId = word.speaker_id ?? null;

      // New speaker detected
      if (speakerId !== currentSpeaker && speakerId !== null) {
        // Flush current segment
        if (currentSegment.trim()) {
          result += currentSegment.trim() + '\n\n';
        }

        // Start new segment with speaker label
        currentSpeaker = speakerId;
        currentSegment = `[Speaker ${speakerId + 1}]: ${word.text} `;
      } else {
        // Same speaker, add word
        currentSegment += word.text + ' ';
      }
    }

    // Flush final segment
    if (currentSegment.trim()) {
      result += currentSegment.trim();
    }

    return result;
  }
}
