/**
 * A segment of transcribed content with metadata
 */
export interface TranscriptionSegment {
  /** Speaker identifier (e.g., "Speaker 1", "Speaker 2") */
  speaker: string;
  /** Timestamp in MM:SS or HH:MM:SS format */
  timestamp: string;
  /** The transcribed/translated content for this segment */
  content: string;
  /** Detected language name (e.g., "Greek", "English") */
  language?: string;
  /** ISO language code (e.g., "el", "en") */
  language_code?: string;
  /** Translation if different from content */
  translation?: string;
  /** Voice characteristics that distinguish this speaker (e.g., "deep male voice", "fast-paced speech") */
  speaker_characteristics?: string;
}

/**
 * Structured transcription data with segments
 */
export interface StructuredTranscription {
  /** Summary of the transcription */
  summary: string;
  /** Total number of distinct speakers identified */
  total_speakers?: number;
  /** Array of transcription segments with speaker, timestamp, content, emotion */
  segments: TranscriptionSegment[];
}

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
    finishReason?: string; // AI model's finish reason (e.g., 'STOP', 'MAX_TOKENS', 'RECITATION')
    wasTruncated?: boolean; // Flag indicating if output was truncated
    chunked?: boolean; // Flag indicating if audio was processed using chunking
    chunkCount?: number; // Number of chunks processed (if chunked)
    chunkDurationSeconds?: number; // Duration of each chunk in seconds (if chunked)
    overlapSeconds?: number; // Overlap duration between chunks in seconds (if chunked)
  };
  /** Structured transcription data (when available from provider like Gemini) */
  structuredData?: StructuredTranscription;
  /** Raw JSON response from the provider (when structured output is used) */
  rawJson?: string;
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
