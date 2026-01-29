import type { TranscriptionRequest, PipelineConfig } from './types';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  targetLanguage: 'Greek (Ελληνικά)',
  enableSpeakerIdentification: true,
  enableTimestamps: true,
  enableKeytermExtraction: true,
  enableTranscriptionCorrection: true,
  enableAudioVerification: false, // Disabled by default (doubles cost)
  enableChunking: undefined, // Auto-determine based on duration
};

/**
 * Builds internal pipeline configuration from user request
 * Applies defaults where user hasn't specified values
 *
 * @param request - User transcription request
 * @returns Internal pipeline configuration with defaults applied
 */
export function buildPipelineConfig(request: TranscriptionRequest): PipelineConfig {
  return {
    provider: request.provider,
    targetLanguage: request.targetLanguage ?? DEFAULT_CONFIG.targetLanguage,
    enableSpeakerIdentification: request.enableSpeakerIdentification ?? DEFAULT_CONFIG.enableSpeakerIdentification,
    enableTimestamps: request.enableTimestamps ?? DEFAULT_CONFIG.enableTimestamps,
    enableKeytermExtraction: request.features?.enableKeytermExtraction ?? DEFAULT_CONFIG.enableKeytermExtraction,
    enableTranscriptionCorrection: request.features?.enableTranscriptionCorrection ?? DEFAULT_CONFIG.enableTranscriptionCorrection,
    enableAudioVerification: request.features?.enableAudioVerification ?? DEFAULT_CONFIG.enableAudioVerification,
    enableChunking: request.features?.enableChunking ?? DEFAULT_CONFIG.enableChunking,
    customInstructions: request.customInstructions,
  };
}
