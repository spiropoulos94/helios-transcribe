import type { TranscriptionInput, StructuredTranscription } from '../../ai/types';
import type { PipelineConfig, PostProcessOutput, ChunkResult } from '../types';
import { TranscriptionCorrector } from '../../ai/transcription-corrector';

/**
 * Input for post-processing stage
 */
export interface PostProcessInput {
  text: string;
  structuredData?: StructuredTranscription;
  rawJson?: string;
  chunkResults?: ChunkResult[];
  audio?: TranscriptionInput; // For audio verification (single file only)
}

/**
 * PostProcess Stage
 * Responsible for refining and finalizing transcription
 *
 * Tasks:
 * - Audio verification (per-chunk or final pass)
 * - Text-only correction (fallback if audio verification disabled)
 */
export class PostProcessStage {
  /**
   * Execute post-processing
   * @param input - Post-process input (text, chunks, audio)
   * @param config - Pipeline configuration
   * @returns Final corrected transcription
   */
  async execute(input: PostProcessInput, config: PipelineConfig): Promise<PostProcessOutput> {
    let finalText = input.text;
    let totalCorrectionCount = 0;
    let totalCorrectionTime = 0;

    // Determine if we should apply correction
    const shouldCorrect = config.enableTranscriptionCorrection || config.enableAudioVerification;

    if (!shouldCorrect) {
      console.log('[PostProcess] Correction disabled, returning original text');
      return {
        text: finalText,
        structuredData: input.structuredData,
        rawJson: input.rawJson,
      };
    }

    // Create corrector
    const corrector = new TranscriptionCorrector();

    // If chunked and audio verification is enabled, aggregate per-chunk correction stats
    if (input.chunkResults && config.enableAudioVerification) {
      console.log('[PostProcess] Audio verification was applied per-chunk during transcription');

      // Aggregate correction stats from all chunks
      const chunksWithCorrections = input.chunkResults.filter(c => c.correctionCount !== undefined);
      if (chunksWithCorrections.length > 0) {
        totalCorrectionCount = chunksWithCorrections.reduce((sum, c) => sum + (c.correctionCount || 0), 0);
        totalCorrectionTime = chunksWithCorrections.reduce((sum, c) => sum + (c.correctionTimeMs || 0), 0);
        console.log(`[PostProcess] Total corrections across ${chunksWithCorrections.length} chunks: ${totalCorrectionCount} corrections in ${totalCorrectionTime}ms`);
      }

      return {
        text: finalText,
        structuredData: input.structuredData,
        rawJson: input.rawJson,
        correctionCount: totalCorrectionCount,
        correctionTimeMs: totalCorrectionTime,
      };
    }

    // Apply final correction
    if (config.enableAudioVerification && input.audio) {
      // Audio-aware correction (single file)
      console.log('[PostProcess] Applying audio-aware correction');
      try {
        const result = await corrector.correctTranscription(finalText, {
          languageCode: 'el',
          preserveTimestamps: true,
          preserveSpeakers: true,
          audioInput: input.audio,
          enableAudioVerification: true,
        });
        finalText = result.correctedText;
        totalCorrectionCount = result.correctionCount || 0;
        totalCorrectionTime = result.processingTimeMs;
        console.log(`[PostProcess] Audio-aware correction: ${totalCorrectionCount} corrections in ${totalCorrectionTime}ms`);
      } catch (error) {
        console.warn('[PostProcess] Audio-aware correction failed:', error);
      }
    } else if (config.enableTranscriptionCorrection) {
      // Text-only correction
      console.log('[PostProcess] Applying text-only correction');
      try {
        finalText = await this.correctLargeText(finalText, corrector);
        console.log('[PostProcess] Text-only correction complete');
      } catch (error) {
        console.warn('[PostProcess] Text-only correction failed:', error);
      }
    }

    return {
      text: finalText,
      structuredData: input.structuredData,
      rawJson: input.rawJson,
      correctionCount: totalCorrectionCount,
      correctionTimeMs: totalCorrectionTime,
    };
  }

  /**
   * Correct large text by splitting into manageable chunks
   * Splits text into ~5000-word segments with 100-word overlap
   */
  private async correctLargeText(
    text: string,
    corrector: TranscriptionCorrector
  ): Promise<string> {
    const words = text.split(/\s+/).filter(Boolean);
    const totalWords = words.length;

    const MAX_WORDS_PER_CHUNK = 5000;
    if (totalWords <= MAX_WORDS_PER_CHUNK) {
      console.log(`[PostProcess] Text is ${totalWords} words, correcting in single pass`);
      const result = await corrector.correctTranscription(text, {
        languageCode: 'el',
        preserveTimestamps: true,
        preserveSpeakers: true,
      });
      console.log(`[PostProcess] Made ${result.correctionCount || 0} corrections in ${result.processingTimeMs}ms`);
      return result.correctedText;
    }

    // For large texts, split into chunks with overlap
    console.log(`[PostProcess] Text is ${totalWords} words, splitting into correction chunks`);
    const OVERLAP_WORDS = 100;
    const correctedChunks: string[] = [];
    let totalCorrections = 0;
    let totalTime = 0;

    let startIdx = 0;
    let chunkNum = 1;

    while (startIdx < totalWords) {
      const endIdx = Math.min(startIdx + MAX_WORDS_PER_CHUNK, totalWords);
      const chunkWords = words.slice(startIdx, endIdx);
      const chunkText = chunkWords.join(' ');

      // Get context from previous and next chunks
      const prevContext = startIdx > 0
        ? words.slice(Math.max(0, startIdx - 150), startIdx).join(' ')
        : undefined;
      const nextContext = endIdx < totalWords
        ? words.slice(endIdx, Math.min(endIdx + 150, totalWords)).join(' ')
        : undefined;

      console.log(`[PostProcess] Processing correction chunk ${chunkNum} (words ${startIdx + 1}-${endIdx} of ${totalWords})`);

      const result = await corrector.correctTranscription(chunkText, {
        languageCode: 'el',
        preserveTimestamps: true,
        preserveSpeakers: true,
        previousContext: prevContext,
        nextContext: nextContext,
      });

      totalCorrections += result.correctionCount || 0;
      totalTime += result.processingTimeMs;

      // For first chunk, keep everything
      if (chunkNum === 1) {
        correctedChunks.push(result.correctedText);
      } else {
        // For subsequent chunks, remove overlap
        const correctedWords = result.correctedText.split(/\s+/).filter(Boolean);
        const wordsToSkip = Math.min(OVERLAP_WORDS, correctedWords.length);
        const deduplicatedText = correctedWords.slice(wordsToSkip).join(' ');
        correctedChunks.push(deduplicatedText);
      }

      console.log(`[PostProcess] Chunk ${chunkNum} complete: ${result.correctionCount || 0} corrections in ${result.processingTimeMs}ms`);

      // Move to next chunk
      startIdx = endIdx - OVERLAP_WORDS;
      chunkNum++;

      if (endIdx >= totalWords) {
        break;
      }
    }

    console.log(`[PostProcess] All chunks complete: ${totalCorrections} total corrections in ${totalTime}ms across ${chunkNum - 1} chunks`);

    return correctedChunks.join(' ');
  }
}
