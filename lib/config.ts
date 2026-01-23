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
  /** Enable chunking for long audio files */
  enableChunking: process.env.ENABLE_CHUNKING !== 'false',

  /** Path to ffmpeg binary (auto-detected if not specified) */
  ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',

  /** Path to ffprobe binary (auto-detected if not specified) */
  ffprobePath: process.env.FFPROBE_PATH || 'ffprobe',

  /**
   * Maximum number of chunks to process in parallel
   * 0 or 1 = sequential (slowest, safest)
   * 2-10 = limited parallel (balanced)
   * -1 = unlimited parallel (FASTEST, but may hit rate limits)
   * Default: 3
   */
  maxConcurrentChunks: parseInt(
    process.env.MAX_CONCURRENT_CHUNKS || '3',
    5
  ),
} as const;
