import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import type { TranscriptionInput } from '../ai/types';

const execAsync = promisify(exec);

export interface ChunkSpec {
  index: number;
  total: number;
  startTime: number;
  endTime: number;
  duration: number;
  hasOverlapBefore: boolean;
  hasOverlapAfter: boolean;
}

export interface AudioChunk extends ChunkSpec {
  filePath: string;
}

/**
 * Detects the duration of an audio file using ffprobe
 * @param input - TranscriptionInput containing buffer and file info
 * @returns Duration in seconds
 * @throws Error if ffprobe fails or is not installed
 */
export async function getAudioDuration(input: TranscriptionInput): Promise<number> {
  const tempFilePath = join(tmpdir(), `temp_probe_${Date.now()}_${input.fileName}`);

  try {
    // Write buffer to temp file for ffprobe
    await writeFile(tempFilePath, Buffer.from(input.buffer));

    // Run ffprobe to get duration
    const { stdout, stderr } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${tempFilePath}"`
    );

    if (stderr && stderr.includes('not found')) {
      throw new Error('FFmpeg is not installed. FFmpeg is required for processing long audio files. Please install FFmpeg: https://ffmpeg.org/download.html');
    }

    const duration = parseFloat(stdout.trim());

    if (isNaN(duration) || duration <= 0) {
      throw new Error(`Failed to detect audio duration: invalid value "${stdout.trim()}"`);
    }

    console.log(`[Audio Duration] Detected ${formatDuration(duration)} for ${input.fileName}`);

    return duration;
  } catch (error) {
    if (error instanceof Error && error.message.includes('FFmpeg is not installed')) {
      throw error;
    }
    throw new Error(`Failed to detect audio duration: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    // Cleanup temp probe file
    try {
      await unlink(tempFilePath);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Splits an audio file into chunks with overlap
 * @param input - TranscriptionInput containing buffer and file info
 * @param chunks - Array of chunk specifications
 * @returns Array of AudioChunk objects with file paths
 */
export async function splitAudioIntoChunks(
  input: TranscriptionInput,
  chunks: ChunkSpec[]
): Promise<AudioChunk[]> {
  const sourceFilePath = join(tmpdir(), `temp_source_${Date.now()}_${input.fileName}`);
  const audioChunks: AudioChunk[] = [];

  try {
    // Write source buffer to temp file
    await writeFile(sourceFilePath, Buffer.from(input.buffer));
    console.log(`[Audio Splitting] Creating ${chunks.length} chunks from ${input.fileName}`);

    // Create each chunk file
    for (const chunk of chunks) {
      const chunkFileName = `chunk_${chunk.index}_${Date.now()}_${input.fileName}`;
      const chunkFilePath = join(tmpdir(), chunkFileName);

      // Build ffmpeg command
      // -ss: start time, -t: duration, -c copy: no re-encoding (fast)
      const command = `ffmpeg -i "${sourceFilePath}" -ss ${chunk.startTime} -t ${chunk.duration} -c copy "${chunkFilePath}" -y 2>&1`;

      try {
        await execAsync(command);

        console.log(
          `[Audio Splitting] Created chunk ${chunk.index + 1}/${chunk.total}: ` +
          `${formatDuration(chunk.startTime)} - ${formatDuration(chunk.endTime)}`
        );

        audioChunks.push({
          ...chunk,
          filePath: chunkFilePath,
        });
      } catch (error) {
        throw new Error(
          `Failed to create chunk ${chunk.index + 1}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return audioChunks;
  } catch (error) {
    // Cleanup any created chunks on failure
    for (const chunk of audioChunks) {
      try {
        await unlink(chunk.filePath);
      } catch {
        // Ignore cleanup errors
      }
    }
    throw error;
  } finally {
    // Cleanup source file
    try {
      await unlink(sourceFilePath);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Cleans up chunk files from the filesystem
 * @param chunks - Array of AudioChunk objects to clean up
 */
export async function cleanupChunks(chunks: AudioChunk[]): Promise<void> {
  const results = await Promise.allSettled(
    chunks.map(chunk => unlink(chunk.filePath))
  );

  const failed = results.filter(r => r.status === 'rejected').length;
  if (failed > 0) {
    console.warn(`[Audio Cleanup] Failed to delete ${failed}/${chunks.length} chunk files`);
  } else {
    console.log(`[Audio Cleanup] Successfully deleted ${chunks.length} chunk files`);
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
