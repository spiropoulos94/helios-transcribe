import { TranscriptionPipeline } from './pipeline';
import { buildPipelineConfig } from './config';
import { PreProcessStage } from './stages/preprocess';
import { TranscriptionStage } from './stages/transcription';
import { PostProcessStage } from './stages/postprocess';
import type { TranscriptionRequest, PipelineInput, PipelineResult } from './types';

/**
 * Creates a configured pipeline instance based on request configuration
 *
 * @param request - User transcription request with provider and feature config
 * @returns Configured TranscriptionPipeline ready to execute
 */
export function createPipeline(request: TranscriptionRequest): TranscriptionPipeline {
  const config = buildPipelineConfig(request);

  const stages = {
    preProcess: new PreProcessStage(),
    transcription: new TranscriptionStage(),
    postProcess: new PostProcessStage(),
  };

  return new TranscriptionPipeline(config, stages);
}

// Re-export types for convenience
export type { TranscriptionRequest, PipelineInput, PipelineResult };
export { TranscriptionPipeline };
