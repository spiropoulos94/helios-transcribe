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
 * Pipeline configuration
 */
export const pipelineConfig = {
  /** Pipeline mode: 'gemini-only' or 'hybrid' */
  mode: "gemini-only",

  /** Target language for transcription */
  targetLanguage: process.env.TARGET_LANGUAGE || 'Greek (Ελληνικά)',

  /** Gemini model to use */
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3-pro-preview',

  /** ElevenLabs model to use */
  elevenLabsModel: (process.env.ELEVENLABS_MODEL as 'scribe_v1' | 'scribe_v2') || 'scribe_v2',
} as const;

/**
 * AI Provider configuration
 */
export const aiConfig = {
  /** Google Gemini API key */
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,

  /** ElevenLabs API key */
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
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
