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

/**
 * Determines if audio chunking should be used based on duration
 * @param durationSeconds - Audio duration in seconds
 * @returns True if chunking should be used
 */
export function shouldUseChunking(durationSeconds: number): boolean {
  const thresholdSeconds = audioConfig.chunkingThresholdMinutes * 60;
  // Add 30 second buffer to avoid chunking files exactly at threshold
  return durationSeconds >= thresholdSeconds + 30;
}

/**
 * Calculates chunk boundaries with overlap for a given duration
 * @param durationSeconds - Total audio duration in seconds
 * @returns Array of chunk specifications
 */
export function calculateChunks(durationSeconds: number): ChunkSpec[] {
  const chunkDurationSeconds = audioConfig.chunkDurationMinutes * 60;
  const overlapSeconds = audioConfig.overlapSeconds;

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
    const chunkSpecs = calculateChunks(duration);
    console.log(
      `[Audio Chunking] Creating ${chunkSpecs.length} chunks ` +
      `(${audioConfig.chunkDurationMinutes} min each, ${audioConfig.overlapSeconds}s overlap)`
    );

    // 3. Split audio into chunk files
    audioChunks = await splitAudioIntoChunks(input, chunkSpecs);

    // 4. Process each chunk sequentially
    const chunkResults: ChunkResult[] = [];

    for (const chunk of audioChunks) {
      console.log(
        `[Audio Chunking] Processing chunk ${chunk.index + 1}/${chunk.total}: ` +
        `${formatDuration(chunk.startTime)} - ${formatDuration(chunk.endTime)}`
      );

      const chunkResult = await processChunk(chunk, provider, config);
      chunkResults.push(chunkResult);
    }

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
        chunkDurationSeconds: audioConfig.chunkDurationMinutes * 60,
        overlapSeconds: audioConfig.overlapSeconds,
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

/**
 * Formats duration in seconds to human-readable format
 * @param seconds - Duration in seconds
 * @returns Formatted string (HH:MM:SS or MM:SS)
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
