import { readFile } from 'fs/promises';
import type { TranscriptionInput } from '../../ai/types';
import type { PipelineInput, PipelineConfig, PreProcessOutput } from '../types';
import { extractAudioFromYouTube } from '../../youtube';
import { optimizeAudioForTranscription, getAudioDuration, shouldUseChunking, calculateChunks } from '../../audio';
import { KeytermExtractor } from '../../ai/keyterm-extractor';

/**
 * PreProcess Stage
 * Responsible for preparing audio for transcription
 *
 * Tasks:
 * - YouTube audio extraction (if YouTube URL)
 * - Audio optimization (noise reduction, normalization, 16kHz mono)
 * - Duration detection
 * - Chunking decisions
 * - Keyterm extraction
 */
export class PreProcessStage {
  /**
   * Execute preprocessing
   * @param input - Pipeline input (file or YouTube URL)
   * @param config - Pipeline configuration
   * @returns Preprocessed audio and metadata
   */
  async execute(input: PipelineInput, config: PipelineConfig): Promise<PreProcessOutput> {
    let cleanup: (() => Promise<void>) | null = null;
    let transcriptionInput: TranscriptionInput;
    let fileName: string;
    let durationSeconds: number | undefined;

    // Step 1: Extract/Read audio based on source type
    if (input.source.type === 'youtube') {
      console.log('[PreProcess] Extracting audio from YouTube...');
      const extraction = await extractAudioFromYouTube(input.source.url);
      cleanup = extraction.cleanup;
      durationSeconds = extraction.duration;
      fileName = extraction.title;

      // Read file buffer and convert to ArrayBuffer
      const fileBuffer = await readFile(extraction.filePath);
      const arrayBuffer = fileBuffer.buffer.slice(
        fileBuffer.byteOffset,
        fileBuffer.byteOffset + fileBuffer.byteLength
      );

      transcriptionInput = {
        buffer: arrayBuffer,
        mimeType: extraction.mimeType,
        fileName: extraction.title,
      };

      console.log(`[PreProcess] YouTube audio extracted: ${fileName}, ${durationSeconds?.toFixed(1)}s`);
    } else {
      // File upload
      transcriptionInput = {
        buffer: input.source.buffer,
        mimeType: input.source.mimeType,
        fileName: input.source.fileName,
      };
      fileName = input.source.fileName;
      console.log(`[PreProcess] Processing uploaded file: ${fileName}`);
    }

    // Step 2: Optimize audio for better transcription accuracy
    console.log('[PreProcess] Optimizing audio (16kHz mono, -23 LUFS, noise reduction)...');
    let optimizedInput: TranscriptionInput;
    try {
      optimizedInput = await optimizeAudioForTranscription(transcriptionInput);
      console.log('[PreProcess] Audio optimization complete');
    } catch (error) {
      console.warn('[PreProcess] Audio optimization failed, using original:', error);
      optimizedInput = transcriptionInput;
    }

    // Step 3: Detect duration (if not already known from YouTube)
    if (!durationSeconds) {
      try {
        durationSeconds = await getAudioDuration(optimizedInput);
        console.log(`[PreProcess] Duration detected: ${durationSeconds.toFixed(1)}s`);
      } catch (error) {
        console.warn('[PreProcess] Failed to detect duration:', error);
        durationSeconds = 0;
      }
    }

    // Step 4: Determine if chunking should be used
    let isChunked = false;
    let chunkSpecs = undefined;

    if (config.enableChunking === undefined) {
      // Auto-determine based on duration
      isChunked = shouldUseChunking(durationSeconds);
    } else {
      isChunked = config.enableChunking;
    }

    if (isChunked && durationSeconds > 0) {
      chunkSpecs = calculateChunks(durationSeconds);
      console.log(`[PreProcess] Chunking enabled: ${chunkSpecs.length} chunks`);
    } else {
      console.log('[PreProcess] Chunking disabled: processing as single file');
    }

    // Step 5: Extract keyterms (if enabled and provider supports it)
    let keyterms: string[] | undefined;
    const supportsKeyterms = config.provider.type === 'elevenlabs' || config.provider.type === 'google-gemini';

    if (config.enableKeytermExtraction && supportsKeyterms && !isChunked) {
      // Only extract keyterms for non-chunked files here
      // For chunked files, keyterms will be extracted per-chunk in TranscriptionStage
      try {
        console.log('[PreProcess] Extracting keyterms...');
        const extractor = new KeytermExtractor();
        keyterms = await extractor.extractKeyterms(optimizedInput, {
          maxKeyterms: 100,
          minLength: 2,
          languageCode: 'el',
        });
        console.log(`[PreProcess] Extracted ${keyterms.length} keyterms`);
      } catch (error) {
        console.warn('[PreProcess] Keyterm extraction failed:', error);
      }
    }

    return {
      audio: optimizedInput,
      fileName,
      durationSeconds: durationSeconds || 0,
      isChunked,
      chunkSpecs, // these are the chunk specs for the entire file, that will be later used in the transcription stage
      keyterms,
      cleanup: cleanup || undefined,
    };
  }
}
