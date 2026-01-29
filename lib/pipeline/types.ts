import type { TranscriptionInput, StructuredTranscription } from '../ai/types';
import type { ChunkSpec } from '../audio/ffmpeg';

/**
 * Provider configuration for a pipeline request
 */
export interface ProviderConfig {
  type: 'elevenlabs' | 'google-gemini' | 'openai';
  model?: string; // Optional model override (e.g., 'scribe_v2', 'gemini-2.0-flash')
}

/**
 * Feature toggles for pipeline stages
 */
export interface PipelineFeatures {
  enableKeytermExtraction?: boolean;     // Extract keyterms in PreProcess (default: true)
  enableTranscriptionCorrection?: boolean; // Text-only correction in PostProcess (default: true)
  enableAudioVerification?: boolean;     // Audio-aware correction in PostProcess (default: false, 2x cost)
  enableChunking?: boolean;              // Auto-determined by duration if undefined
}

/**
 * User request configuration for creating a pipeline
 */
export interface TranscriptionRequest {
  provider: ProviderConfig;
  features?: PipelineFeatures;
  targetLanguage?: string;                 // Default: 'Greek (Ελληνικά)'
  enableSpeakerIdentification?: boolean;   // Default: true
  enableTimestamps?: boolean;              // Default: true
  customInstructions?: string;
}

/**
 * File upload source
 */
export interface FileUpload {
  type: 'file';
  buffer: ArrayBuffer;
  mimeType: string;
  fileName: string;
}

/**
 * YouTube URL source
 */
export interface YouTubeURL {
  type: 'youtube';
  url: string;
}

/**
 * Pipeline input (either file upload or YouTube URL)
 */
export type PipelineInput = {
  source: FileUpload | YouTubeURL;
  request: TranscriptionRequest;
};

/**
 * Pipeline result returned to the user
 */
export interface PipelineResult {
  text: string;
  fileName: string;
  metadata: {
    provider: string;
    model?: string;

    // Duration info
    audioDurationSeconds?: number;
    processingTimeMs: number;

    // Chunking info
    chunked?: boolean;
    chunkCount?: number;
    chunkDurationSeconds?: number;
    overlapSeconds?: number;

    // Feature info
    keyterms?: string[];
    keytermCount?: number;
    correctionCount?: number;

    // Word count
    wordCount?: number;

    // Structured data (if available from provider)
    structuredData?: StructuredTranscription;
    rawJson?: string;
  };
}

/**
 * Internal pipeline configuration (built from TranscriptionRequest)
 */
export interface PipelineConfig {
  provider: ProviderConfig;
  targetLanguage: string;
  enableSpeakerIdentification: boolean;
  enableTimestamps: boolean;
  enableKeytermExtraction: boolean;
  enableTranscriptionCorrection: boolean;
  enableAudioVerification: boolean;
  enableChunking: boolean | undefined; // undefined = auto-determine
  customInstructions?: string;
  durationSeconds?: number; // Set by PreProcess stage
}

/**
 * PreProcess stage output
 */
export interface PreProcessOutput {
  // Optimized audio ready for transcription
  audio: TranscriptionInput;

  // Metadata
  fileName: string;
  durationSeconds: number;
  isChunked: boolean;
  chunkSpecs?: ChunkSpec[];

  // Extracted keyterms (if enabled)
  keyterms?: string[];

  // Cleanup function for temporary files
  cleanup?: () => Promise<void>;
}

/**
 * Individual chunk result from transcription
 */
export interface ChunkResult {
  text: string;
  startTime: number;
  endTime: number;
  hasOverlapBefore: boolean;
  hasOverlapAfter: boolean;
  model?: string;
  wasTruncated?: boolean;
  structuredData?: StructuredTranscription;
  rawJson?: string;
  keyterms?: string[];
  correctionCount?: number;
  correctionTimeMs?: number;
}

/**
 * Transcription stage output
 */
export interface TranscriptionOutput {
  // Raw transcription result (stitched if chunked)
  text: string;
  structuredData?: StructuredTranscription;
  rawJson?: string;

  // Provider metadata
  provider: string;
  model?: string;

  // Chunk metadata (if chunked)
  chunkResults?: ChunkResult[];
  chunkCount?: number;
  chunkDurationSeconds?: number;
  overlapSeconds?: number;

  // Keyterms used
  keyterms?: string[];
}

/**
 * PostProcess stage output
 */
export interface PostProcessOutput {
  // Final corrected transcription
  text: string;
  structuredData?: StructuredTranscription;
  rawJson?: string;

  // Correction metadata
  correctionCount?: number;
  correctionTimeMs?: number;
}
