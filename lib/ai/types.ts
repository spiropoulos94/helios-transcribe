/**
 * Configuration for transcription requests
 */
export interface TranscriptionConfig {
  /** Target language for transcription/translation */
  targetLanguage: string;
  /** Whether to identify different speakers */
  enableSpeakerIdentification: boolean;
  /** Whether to include timestamps in transcription */
  enableTimestamps?: boolean;
  /** Video/audio duration in seconds (used for timestamp validation) */
  durationSeconds?: number;
  /** Custom prompt additions (optional) */
  customInstructions?: string;
}

/**
 * Result from a transcription operation
 */
export interface TranscriptionResult {
  /** The transcribed/translated text */
  text: string;
  /** Provider that performed the transcription */
  provider: string;
  /** Additional metadata */
  metadata?: {
    wordCount?: number;
    duration?: string;
    model?: string;
    processingTimeMs?: number;
  };
}

/**
 * Input file for transcription
 */
export interface TranscriptionInput {
  /** File as ArrayBuffer (for server-side processing) */
  buffer: ArrayBuffer;
  /** MIME type of the file */
  mimeType: string;
  /** Original filename */
  fileName: string;
}

/**
 * Provider capabilities - what each provider supports
 */
export interface ProviderCapabilities {
  /** Supported input MIME types */
  supportedMimeTypes: string[];
  /** Maximum file size in bytes */
  maxFileSizeBytes: number;
  /** Whether provider supports speaker diarization */
  supportsSpeakerIdentification: boolean;
  /** Whether provider supports direct translation */
  supportsTranslation: boolean;
}

/**
 * Main interface that all AI providers must implement
 */
export interface AITranscriptionProvider {
  /** Unique identifier for this provider */
  readonly name: string;

  /** Provider capabilities */
  readonly capabilities: ProviderCapabilities;

  /**
   * Transcribe audio/video file
   * @param input - The file to transcribe
   * @param config - Transcription configuration
   * @returns Transcription result
   */
  transcribe(
    input: TranscriptionInput,
    config: TranscriptionConfig
  ): Promise<TranscriptionResult>;

  /**
   * Check if provider is properly configured (API keys, etc.)
   */
  isConfigured(): boolean;

  /**
   * Validate if the input file is supported
   */
  validateInput(input: TranscriptionInput): { valid: boolean; error?: string };
}
