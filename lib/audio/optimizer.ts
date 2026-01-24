import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import type { TranscriptionInput } from '../ai/types';

const execAsync = promisify(exec);

export interface AudioOptimizationConfig {
  /** Target sample rate in Hz (default: 16000 for optimal ASR) */
  sampleRate?: number;
  /** Target loudness in LUFS (default: -23 LUFS, EBU R128 standard) */
  loudnessLUFS?: number;
  /** Enable noise reduction (default: true) */
  enableNoiseReduction?: boolean;
  /** Noise reduction strength 0-1 (default: 0.21) */
  noiseReductionStrength?: number;
  /** Convert to mono (default: true) */
  convertToMono?: boolean;
}

const DEFAULT_CONFIG: Required<AudioOptimizationConfig> = {
  sampleRate: 16000,
  loudnessLUFS: -23,
  enableNoiseReduction: true,
  noiseReductionStrength: 0.21,
  convertToMono: true,
};

/**
 * Optimizes audio for transcription using FFmpeg
 * Applies:
 * - Noise reduction (afftdn filter)
 * - Loudness normalization (-23 LUFS, EBU R128 standard)
 * - Silence removal at the end
 * - Sample rate conversion (16kHz mono)
 *
 * This pre-processing can boost transcription accuracy by 10-15%
 *
 * @param input - Original audio input
 * @param config - Optimization configuration
 * @returns Optimized audio as TranscriptionInput
 */
export async function optimizeAudioForTranscription(
  input: TranscriptionInput,
  config: AudioOptimizationConfig = {}
): Promise<TranscriptionInput> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const inputFilePath = join(tmpdir(), `optimize_input_${Date.now()}_${input.fileName}`);
  const outputFilePath = join(tmpdir(), `optimize_output_${Date.now()}_${input.fileName.replace(/\.[^.]+$/, '.wav')}`);

  try {
    console.log(`[Audio Optimization] Starting optimization for ${input.fileName}`);

    // Write input buffer to temp file
    await writeFile(inputFilePath, Buffer.from(input.buffer));

    // Build FFmpeg filter chain
    const filters: string[] = [];

    // 1. Noise reduction (afftdn)
    if (finalConfig.enableNoiseReduction) {
      filters.push(`afftdn=nr=${finalConfig.noiseReductionStrength}`);
    }

    // 2. Loudness normalization (EBU R128 standard)
    filters.push(`loudnorm=I=${finalConfig.loudnessLUFS}`);

    // 3. Remove silence at the end
    filters.push('silenceremove=stop_periods=-1:stop_duration=1:stop_threshold=-50dB');

    const filterChain = filters.join(',');

    // Build FFmpeg command
    const channelFlag = finalConfig.convertToMono ? '-ac 1' : '';
    const command = `ffmpeg -i "${inputFilePath}" -af "${filterChain}" -ar ${finalConfig.sampleRate} ${channelFlag} "${outputFilePath}" -y 2>&1`;

    console.log(`[Audio Optimization] Applying filters: ${filterChain}`);

    // Execute FFmpeg
    const { stderr } = await execAsync(command);

    // Check for errors
    if (stderr && (stderr.includes('Error') || stderr.includes('failed'))) {
      throw new Error(`FFmpeg optimization failed: ${stderr}`);
    }

    // Read optimized file
    const optimizedBuffer = await readFile(outputFilePath);

    console.log(`[Audio Optimization] Success! Reduced size: ${input.buffer.byteLength} -> ${optimizedBuffer.length} bytes`);

    return {
      buffer: optimizedBuffer.buffer.slice(
        optimizedBuffer.byteOffset,
        optimizedBuffer.byteOffset + optimizedBuffer.byteLength
      ),
      mimeType: 'audio/wav', // Output is always WAV for maximum compatibility
      fileName: input.fileName.replace(/\.[^.]+$/, '_optimized.wav'),
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      throw new Error(
        'FFmpeg is not installed. Audio optimization requires FFmpeg. ' +
        'Please install FFmpeg: https://ffmpeg.org/download.html'
      );
    }
    throw new Error(
      `Audio optimization failed: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    // Cleanup temp files
    try {
      await unlink(inputFilePath);
    } catch {
      // Ignore cleanup errors
    }
    try {
      await unlink(outputFilePath);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Quick check if FFmpeg is available on the system
 */
export async function isFFmpegAvailable(): Promise<boolean> {
  try {
    await execAsync('ffmpeg -version');
    return true;
  } catch {
    return false;
  }
}
