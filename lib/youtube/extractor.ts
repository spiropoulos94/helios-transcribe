import { exec } from 'child_process';
import { promisify } from 'util';
import { unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { isValidYouTubeUrl } from './validator';

const execAsync = promisify(exec);

// Use Homebrew's yt-dlp if available (newer version fixes YouTube 403 errors)
const YT_DLP_PATH = '/opt/homebrew/bin/yt-dlp';

export interface YouTubeExtractionResult {
  filePath: string; // Absolute path to temp MP3 file
  mimeType: 'audio/mpeg'; // Always MP3 for consistency
  videoId: string; // YouTube video ID
  title: string; // Video title
  duration: number; // Duration in seconds
  cleanup: () => Promise<void>; // Cleanup function
}

export interface YouTubeExtractionOptions {
  maxDurationSeconds?: number; // Optional duration limit
}

/**
 * Extracts audio from a YouTube video and saves it to a temporary file using yt-dlp
 */
export async function extractAudioFromYouTube(
  url: string,
  options: YouTubeExtractionOptions = {}
): Promise<YouTubeExtractionResult> {
  // Validate URL
  if (!isValidYouTubeUrl(url)) {
    throw new Error('Invalid YouTube URL format. Please check the URL and try again.');
  }

  // Extract video ID from URL
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL: Could not extract video ID');
  }

  // Generate unique temp file path
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const fileName = `youtube-${videoId}-${timestamp}-${randomId}`;
  const filePath = join(tmpdir(), `${fileName}.mp3`);

  // Get video info and download using yt-dlp
  try {
    // First, get video metadata
    const infoCommand = `${YT_DLP_PATH} --dump-json --force-ipv4 --no-check-certificate --no-warnings "${url}"`;
    const { stdout: infoJson } = await execAsync(infoCommand);
    const videoInfo = JSON.parse(infoJson);

    // Check if video is available
    if (videoInfo.is_private || !videoInfo.is_live === false && videoInfo.live_status === 'is_live') {
      throw new Error('This video is private or unavailable. Please use a public video.');
    }

    // Check duration limit if specified
    if (options.maxDurationSeconds && videoInfo.duration > options.maxDurationSeconds) {
      const videoDurationMin = Math.ceil(videoInfo.duration / 60);
      const maxDurationMin = Math.ceil(options.maxDurationSeconds / 60);
      throw new Error(
        `Video duration (${videoDurationMin} min) exceeds maximum allowed (${maxDurationMin} min). Please use a shorter video.`
      );
    }

    // Download audio using yt-dlp with reliable options that avoid 403 errors
    const downloadCommand = `${YT_DLP_PATH} -x --audio-format mp3 --audio-quality 0 --force-ipv4 --no-check-certificate --retries infinite --fragment-retries infinite --socket-timeout 30 -o "${filePath.replace('.mp3', '.%(ext)s')}" --no-warnings "${url}"`;
    await execAsync(downloadCommand, { maxBuffer: 50 * 1024 * 1024 }); // 50MB buffer

    // Create cleanup function
    const cleanup = async () => {
      try {
        await unlink(filePath);
      } catch (error) {
        console.error(`Failed to delete temp file ${filePath}:`, error);
      }
    };

    // Register cleanup on process exit (secondary safety net)
    const exitHandler = () => {
      try {
        require('fs').unlinkSync(filePath);
      } catch {
        // Ignore errors during process exit
      }
    };
    process.once('exit', exitHandler);
    process.once('SIGINT', exitHandler);
    process.once('SIGTERM', exitHandler);

    return {
      filePath,
      mimeType: 'audio/mpeg',
      videoId,
      title: videoInfo.title || 'Unknown Title',
      duration: videoInfo.duration || 0,
      cleanup,
    };
  } catch (error) {
    // Try to cleanup partial download
    try {
      await unlink(filePath);
    } catch {
      // Ignore cleanup errors
    }

    throw new Error(
      error instanceof Error
        ? `Failed to download video: ${error.message}`
        : 'Failed to download video. Please try again or use a different video.'
    );
  }
}

/**
 * Extracts video ID from YouTube URL
 */
function extractVideoId(url: string): string | null {
  // Match youtube.com/watch?v=VIDEO_ID
  const match1 = url.match(/[?&]v=([^&]+)/);
  if (match1) return match1[1];

  // Match youtu.be/VIDEO_ID
  const match2 = url.match(/youtu\.be\/([^?]+)/);
  if (match2) return match2[1];

  // Match youtube.com/embed/VIDEO_ID
  const match3 = url.match(/\/embed\/([^?]+)/);
  if (match3) return match3[1];

  return null;
}
