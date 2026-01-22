/**
 * Centralized application configuration
 * All environment variables and feature flags should be accessed through this file
 */

/**
 * Feature flags
 */
export const featureFlags = {
  /** Whether YouTube transcription is disabled (true by default) */
  disableYouTube: process.env.NEXT_PUBLIC_DISABLE_YOUTUBE !== 'false',
} as const;

/**
 * AI Provider configuration
 */
export const aiConfig = {
  /** The AI provider to use for transcription */
  provider: process.env.AI_PROVIDER as 'google-gemini' | 'openai' | undefined,

  /** Google Gemini API key */
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,

  /** OpenAI API key */
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
} as const;

/**
 * Audio processing configuration
 */
export const audioConfig = {
  /** Minimum duration (in minutes) to trigger chunking */
  chunkingThresholdMinutes: parseInt(
    process.env.CHUNKING_THRESHOLD_MINUTES || '30',
    10
  ),

  /** Duration of each chunk in minutes */
  chunkDurationMinutes: parseInt(
    process.env.CHUNKING_DURATION_MINUTES || '30',
    10
  ),

  /** Overlap duration in seconds between chunks */
  overlapSeconds: parseInt(process.env.CHUNKING_OVERLAP_SECONDS || '10', 10),

  /** Path to ffmpeg binary (auto-detected if not specified) */
  ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',

  /** Path to ffprobe binary (auto-detected if not specified) */
  ffprobePath: process.env.FFPROBE_PATH || 'ffprobe',
} as const;
