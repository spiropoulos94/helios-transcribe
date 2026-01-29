import { readFile } from 'fs/promises';
import type { TranscriptionInput as AudioInput, TranscriptionConfig, AITranscriptionProvider } from '../../ai/types';
import type { PipelineConfig, TranscriptionOutput, ChunkResult } from '../types';
import { ElevenLabsProvider } from '../../ai/providers/elevenlabs';
import { GoogleGeminiProvider } from '../../ai/providers/google';
import { OpenAIProvider } from '../../ai/providers/openai';
import { KeytermExtractor } from '../../ai/keyterm-extractor';
import { splitAudioIntoChunks, cleanupChunks, type AudioChunk, type ChunkSpec } from '../../audio/ffmpeg';
import { adjustTimestamps, adjustStructuredTimestamps, deduplicateAndStitch } from '../../audio/deduplication';
import { audioConfig } from '../../config';
import { StructuredTranscription } from '../../ai/types';

/**
 * Input for transcription stage
 */
export interface TranscriptionStageInput {
  audio: AudioInput;
  isChunked: boolean;
  chunkSpecs?: ChunkSpec[];
  keyterms?: string[];
}

/**
 * Transcription Stage
 * Responsible for executing transcription with the provider
 *
 * Tasks:
 * - Provider selection and instantiation
 * - Single file transcription OR chunked processing
 * - Per-chunk transcription with concurrency control
 * - Timestamp adjustment for chunks
 * - Basic chunk stitching
 */
export class TranscriptionStage {
  /**
   * Execute transcription
   * @param input - Transcription input (audio, chunking info, keyterms)
   * @param config - Pipeline configuration
   * @returns Raw transcription result
   */
  async execute(input: TranscriptionStageInput, config: PipelineConfig): Promise<TranscriptionOutput> {
    // Create provider based on config
    const provider = this.createProvider(config, input.keyterms);

    // Validate input
    const validation = provider.validateInput(input.audio);
    if (!validation.valid) {
      throw new Error(validation.error || 'Input validation failed');
    }

    // Build transcription config
    const transcriptionConfig: TranscriptionConfig = {
      targetLanguage: config.targetLanguage,
      enableSpeakerIdentification: config.enableSpeakerIdentification,
      enableTimestamps: config.enableTimestamps,
      durationSeconds: config.durationSeconds,
      customInstructions: config.customInstructions,
      enableKeytermExtraction: config.enableKeytermExtraction,
      enableTranscriptionCorrection: config.enableTranscriptionCorrection,
      enableAudioVerification: config.enableAudioVerification,
    };

    if (input.isChunked && input.chunkSpecs) {
      // Chunked processing
      return this.processChunked(input.audio, input.chunkSpecs, provider, transcriptionConfig, config);
    } else {
      // Single file processing
      return this.processSingle(input.audio, provider, input.keyterms);
    }
  }

  /**
   * Create provider instance based on configuration
   */
  private createProvider(config: PipelineConfig, keyterms?: string[]): AITranscriptionProvider {
    const { type, model } = config.provider;

    if (type === 'elevenlabs') {
      return new ElevenLabsProvider({
        model: (model as 'scribe_v1' | 'scribe_v2') || 'scribe_v2',
        keyterms,
      });
    } else if (type === 'google-gemini') {
      return new GoogleGeminiProvider({
        model: model || 'gemini-2.0-flash',
        enableStructuredOutput: true,
        keyterms,
      });
    } else if (type === 'openai') {
      return new OpenAIProvider({
        whisperModel: model || 'gpt-4o-transcribe-diarize',
        gptModel: model || 'gpt-4o-transcribe-diarize',
      });
    } else {
      throw new Error(`Unsupported provider type: ${type}`);
    }
  }

  /**
   * Process single file (no chunking)
   */
  private async processSingle(
    audio: AudioInput,
    provider: AITranscriptionProvider,
    keyterms?: string[]
  ): Promise<TranscriptionOutput> {
    const config: TranscriptionConfig = {
      targetLanguage: 'Greek (Ελληνικά)',
      enableSpeakerIdentification: true,
      enableTimestamps: true,
    };

    const result = await provider.transcribe(audio, config);

    return {
      text: result.text,
      structuredData: result.structuredData,
      rawJson: result.rawJson,
      provider: provider.name,
      model: result.metadata?.model,
      keyterms,
    };
  }

  /**
   * Process chunked file
   */
  private async processChunked(
    audio: AudioInput,
    chunkSpecs: ChunkSpec[],
    provider: AITranscriptionProvider,
    config: TranscriptionConfig,
    pipelineConfig: PipelineConfig
  ): Promise<TranscriptionOutput> {
    console.log(`[Transcription] Processing ${chunkSpecs.length} chunks`);
    let audioChunks: AudioChunk[] = [];

    try {
      // Split audio into chunk files
      audioChunks = await splitAudioIntoChunks(audio, chunkSpecs);

      // Process chunks with concurrency control
      const chunkResults = await this.processChunksWithConcurrency(
        audioChunks,
        provider,
        config,
        pipelineConfig
      );

      // Adjust timestamps
      console.log('[Transcription] Adjusting timestamps');
      const adjustedChunks = chunkResults.map((chunk, index) => {
      

        const offsetSeconds = Math.round(chunk.startTime);
        console.log(`[Transcription] Chunk ${index + 1}: +${offsetSeconds}s offset`);

        return {
          ...chunk,
          text: adjustTimestamps(chunk.text, offsetSeconds),
          structuredData: chunk.structuredData
            ? adjustStructuredTimestamps(chunk.structuredData, offsetSeconds)
            : undefined,
        };
      });

      // Deduplicate and stitch
      console.log('[Transcription] Deduplicating and stitching chunks');
      const finalText = deduplicateAndStitch(adjustedChunks);

      // Merge structured data
      const hasStructuredData = adjustedChunks.some(r => r.structuredData);
      let mergedStructuredData: StructuredTranscription | undefined;
      let mergedRawJson: string | undefined;

      if (hasStructuredData) {
        const allSegments = adjustedChunks
          .filter(r => r.structuredData?.segments)
          .flatMap(r => r.structuredData!.segments);

        // TODO: Generate a proper summary for the entire transcription instead of using only the first chunk's summary
        const firstSummary = adjustedChunks.find(r => r.structuredData?.summary)?.structuredData?.summary;

        if (allSegments.length > 0) {
          mergedStructuredData = {
            summary: firstSummary || 'Multi-chunk transcription',
            segments: allSegments,
          };
          mergedRawJson = JSON.stringify(mergedStructuredData, null, 2);
        }
      }

      // Aggregate keyterms and correction stats
      const allKeyterms = new Set<string>();
      let totalChunkCorrections = 0;
      let totalChunkCorrectionTime = 0;

      chunkResults.forEach(chunk => {
        if (chunk.keyterms) {
          chunk.keyterms.forEach(keyterm => allKeyterms.add(keyterm));
        }
        if (chunk.correctionCount !== undefined) {
          totalChunkCorrections += chunk.correctionCount;
          totalChunkCorrectionTime += chunk.correctionTimeMs || 0;
        }
      });

      if (totalChunkCorrections > 0) {
        console.log(`[Transcription] Total audio verification: ${totalChunkCorrections} corrections across all chunks in ${totalChunkCorrectionTime}ms`);
      }

      const chunkDurationMinutes = chunkSpecs.length > 0
        ? (chunkSpecs[0].endTime - chunkSpecs[0].startTime) / 60
        : 0;

      return {
        text: finalText,
        structuredData: mergedStructuredData,
        rawJson: mergedRawJson,
        provider: provider.name,
        model: chunkResults[0]?.model,
        chunkResults,
        chunkCount: chunkResults.length,
        chunkDurationSeconds: chunkDurationMinutes * 60,
        overlapSeconds: 20,
        keyterms: Array.from(allKeyterms),
      };
    } finally {
      // Cleanup chunk files
      if (audioChunks.length > 0) {
        await cleanupChunks(audioChunks);
      }
    }
  }

  /**
   * Process chunks with concurrency control
   */
  private async processChunksWithConcurrency(
    chunks: AudioChunk[],
    provider: AITranscriptionProvider,
    config: TranscriptionConfig,
    pipelineConfig: PipelineConfig
  ): Promise<ChunkResult[]> {
    const maxConcurrent = audioConfig.maxConcurrentChunks;

    // Sequential processing
    if (maxConcurrent === 0 || maxConcurrent === 1) {
      console.log('[Transcription] Processing chunks sequentially');
      const results: ChunkResult[] = [];
      for (const chunk of chunks) {
        console.log(`[Transcription] Chunk ${chunk.index + 1}/${chunk.total}`);
        const result = await this.processChunk(chunk, provider, config, pipelineConfig);
        results.push(result);
      }
      return results;
    }

    // Unlimited concurrency
    if (maxConcurrent < 0) {
      console.log(`[Transcription] Processing all ${chunks.length} chunks in parallel`);
      return Promise.all(chunks.map(chunk => this.processChunk(chunk, provider, config, pipelineConfig)));
    }

    // Limited concurrency
    console.log(`[Transcription] Processing with max concurrency: ${maxConcurrent}`);
    const results: ChunkResult[] = new Array(chunks.length);
    let activeCount = 0;
    let chunkIndex = 0;

    return new Promise((resolve, reject) => {
      const startNext = () => {
        while (activeCount < maxConcurrent && chunkIndex < chunks.length) {
          const currentIndex = chunkIndex++;
          const chunk = chunks[currentIndex];
          activeCount++;

          console.log(`[Transcription] Starting chunk ${chunk.index + 1}/${chunk.total}`);

          this.processChunk(chunk, provider, config, pipelineConfig)
            .then(result => {
              results[currentIndex] = result;
              console.log(`[Transcription] ✓ Chunk ${chunk.index + 1}/${chunk.total} complete`);
            })
            .catch(error => reject(error))
            .finally(() => {
              activeCount--;
              if (chunkIndex >= chunks.length && activeCount === 0) {
                resolve(results);
              } else {
                startNext();
              }
            });
        }
      };

      startNext();
    });
  }

  /**
   * Process a single chunk
   */
  private async processChunk(
    chunk: AudioChunk,
    provider: AITranscriptionProvider,
    config: TranscriptionConfig,
    pipelineConfig: PipelineConfig
  ): Promise<ChunkResult> {
    try {
      // Read chunk file
      const buffer = await readFile(chunk.filePath);
      const chunkInput: AudioInput = {
        buffer: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
        mimeType: 'audio/mpeg',
        fileName: `chunk_${chunk.index}_${chunk.total}`,
      };

      // Extract keyterms for this chunk if enabled
      let chunkProvider = provider;
      let extractedKeyterms: string[] | undefined;
      const supportsKeyterms = provider.name === 'elevenlabs' || provider.name === 'google-gemini';

      if (pipelineConfig.enableKeytermExtraction && supportsKeyterms) {
        try {
          console.log(`[Transcription] Extracting keyterms for chunk ${chunk.index + 1}...`);
          const extractor = new KeytermExtractor();
          const chunkKeyterms = await extractor.extractKeyterms(chunkInput, {
            maxKeyterms: 50,
            minLength: 2,
            languageCode: 'el',
          });
          extractedKeyterms = chunkKeyterms;

          // Create new provider instance with chunk-specific keyterms
          if (provider.name === 'elevenlabs') {
            chunkProvider = new ElevenLabsProvider({
              model: (provider as any).model || 'scribe_v2',
              keyterms: chunkKeyterms,
            });
          } else if (provider.name === 'google-gemini') {
            chunkProvider = new GoogleGeminiProvider({
              model: (provider as any).config?.model || 'gemini-2.0-flash',
              enableStructuredOutput: true,
              keyterms: chunkKeyterms,
            });
          }

          console.log(`[Transcription] Using ${chunkKeyterms.length} keyterms for chunk ${chunk.index + 1}`);
        } catch (error) {
          console.warn(`[Transcription] Keyterm extraction failed for chunk ${chunk.index + 1}:`, error);
        }
      }

      // Transcribe chunk
      const result = await chunkProvider.transcribe(chunkInput, config);

      let finalText = result.text;
      let correctionCount: number | undefined;
      let correctionTimeMs: number | undefined;

      // Apply audio verification if enabled (before chunk file is deleted)
      if (pipelineConfig.enableAudioVerification) {
        try {
          console.log(`[Transcription] Applying audio verification for chunk ${chunk.index + 1}...`);
          const { TranscriptionCorrector } = await import('../../ai/transcription-corrector');
          const corrector = new TranscriptionCorrector();

          const correctionResult = await corrector.correctTranscription(finalText, {
            languageCode: 'el',
            preserveTimestamps: true,
            preserveSpeakers: true,
            audioInput: chunkInput,
            enableAudioVerification: true,
          });

          finalText = correctionResult.correctedText;
          correctionCount = correctionResult.correctionCount;
          correctionTimeMs = correctionResult.processingTimeMs;
          console.log(`[Transcription] Chunk ${chunk.index + 1} audio verification: ${correctionCount} corrections in ${correctionTimeMs}ms`);
        } catch (error) {
          console.warn(`[Transcription] Audio verification failed for chunk ${chunk.index + 1}:`, error);
        }
      }

      return {
        text: finalText,
        startTime: chunk.startTime,
        endTime: chunk.endTime,
        hasOverlapBefore: chunk.hasOverlapBefore,
        hasOverlapAfter: chunk.hasOverlapAfter,
        model: result.metadata?.model,
        wasTruncated: result.metadata?.wasTruncated,
        structuredData: result.structuredData,
        rawJson: result.rawJson,
        keyterms: extractedKeyterms,
        correctionCount,
        correctionTimeMs,
      };
    } catch (error) {
      throw new Error(
        `Failed to transcribe chunk ${chunk.index + 1}/${chunk.total}: ` +
        `${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
