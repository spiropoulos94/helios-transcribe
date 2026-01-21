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
