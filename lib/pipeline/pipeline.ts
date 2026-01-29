import type {
  PipelineInput,
  PipelineResult,
  PipelineConfig,
  PreProcessOutput,
  TranscriptionOutput,
  PostProcessOutput,
} from './types';
import type { PreProcessStage } from './stages/preprocess';
import type { TranscriptionStage } from './stages/transcription';
import type { PostProcessStage } from './stages/postprocess';

/**
 * Main pipeline orchestrator for transcription
 * Coordinates PreProcess → Transcription → PostProcess stages
 */
export class TranscriptionPipeline {
  constructor(
    private readonly config: PipelineConfig,
    private readonly stages: {
      preProcess: PreProcessStage;
      transcription: TranscriptionStage;
      postProcess: PostProcessStage;
    }
  ) {}

  /**
   * Execute the full transcription pipeline
   * @param input - Pipeline input (file or YouTube URL + request)
   * @returns Pipeline result with transcribed text and metadata
   */
  async execute(input: PipelineInput): Promise<PipelineResult> {
    const startTime = Date.now();
    let preProcessResult: PreProcessOutput | null = null;

    try {
      // Stage 1: PreProcess
      console.log('[Pipeline] Starting PreProcess stage...');
      preProcessResult = await this.stages.preProcess.execute(input, this.config);
      console.log(`[Pipeline] PreProcess complete: ${preProcessResult.isChunked ? `${preProcessResult.chunkSpecs?.length} chunks` : 'single file'}, duration: ${preProcessResult.durationSeconds.toFixed(1)}s`);

      // Update config with duration for downstream stages
      this.config.durationSeconds = preProcessResult.durationSeconds;

      // Stage 2: Transcription
      console.log('[Pipeline] Starting Transcription stage...');
      const transcriptionResult = await this.stages.transcription.execute(
        {
          audio: preProcessResult.audio,
          isChunked: preProcessResult.isChunked,
          chunkSpecs: preProcessResult.chunkSpecs,
          keyterms: preProcessResult.keyterms,
        },
        this.config
      );
      console.log(`[Pipeline] Transcription complete: ${transcriptionResult.text.length} characters`);

      // Stage 3: PostProcess
      console.log('[Pipeline] Starting PostProcess stage...');
      const postProcessResult = await this.stages.postProcess.execute(
        {
          text: transcriptionResult.text,
          structuredData: transcriptionResult.structuredData,
          rawJson: transcriptionResult.rawJson,
          chunkResults: transcriptionResult.chunkResults,
          audio: preProcessResult.isChunked ? undefined : preProcessResult.audio,
        },
        this.config
      );
      console.log(`[Pipeline] PostProcess complete: ${postProcessResult.correctionCount || 0} corrections`);

      // Build final result
      const processingTimeMs = Date.now() - startTime;
      const wordCount = postProcessResult.text.split(/\s+/).filter(Boolean).length;

      const result: PipelineResult = {
        text: postProcessResult.text,
        fileName: preProcessResult.fileName,
        metadata: {
          provider: transcriptionResult.provider,
          model: transcriptionResult.model,
          audioDurationSeconds: preProcessResult.durationSeconds,
          processingTimeMs,
          chunked: preProcessResult.isChunked,
          chunkCount: transcriptionResult.chunkCount,
          chunkDurationSeconds: transcriptionResult.chunkDurationSeconds,
          overlapSeconds: transcriptionResult.overlapSeconds,
          keyterms: transcriptionResult.keyterms,
          keytermCount: transcriptionResult.keyterms?.length,
          correctionCount: postProcessResult.correctionCount,
          wordCount,
          structuredData: postProcessResult.structuredData,
          rawJson: postProcessResult.rawJson,
        },
      };

      console.log(`[Pipeline] Complete! Total time: ${(processingTimeMs / 1000).toFixed(1)}s, Word count: ${wordCount}`);
      return result;
    } finally {
      // Always cleanup temporary files
      if (preProcessResult?.cleanup) {
        await preProcessResult.cleanup().catch((err) =>
          console.error('[Pipeline] Failed to cleanup temp files:', err)
        );
      }
    }
  }
}
