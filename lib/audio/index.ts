/**
 * Audio processing utilities for transcription
 * Handles chunking, FFmpeg operations, and deduplication
 */

export { getAudioDuration, splitAudioIntoChunks, cleanupChunks } from './ffmpeg';
export type { ChunkSpec, AudioChunk } from './ffmpeg';

export { adjustTimestamps, adjustStructuredTimestamps, deduplicateAndStitch } from './deduplication';
export type { ChunkResult } from './deduplication';

export { shouldUseChunking, calculateChunks, processWithChunking } from './chunker';

export { optimizeAudioForTranscription, isFFmpegAvailable } from './optimizer';
export type { AudioOptimizationConfig } from './optimizer';

export { sanitizeFileName } from './utils';
