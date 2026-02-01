import type { TranscriptionInput, StructuredTranscription } from './ai/types';
import { ElevenLabsProvider } from './ai/providers/elevenlabs';
import { GoogleGeminiProvider } from './ai/providers/google';
import { pipelineConfig } from './config';

type PipelineMode = 'gemini-only' | 'elevenlabs-only';

/**
 * Transcription input
 */
export interface TranscriberInput {
  buffer: ArrayBuffer;
  mimeType: string;
  fileName: string;
}

/**
 * Transcription result
 */
export interface TranscriberResult {
  text: string;
  fileName: string;
  metadata: {
    pipelineMode: PipelineMode;
    provider: string;
    model?: string;
    processingTimeMs: number;
    wordCount?: number;
    structuredData?: StructuredTranscription;
    rawResponses?: {
      gemini?: string;
      elevenlabs?: string;
    };
  };
}

/**
 * Simple Transcriber
 * Combines everything into one class - no stages, no complex orchestration
 * Supports two modes:
 * 1. gemini-only: Direct Gemini transcription with native multimodal capabilities
 * 2. elevenlabs-only: ElevenLabs for precise timestamps and speaker identification
 */
export class Transcriber {
  /**
   * Transcribe audio file
   */
  async transcribe(input: TranscriberInput): Promise<TranscriberResult> {
    const startTime = Date.now();

    console.log(`[Transcriber] Processing: ${input.fileName}`);
    console.log(`[Transcriber] Mode: ${pipelineConfig.mode}`);

    // Execute transcription based on configured mode
    const mode = pipelineConfig.mode as PipelineMode;
    const result = mode === 'gemini-only'
      ? await this.transcribeGeminiOnly(input)
      : await this.transcribeElevenLabsOnly(input);

    // Build final result
    const processingTimeMs = Date.now() - startTime;
    const wordCount = result.text.split(/\s+/).filter(Boolean).length;

    console.log(`[Transcriber] Complete! Time: ${(processingTimeMs / 1000).toFixed(1)}s, Words: ${wordCount}`);

    return {
      text: result.text,
      fileName: input.fileName,
      metadata: {
        pipelineMode: pipelineConfig.mode,
        provider: result.provider,
        model: result.model,
        processingTimeMs,
        wordCount,
        structuredData: result.structuredData,
        rawResponses: result.rawResponses,
      },
    };
  }

  /**
   * Gemini-Only Mode
   * Uses Gemini with native multimodal capabilities
   */
  private async transcribeGeminiOnly(input: TranscriberInput) {
    console.log('[Transcriber] Gemini-only: Starting transcription');

    const provider = new GoogleGeminiProvider({
      model: pipelineConfig.geminiModel,
      enableStructuredOutput: true,
    });

    const transcriptionInput: TranscriptionInput = {
      buffer: input.buffer,
      mimeType: input.mimeType,
      fileName: input.fileName,
    };

    const result = await provider.transcribe(transcriptionInput, {
      targetLanguage: pipelineConfig.targetLanguage,
      enableSpeakerIdentification: true,
      enableTimestamps: true,
    });

    return {
      text: result.text,
      structuredData: result.structuredData,
      rawResponses: { gemini: result.rawJson },
      provider: `${pipelineConfig.geminiModel}`,
      model: pipelineConfig.geminiModel,
    };
  }

  /**
   * Format seconds into HH:MM:SS or MM:SS timestamp
   */
  private formatTimestamp(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * ElevenLabs-Only Mode
   * Uses ElevenLabs for precise timestamps and speaker identification
   */
  private async transcribeElevenLabsOnly(input: TranscriberInput) {
    console.log('[Transcriber] ElevenLabs-only: Starting transcription');

    const transcriptionInput: TranscriptionInput = {
      buffer: input.buffer,
      mimeType: input.mimeType,
      fileName: input.fileName,
    };

    const provider = new ElevenLabsProvider({
      model: pipelineConfig.elevenLabsModel,
      timeoutMs: 2 * 60 * 60 * 1000, // 2 hours for very long audio files
    });

    const result = await provider.transcribe(transcriptionInput, {
      targetLanguage: pipelineConfig.targetLanguage,
      enableSpeakerIdentification: true,
      enableTimestamps: true,
    });

    // Generate plain text from structured data
    const plainText = result.structuredData?.segments
      ? result.structuredData.segments
          .map(seg => {
            const timestamp = this.formatTimestamp(seg.startTime);
            return `[${timestamp}] ${seg.speaker}: ${seg.text}`;
          })
          .join('\n\n')
      : result.text;

    return {
      text: plainText,
      structuredData: result.structuredData,
      rawResponses: { elevenlabs: result.rawJson },
      provider: `elevenlabs-${pipelineConfig.elevenLabsModel}`,
      model: pipelineConfig.elevenLabsModel,
    };
  }
}
