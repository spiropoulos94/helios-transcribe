import { readFile } from 'fs/promises';
import type {
  TranscriptionInput,
  TranscriptionConfig,
  TranscriptionResult,
  AITranscriptionProvider,
} from '../ai/types';
import type { ChunkSpec, AudioChunk } from './ffmpeg';
import { getAudioDuration, splitAudioIntoChunks, cleanupChunks } from './ffmpeg';
import { adjustTimestamps, adjustStructuredTimestamps, deduplicateAndStitch, type ChunkResult } from './deduplication';
import { audioConfig } from '../config';
import { formatDuration } from '../utils/format';
import { KeytermExtractor } from '../ai/keyterm-extractor';
import { TranscriptionCorrector } from '../ai/transcription-corrector';
import { ElevenLabsProvider } from '../ai/providers/elevenlabs';
import { GoogleGeminiProvider } from '../ai/providers/google';

/**
 * Determines if audio chunking should be used based on configuration and duration
 * @param durationSeconds - Audio duration in seconds
 * @returns True if chunking should be used
 */
export function shouldUseChunking(durationSeconds: number): boolean {
  if (!audioConfig.enableChunking) {
    return false;
  }
  // Use chunking for files longer than 10 minutes
  const thresholdSeconds = 10 * 60;
  return durationSeconds >= thresholdSeconds;
}

/**
 * Calculates optimal chunk duration based on total file duration
 * Returns a value between 5-30 minutes that divides the file reasonably
 * @param durationSeconds - Total audio duration in seconds
 * @returns Optimal chunk duration in minutes
 */
export function calculateOptimalChunkDuration(durationSeconds: number): number {
  const durationMinutes = durationSeconds / 60;

  // For files under 15 minutes, use 5-minute chunks
  if (durationMinutes < 15) {
    return 5;
  }

  // For files 15-60 minutes, use 10-minute chunks
  if (durationMinutes < 60) {
    return 10;
  }

  // For files 60-120 minutes, use 15-minute chunks
  if (durationMinutes < 120) {
    return 15;
  }

  // For files 120-180 minutes, use 20-minute chunks
  if (durationMinutes < 180) {
    return 20;
  }

  // For very long files (3+ hours), use 30-minute chunks
  return 30;
}

/**
 * Calculates chunk boundaries with overlap for a given duration
 * @param durationSeconds - Total audio duration in seconds
 * @returns Array of chunk specifications
 */
export function calculateChunks(durationSeconds: number): ChunkSpec[] {
  const chunkDurationMinutes = calculateOptimalChunkDuration(durationSeconds);
  const chunkDurationSeconds = chunkDurationMinutes * 60;
  const overlapSeconds = 20; // Increased from 10 to 20 seconds for better context and deduplication

  const chunks: ChunkSpec[] = [];
  let currentStart = 0;
  let chunkIndex = 0;

  while (currentStart < durationSeconds) {
    const isFirstChunk = chunkIndex === 0;
    const hasOverlapBefore = !isFirstChunk;

    // Calculate chunk start (with overlap before if not first chunk)
    const chunkStart = isFirstChunk ? 0 : currentStart - overlapSeconds;

    // Calculate chunk end (with overlap after if not last chunk)
    const baseEnd = currentStart + chunkDurationSeconds;
    const chunkEnd = Math.min(baseEnd + overlapSeconds, durationSeconds);

    const hasOverlapAfter = chunkEnd < durationSeconds;

    chunks.push({
      index: chunkIndex,
      total: 0, // Will be set after we know total count
      startTime: chunkStart,
      endTime: chunkEnd,
      duration: chunkEnd - chunkStart,
      hasOverlapBefore,
      hasOverlapAfter,
    });

    // Move to next chunk (non-overlapping boundary)
    currentStart += chunkDurationSeconds;
    chunkIndex++;
  }

  // Set total count on all chunks
  const totalChunks = chunks.length;
  chunks.forEach(chunk => {
    chunk.total = totalChunks;
  });

  return chunks;
}

/**
 * Corrects large text by splitting it into manageable chunks for the LLM
 * Splits text into ~5000-word segments with 100-word overlap for context continuity
 * @param text - The text to correct
 * @param corrector - TranscriptionCorrector instance
 * @returns Corrected text
 */
async function correctLargeText(
  text: string,
  corrector: TranscriptionCorrector
): Promise<string> {
  const words = text.split(/\s+/).filter(Boolean);
  const totalWords = words.length;

  // If text is small enough, correct it all at once
  // ~5000 words ≈ 6500 tokens input + 6500 tokens output = 13000 tokens (well under 32768 limit)
  const MAX_WORDS_PER_CHUNK = 5000;
  if (totalWords <= MAX_WORDS_PER_CHUNK) {
    console.log(`[Correction] Text is ${totalWords} words, correcting in single pass...`);
    const result = await corrector.correctTranscription(text, {
      languageCode: 'el',
      preserveTimestamps: true,
      preserveSpeakers: true,
    });
    console.log(`[Correction] Made ${result.correctionCount || 0} corrections in ${result.processingTimeMs}ms`);
    return result.correctedText;
  }

  // For large texts, split into chunks with overlap
  console.log(`[Correction] Text is ${totalWords} words, splitting into correction chunks...`);
  const OVERLAP_WORDS = 100; // Overlap for context continuity
  const correctedChunks: string[] = [];
  let totalCorrections = 0;
  let totalCorrectionTime = 0;

  let startIdx = 0;
  let chunkNum = 1;

  while (startIdx < totalWords) {
    const endIdx = Math.min(startIdx + MAX_WORDS_PER_CHUNK, totalWords);
    const chunkWords = words.slice(startIdx, endIdx);
    const chunkText = chunkWords.join(' ');

    // Get context from previous chunk (last 150 words) and next chunk (first 150 words) if available
    // Increased from 50 to 150 for better context continuity and proper noun recognition
    const prevContext = startIdx > 0
      ? words.slice(Math.max(0, startIdx - 150), startIdx).join(' ')
      : undefined;
    const nextContext = endIdx < totalWords
      ? words.slice(endIdx, Math.min(endIdx + 150, totalWords)).join(' ')
      : undefined;

    console.log(`[Correction] Processing chunk ${chunkNum} (words ${startIdx + 1}-${endIdx} of ${totalWords})...`);

    const result = await corrector.correctTranscription(chunkText, {
      languageCode: 'el',
      preserveTimestamps: true,
      preserveSpeakers: true,
      previousContext: prevContext,
      nextContext: nextContext,
    });

    totalCorrections += result.correctionCount || 0;
    totalCorrectionTime += result.processingTimeMs;

    // For first chunk, keep everything
    if (chunkNum === 1) {
      correctedChunks.push(result.correctedText);
    } else {
      // For subsequent chunks, remove the overlap region (first ~100 words)
      // to avoid duplicating corrected text
      const correctedWords = result.correctedText.split(/\s+/).filter(Boolean);
      const wordsToSkip = Math.min(OVERLAP_WORDS, correctedWords.length);
      const deduplicatedText = correctedWords.slice(wordsToSkip).join(' ');
      correctedChunks.push(deduplicatedText);
    }

    console.log(`[Correction] Chunk ${chunkNum} complete: ${result.correctionCount || 0} corrections in ${result.processingTimeMs}ms`);

    // Move to next chunk (with overlap)
    startIdx = endIdx - OVERLAP_WORDS;
    chunkNum++;

    // Safety: if we're not making progress, break
    if (endIdx >= totalWords) {
      break;
    }
  }

  console.log(`[Correction] All chunks complete: ${totalCorrections} total corrections in ${totalCorrectionTime}ms across ${chunkNum - 1} chunks`);

  // Join all corrected chunks
  return correctedChunks.join(' ');
}

/**
 * Processes an audio file using chunking strategy
 * @param input - TranscriptionInput containing buffer and file info
 * @param config - Transcription configuration
 * @param provider - AI transcription provider to use
 * @returns Complete transcription result with stitched chunks
 */
export async function processWithChunking(
  input: TranscriptionInput,
  config: TranscriptionConfig,
  provider: AITranscriptionProvider,
  keytermExtractor?: KeytermExtractor,
  transcriptionCorrector?: TranscriptionCorrector
): Promise<TranscriptionResult> {
  const startTime = Date.now();
  let audioChunks: AudioChunk[] = [];

  try {
    // 1. Detect duration
    console.log(`[Audio Chunking] Starting chunked transcription for ${input.fileName}`);
    const duration = await getAudioDuration(input);
    console.log(`[Audio Chunking] Duration: ${formatDuration(duration)}`);

    // 2. Calculate chunk boundaries
    const chunkDurationMinutes = calculateOptimalChunkDuration(duration);
    const chunkSpecs = calculateChunks(duration);
    console.log(
      `[Audio Chunking] Creating ${chunkSpecs.length} chunks ` +
      `(${chunkDurationMinutes} min each, 20s overlap)`
    );

    // 3. Split audio into chunk files
    audioChunks = await splitAudioIntoChunks(input, chunkSpecs);

    // 4. Process chunks (parallel or sequential based on config)
    const chunkResults = await processChunksWithConcurrency(
      audioChunks,
      provider,
      config,
      audioConfig.maxConcurrentChunks,
      keytermExtractor,
      transcriptionCorrector
    );

    // 5. Adjust timestamps in each chunk (both text and structured data)
    console.log(`[Audio Chunking] Adjusting timestamps`);
    const adjustedChunks = chunkResults.map((chunk, index) => {
      // Use Math.round instead of Math.floor to properly round to nearest second
      const offsetSeconds = Math.round(chunk.startTime);
      console.log(`[Audio Chunking] Chunk ${index + 1}: Adjusting timestamps by +${offsetSeconds}s (chunk starts at ${formatDuration(chunk.startTime)})`);

      if (chunk.structuredData && chunk.structuredData.segments.length > 0) {
        const firstSegment = chunk.structuredData.segments[0];
        const lastSegment = chunk.structuredData.segments[chunk.structuredData.segments.length - 1];
        console.log(`[Audio Chunking] Chunk ${index + 1} before adjustment: first timestamp ${firstSegment.timestamp}, last timestamp ${lastSegment.timestamp}`);
      }

      const adjusted = {
        ...chunk,
        text: adjustTimestamps(chunk.text, offsetSeconds),
        structuredData: chunk.structuredData
          ? adjustStructuredTimestamps(chunk.structuredData, offsetSeconds)
          : undefined,
      };

      if (adjusted.structuredData && adjusted.structuredData.segments.length > 0) {
        const firstSegment = adjusted.structuredData.segments[0];
        const lastSegment = adjusted.structuredData.segments[adjusted.structuredData.segments.length - 1];
        console.log(`[Audio Chunking] Chunk ${index + 1} after adjustment: first timestamp ${firstSegment.timestamp}, last timestamp ${lastSegment.timestamp}`);
      }

      return adjusted;
    });

    // 6. Deduplicate and stitch results
    console.log(`[Audio Chunking] Deduplicating and stitching ${adjustedChunks.length} chunks`);
    let finalText = deduplicateAndStitch(adjustedChunks);

    // 7. Apply post-processing correction to the final stitched text (if enabled)
    // Note: Skip final correction if per-chunk audio verification was already applied
    if (transcriptionCorrector && config.enableTranscriptionCorrection && !config.enableAudioVerification) {
      try {
        console.log('[Audio Chunking] Applying text-only correction to final stitched text...');
        finalText = await correctLargeText(finalText, transcriptionCorrector);
      } catch (error) {
        console.warn(`[Audio Chunking] Failed to correct final text, using uncorrected version:`, error);
      }
    } else if (config.enableAudioVerification) {
      console.log('[Audio Chunking] Skipping final correction (per-chunk audio verification was already applied)');
    }

    // 8. Calculate aggregate metadata
    const processingTimeMs = Date.now() - startTime;
    const wordCount = finalText.split(/\s+/).filter(Boolean).length;

    // Check if any chunk was truncated
    const anyTruncated = chunkResults.some(r => r.wasTruncated);

    // Merge structured data from all chunks if available (now with adjusted timestamps)
    const hasStructuredData = adjustedChunks.some(r => r.structuredData);
    let mergedStructuredData: import('../ai/types').StructuredTranscription | undefined;
    let mergedRawJson: string | undefined;

    if (hasStructuredData) {
      // Combine all segments from all chunks (timestamps already adjusted)
      const allSegments = adjustedChunks
        .filter(r => r.structuredData?.segments)
        .flatMap(r => r.structuredData!.segments);

      // Use the first chunk's summary or create a combined one
      const firstSummary = adjustedChunks.find(r => r.structuredData?.summary)?.structuredData?.summary;

      if (allSegments.length > 0) {
        mergedStructuredData = {
          summary: firstSummary || 'Multi-chunk transcription',
          segments: allSegments,
        };
        mergedRawJson = JSON.stringify(mergedStructuredData, null, 2);
        console.log(`[Audio Chunking] Merged ${allSegments.length} segments from ${adjustedChunks.length} chunks`);
      }
    }

    // Aggregate all unique keyterms from all chunks
    const allKeyterms = new Set<string>();
    chunkResults.forEach(chunk => {
      if (chunk.keyterms) {
        chunk.keyterms.forEach(keyterm => allKeyterms.add(keyterm));
      }
    });
    const aggregatedKeyterms = Array.from(allKeyterms);

    console.log(
      `[Audio Chunking] Complete! Total processing time: ${(processingTimeMs / 1000).toFixed(1)}s, ` +
      `Final word count: ${wordCount}` +
      (aggregatedKeyterms.length > 0 ? `, Total unique keyterms: ${aggregatedKeyterms.length}` : '')
    );

    return {
      text: finalText,
      provider: provider.name,
      structuredData: mergedStructuredData,
      rawJson: mergedRawJson,
      metadata: {
        wordCount,
        model: chunkResults[0]?.model,
        processingTimeMs,
        chunked: true,
        chunkCount: audioChunks.length,
        chunkDurationSeconds: chunkDurationMinutes * 60,
        overlapSeconds: 20,
        wasTruncated: anyTruncated,
        finishReason: anyTruncated ? 'MAX_TOKENS' : 'STOP',
        keyterms: aggregatedKeyterms.length > 0 ? aggregatedKeyterms : undefined,
        keytermCount: aggregatedKeyterms.length > 0 ? aggregatedKeyterms.length : undefined,
      },
    };
  } finally {
    // CRITICAL: Always cleanup chunk files
    if (audioChunks.length > 0) {
      await cleanupChunks(audioChunks);
    }
  }
}

/**
 * Processes multiple chunks with controlled concurrency
 * @param chunks - Array of audio chunks to process
 * @param provider - AI transcription provider
 * @param config - Transcription configuration
 * @param maxConcurrent - Maximum number of chunks to process in parallel (0 = sequential, -1 = unlimited)
 * @param keytermExtractor - Optional keyterm extractor
 * @param transcriptionCorrector - Optional transcription corrector for audio verification
 * @returns Array of chunk results in original order
 */
async function processChunksWithConcurrency(
  chunks: AudioChunk[],
  provider: AITranscriptionProvider,
  config: TranscriptionConfig,
  maxConcurrent: number,
  keytermExtractor?: KeytermExtractor,
  transcriptionCorrector?: TranscriptionCorrector
): Promise<ChunkResult[]> {
  // If maxConcurrent is 0 or 1, process sequentially
  if (maxConcurrent === 0 || maxConcurrent === 1) {
    console.log(`[Audio Chunking] Processing chunks sequentially`);
    const results: ChunkResult[] = [];
    for (const chunk of chunks) {
      console.log(
        `[Audio Chunking] Processing chunk ${chunk.index + 1}/${chunk.total}: ` +
        `${formatDuration(chunk.startTime)} - ${formatDuration(chunk.endTime)}`
      );
      const result = await processChunk(chunk, provider, config, keytermExtractor, transcriptionCorrector);
      results.push(result);
    }
    return results;
  }

  // Unlimited concurrency - process all at once (MAXIMUM SPEED)
  if (maxConcurrent < 0) {
    console.log(`[Audio Chunking] Processing ALL ${chunks.length} chunks in parallel (unlimited concurrency)`);
    return Promise.all(
      chunks.map(async (chunk) => {
        console.log(
          `[Audio Chunking] Starting chunk ${chunk.index + 1}/${chunk.total}: ` +
          `${formatDuration(chunk.startTime)} - ${formatDuration(chunk.endTime)}`
        );
        const result = await processChunk(chunk, provider, config, keytermExtractor, transcriptionCorrector);
        console.log(
          `[Audio Chunking] ✓ Completed chunk ${chunk.index + 1}/${chunk.total}`
        );
        return result;
      })
    );
  }

  // Optimized parallel processing with concurrency limit
  console.log(`[Audio Chunking] Processing chunks with max concurrency: ${maxConcurrent}`);

  const results: ChunkResult[] = new Array(chunks.length);
  let activeCount = 0;
  let chunkIndex = 0;

  return new Promise((resolve, reject) => {
    const startNext = () => {
      // Start as many chunks as we can without exceeding the limit
      while (activeCount < maxConcurrent && chunkIndex < chunks.length) {
        const currentIndex = chunkIndex++;
        const chunk = chunks[currentIndex];
        activeCount++;

        console.log(
          `[Audio Chunking] Starting chunk ${chunk.index + 1}/${chunk.total} [${activeCount}/${maxConcurrent} active]: ` +
          `${formatDuration(chunk.startTime)} - ${formatDuration(chunk.endTime)}`
        );

        processChunk(chunk, provider, config, keytermExtractor, transcriptionCorrector)
          .then(result => {
            results[currentIndex] = result;
            console.log(
              `[Audio Chunking] ✓ Completed chunk ${chunk.index + 1}/${chunk.total} [${activeCount - 1}/${maxConcurrent} remaining active]`
            );
          })
          .catch(error => {
            reject(error);
          })
          .finally(() => {
            activeCount--;
            // Check if we're done
            if (chunkIndex >= chunks.length && activeCount === 0) {
              resolve(results);
            } else {
              // Start the next chunk
              startNext();
            }
          });
      }
    };

    startNext();
  });
}

/**
 * Processes a single audio chunk through the AI provider
 * @param chunk - AudioChunk with file path and metadata
 * @param provider - AI transcription provider
 * @param config - Transcription configuration
 * @param keytermExtractor - Optional keyterm extractor for improving accuracy
 * @param transcriptionCorrector - Optional transcription corrector for per-chunk audio verification
 * @returns ChunkResult with transcribed text and metadata
 */
async function processChunk(
  chunk: AudioChunk,
  provider: AITranscriptionProvider,
  config: TranscriptionConfig,
  keytermExtractor?: KeytermExtractor,
  transcriptionCorrector?: TranscriptionCorrector
): Promise<ChunkResult> {
  try {
    // Read chunk file into buffer
    const buffer = await readFile(chunk.filePath);

    // Create TranscriptionInput for this chunk
    const chunkInput: TranscriptionInput = {
      buffer: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
      mimeType: 'audio/mpeg', // Chunks are created as same format as original
      fileName: `chunk_${chunk.index}_${chunk.total}`,
    };

    // Extract keyterms for this chunk if provider supports it and feature is enabled
    let chunkProvider = provider;
    let extractedKeyterms: string[] | undefined;
    if (keytermExtractor && config.enableKeytermExtraction) {
      try {
        console.log(`[Keyterm] Extracting keyterms for chunk ${chunk.index + 1}/${chunk.total}...`);
        const chunkKeyterms = await keytermExtractor.extractKeyterms(chunkInput, {
          maxKeyterms: 50,  // Reduced to avoid truncation
          minLength: 2,
          languageCode: 'el',
        });
        extractedKeyterms = chunkKeyterms;

        // Create NEW provider instance with chunk-specific keyterms
        if (provider.name === 'elevenlabs') {
          chunkProvider = new ElevenLabsProvider({
            model: (provider as any).model || 'scribe_v2',
            keyterms: chunkKeyterms,
          });
          console.log(`[Keyterm] Using ${chunkKeyterms.length} keyterms for ElevenLabs chunk ${chunk.index + 1}`);
        } else if (provider.name === 'google-gemini') {
          chunkProvider = new GoogleGeminiProvider({
            apiKey: (provider as any).config?.apiKey,
            model: (provider as any).config?.model,
            enableStructuredOutput: (provider as any).config?.enableStructuredOutput,
            keyterms: chunkKeyterms,
          });
          console.log(`[Keyterm] Using ${chunkKeyterms.length} keyterms for Gemini chunk ${chunk.index + 1}`);
        }
      } catch (error) {
        console.warn(`[Keyterm] Failed to extract keyterms for chunk ${chunk.index + 1}, using default provider:`, error);
      }
    }

    // Transcribe the chunk
    const result = await chunkProvider.transcribe(chunkInput, config);

    // Apply per-chunk audio verification if enabled and corrector is available
    let finalText = result.text;
    if (transcriptionCorrector && config.enableAudioVerification) {
      try {
        console.log(`[Audio Verification] Verifying chunk ${chunk.index + 1}/${chunk.total} with audio...`);
        const correctionResult = await transcriptionCorrector.correctTranscription(finalText, {
          languageCode: 'el',
          preserveTimestamps: true,
          preserveSpeakers: true,
          audioInput: chunkInput,
          enableAudioVerification: true,
        });
        finalText = correctionResult.correctedText;
        console.log(`[Audio Verification] Chunk ${chunk.index + 1}: Made ${correctionResult.correctionCount || 0} corrections`);
      } catch (error) {
        console.warn(`[Audio Verification] Failed for chunk ${chunk.index + 1}, using original transcription:`, error);
      }
    }

    return {
      text: finalText,
      startTime: chunk.startTime,
      endTime: chunk.endTime,
      hasOverlapBefore: chunk.hasOverlapBefore,
      hasOverlapAfter: chunk.hasOverlapAfter,
      model: result.metadata?.model,
      wasTruncated: result.metadata?.wasTruncated,
      structuredData: result.structuredData,
      rawJson: result.rawJson,
      keyterms: extractedKeyterms,
    };
  } catch (error) {
    throw new Error(
      `Failed to transcribe chunk ${chunk.index + 1}/${chunk.total} ` +
      `(${formatDuration(chunk.startTime)}-${formatDuration(chunk.endTime)}): ` +
      `${error instanceof Error ? error.message : String(error)}`
    );
  }
}

