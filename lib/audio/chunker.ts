import { readFile } from 'fs/promises';
import type {
  TranscriptionInput,
  TranscriptionConfig,
  TranscriptionResult,
  AITranscriptionProvider,
} from '../ai/types';
import type { ChunkSpec, AudioChunk } from './ffmpeg';
import { getAudioDuration, splitAudioIntoChunks, cleanupChunks } from './ffmpeg';
import { adjustTimestamps, deduplicateAndStitch, type ChunkResult } from './deduplication';
import { audioConfig } from '../config';
import { formatDuration } from '../utils/format';

/**
 * Determines if audio chunking should be used based on configuration and duration
 * @param durationSeconds - Audio duration in seconds
 * @returns True if chunking should be used
 */
export function shouldUseChunking(durationSeconds: number): boolean {
  if (!audioConfig.enableChunking) {
    return false;
  }
  // Use chunking for files longer than 10 minutes
  const thresholdSeconds = 10 * 60;
  return durationSeconds >= thresholdSeconds;
}

/**
 * Calculates optimal chunk duration based on total file duration
 * Returns a value between 5-30 minutes that divides the file reasonably
 * @param durationSeconds - Total audio duration in seconds
 * @returns Optimal chunk duration in minutes
 */
export function calculateOptimalChunkDuration(durationSeconds: number): number {
  const durationMinutes = durationSeconds / 60;

  // For files under 15 minutes, use 5-minute chunks
  if (durationMinutes < 15) {
    return 5;
  }

  // For files 15-60 minutes, use 10-minute chunks
  if (durationMinutes < 60) {
    return 10;
  }

  // For files 60-120 minutes, use 15-minute chunks
  if (durationMinutes < 120) {
    return 15;
  }

  // For files 120-180 minutes, use 20-minute chunks
  if (durationMinutes < 180) {
    return 20;
  }

  // For very long files (3+ hours), use 30-minute chunks
  return 30;
}

/**
 * Calculates chunk boundaries with overlap for a given duration
 * @param durationSeconds - Total audio duration in seconds
 * @returns Array of chunk specifications
 */
export function calculateChunks(durationSeconds: number): ChunkSpec[] {
  const chunkDurationMinutes = calculateOptimalChunkDuration(durationSeconds);
  const chunkDurationSeconds = chunkDurationMinutes * 60;
  const overlapSeconds = 10; // Fixed 10-second overlap

  const chunks: ChunkSpec[] = [];
  let currentStart = 0;
  let chunkIndex = 0;

  while (currentStart < durationSeconds) {
    const isFirstChunk = chunkIndex === 0;
    const hasOverlapBefore = !isFirstChunk;

    // Calculate chunk start (with overlap before if not first chunk)
    const chunkStart = isFirstChunk ? 0 : currentStart - overlapSeconds;

    // Calculate chunk end (with overlap after if not last chunk)
    const baseEnd = currentStart + chunkDurationSeconds;
    const chunkEnd = Math.min(baseEnd + overlapSeconds, durationSeconds);

    const hasOverlapAfter = chunkEnd < durationSeconds;

    chunks.push({
      index: chunkIndex,
      total: 0, // Will be set after we know total count
      startTime: chunkStart,
      endTime: chunkEnd,
      duration: chunkEnd - chunkStart,
      hasOverlapBefore,
      hasOverlapAfter,
    });

    // Move to next chunk (non-overlapping boundary)
    currentStart += chunkDurationSeconds;
    chunkIndex++;
  }

  // Set total count on all chunks
  const totalChunks = chunks.length;
  chunks.forEach(chunk => {
    chunk.total = totalChunks;
  });

  return chunks;
}

/**
 * Processes an audio file using chunking strategy
 * @param input - TranscriptionInput containing buffer and file info
 * @param config - Transcription configuration
 * @param provider - AI transcription provider to use
 * @returns Complete transcription result with stitched chunks
 */
export async function processWithChunking(
  input: TranscriptionInput,
  config: TranscriptionConfig,
  provider: AITranscriptionProvider
): Promise<TranscriptionResult> {
  const startTime = Date.now();
  let audioChunks: AudioChunk[] = [];

  try {
    // 1. Detect duration
    console.log(`[Audio Chunking] Starting chunked transcription for ${input.fileName}`);
    const duration = await getAudioDuration(input);
    console.log(`[Audio Chunking] Duration: ${formatDuration(duration)}`);

    // 2. Calculate chunk boundaries
    const chunkDurationMinutes = calculateOptimalChunkDuration(duration);
    const chunkSpecs = calculateChunks(duration);
    console.log(
      `[Audio Chunking] Creating ${chunkSpecs.length} chunks ` +
      `(${chunkDurationMinutes} min each, 10s overlap)`
    );

    // 3. Split audio into chunk files
    audioChunks = await splitAudioIntoChunks(input, chunkSpecs);

    // 4. Process chunks (parallel or sequential based on config)
    const chunkResults = await processChunksWithConcurrency(
      audioChunks,
      provider,
      config,
      audioConfig.maxConcurrentChunks
    );

    // 5. Adjust timestamps in each chunk
    console.log(`[Audio Chunking] Adjusting timestamps`);
    const adjustedChunks = chunkResults.map(chunk => ({
      ...chunk,
      text: adjustTimestamps(chunk.text, Math.floor(chunk.startTime)),
    }));

    // 6. Deduplicate and stitch results
    console.log(`[Audio Chunking] Deduplicating and stitching ${adjustedChunks.length} chunks`);
    const finalText = deduplicateAndStitch(adjustedChunks);

    // 7. Calculate aggregate metadata
    const processingTimeMs = Date.now() - startTime;
    const wordCount = finalText.split(/\s+/).filter(Boolean).length;

    // Check if any chunk was truncated
    const anyTruncated = chunkResults.some(r => r.wasTruncated);

    console.log(
      `[Audio Chunking] Complete! Total processing time: ${(processingTimeMs / 1000).toFixed(1)}s, ` +
      `Final word count: ${wordCount}`
    );

    return {
      text: finalText,
      provider: provider.name,
      metadata: {
        wordCount,
        model: chunkResults[0]?.model,
        processingTimeMs,
        chunked: true,
        chunkCount: audioChunks.length,
        chunkDurationSeconds: chunkDurationMinutes * 60,
        overlapSeconds: 10,
        wasTruncated: anyTruncated,
        finishReason: anyTruncated ? 'MAX_TOKENS' : 'STOP',
      },
    };
  } finally {
    // CRITICAL: Always cleanup chunk files
    if (audioChunks.length > 0) {
      await cleanupChunks(audioChunks);
    }
  }
}

/**
 * Processes multiple chunks with controlled concurrency
 * @param chunks - Array of audio chunks to process
 * @param provider - AI transcription provider
 * @param config - Transcription configuration
 * @param maxConcurrent - Maximum number of chunks to process in parallel (0 = sequential, -1 = unlimited)
 * @returns Array of chunk results in original order
 */
async function processChunksWithConcurrency(
  chunks: AudioChunk[],
  provider: AITranscriptionProvider,
  config: TranscriptionConfig,
  maxConcurrent: number
): Promise<ChunkResult[]> {
  // If maxConcurrent is 0 or 1, process sequentially
  if (maxConcurrent === 0 || maxConcurrent === 1) {
    console.log(`[Audio Chunking] Processing chunks sequentially`);
    const results: ChunkResult[] = [];
    for (const chunk of chunks) {
      console.log(
        `[Audio Chunking] Processing chunk ${chunk.index + 1}/${chunk.total}: ` +
        `${formatDuration(chunk.startTime)} - ${formatDuration(chunk.endTime)}`
      );
      const result = await processChunk(chunk, provider, config);
      results.push(result);
    }
    return results;
  }

  // Unlimited concurrency - process all at once (MAXIMUM SPEED)
  if (maxConcurrent < 0) {
    console.log(`[Audio Chunking] Processing ALL ${chunks.length} chunks in parallel (unlimited concurrency)`);
    return Promise.all(
      chunks.map(async (chunk) => {
        console.log(
          `[Audio Chunking] Starting chunk ${chunk.index + 1}/${chunk.total}: ` +
          `${formatDuration(chunk.startTime)} - ${formatDuration(chunk.endTime)}`
        );
        const result = await processChunk(chunk, provider, config);
        console.log(
          `[Audio Chunking] ✓ Completed chunk ${chunk.index + 1}/${chunk.total}`
        );
        return result;
      })
    );
  }

  // Optimized parallel processing with concurrency limit
  console.log(`[Audio Chunking] Processing chunks with max concurrency: ${maxConcurrent}`);

  const results: ChunkResult[] = new Array(chunks.length);
  let activeCount = 0;
  let chunkIndex = 0;

  return new Promise((resolve, reject) => {
    const startNext = () => {
      // Start as many chunks as we can without exceeding the limit
      while (activeCount < maxConcurrent && chunkIndex < chunks.length) {
        const currentIndex = chunkIndex++;
        const chunk = chunks[currentIndex];
        activeCount++;

        console.log(
          `[Audio Chunking] Starting chunk ${chunk.index + 1}/${chunk.total} [${activeCount}/${maxConcurrent} active]: ` +
          `${formatDuration(chunk.startTime)} - ${formatDuration(chunk.endTime)}`
        );

        processChunk(chunk, provider, config)
          .then(result => {
            results[currentIndex] = result;
            console.log(
              `[Audio Chunking] ✓ Completed chunk ${chunk.index + 1}/${chunk.total} [${activeCount - 1}/${maxConcurrent} remaining active]`
            );
          })
          .catch(error => {
            reject(error);
          })
          .finally(() => {
            activeCount--;
            // Check if we're done
            if (chunkIndex >= chunks.length && activeCount === 0) {
              resolve(results);
            } else {
              // Start the next chunk
              startNext();
            }
          });
      }
    };

    startNext();
  });
}

/**
 * Processes a single audio chunk through the AI provider
 * @param chunk - AudioChunk with file path and metadata
 * @param provider - AI transcription provider
 * @param config - Transcription configuration
 * @returns ChunkResult with transcribed text and metadata
 */
async function processChunk(
  chunk: AudioChunk,
  provider: AITranscriptionProvider,
  config: TranscriptionConfig
): Promise<ChunkResult> {
  try {
    // Read chunk file into buffer
    const buffer = await readFile(chunk.filePath);

    // Create TranscriptionInput for this chunk
    const chunkInput: TranscriptionInput = {
      buffer: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
      mimeType: 'audio/mpeg', // Chunks are created as same format as original
      fileName: `chunk_${chunk.index}_${chunk.total}`,
    };

    // Transcribe the chunk
    const result = await provider.transcribe(chunkInput, config);

    return {
      text: result.text,
      startTime: chunk.startTime,
      endTime: chunk.endTime,
      hasOverlapBefore: chunk.hasOverlapBefore,
      hasOverlapAfter: chunk.hasOverlapAfter,
      model: result.metadata?.model,
      wasTruncated: result.metadata?.wasTruncated,
    };
  } catch (error) {
    throw new Error(
      `Failed to transcribe chunk ${chunk.index + 1}/${chunk.total} ` +
      `(${formatDuration(chunk.startTime)}-${formatDuration(chunk.endTime)}): ` +
      `${error instanceof Error ? error.message : String(error)}`
    );
  }
}

