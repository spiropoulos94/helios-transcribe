import type { ChunkSpec } from './ffmpeg';
import { audioConfig } from '../config';

/**
 * Audio Chunking Utilities
 *
 * This module provides utility functions for determining when to use chunking
 * and calculating optimal chunk boundaries for large audio files.
 *
 * Note: The actual chunking processing logic has been moved to the pipeline
 * stages in /lib/pipeline/stages/
 */

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
  const overlapSeconds = 20; // 20 seconds overlap for better context and deduplication

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
