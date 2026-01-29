import { AITranscriptionProvider } from './types';
import { ElevenLabsProvider } from './providers/elevenlabs';
import { GoogleGeminiProvider } from './providers/google';
import { OpenAIProvider } from './providers/openai';
import { aiConfig } from '../config';

export type ProviderType = 'elevenlabs' | 'google-gemini' | 'openai';

const providerRegistry: Record<ProviderType, () => AITranscriptionProvider> = {
  elevenlabs: () => new ElevenLabsProvider(),
  'google-gemini': () => new GoogleGeminiProvider(),
  openai: () => new OpenAIProvider(),
};

/**
 * Get a transcription provider by name
 */
export function getProvider(type: ProviderType): AITranscriptionProvider {
  const factory = providerRegistry[type];
  if (!factory) {
    throw new Error(
      `Unknown provider type: ${type}. Available: ${Object.keys(providerRegistry).join(', ')}`
    );
  }
  return factory();
}

/**
 * Get the default configured provider
 * Priority: checks env var AI_PROVIDER, then falls back based on available API keys
 */
export function getDefaultProvider(): AITranscriptionProvider {
  const envProvider = aiConfig.provider;

  if (envProvider && providerRegistry[envProvider]) {
    const provider = getProvider(envProvider);
    if (provider.isConfigured()) {
      return provider;
    }
    console.warn(
      `Configured provider ${envProvider} is not properly configured, falling back...`
    );
  }

  // Fallback: try providers in order of preference
  const preferenceOrder: ProviderType[] = ['elevenlabs', 'google-gemini', 'openai'];

  for (const type of preferenceOrder) {
    const provider = getProvider(type);
    if (provider.isConfigured()) {
      return provider;
    }
  }

  throw new Error('No AI provider is configured. Please set ELEVENLABS_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY.');
}

/**
 * Get all available (configured) providers
 */
export function getAvailableProviders(): AITranscriptionProvider[] {
  return Object.keys(providerRegistry)
    .map((type) => getProvider(type as ProviderType))
    .filter((provider) => provider.isConfigured());
}
