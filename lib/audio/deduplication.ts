import type { StructuredTranscription } from '../ai/types';

export interface ChunkResult {
  text: string;
  startTime: number;
  endTime: number;
  hasOverlapBefore: boolean;
  hasOverlapAfter: boolean;
  model?: string;
  wasTruncated?: boolean;
  structuredData?: StructuredTranscription;
  rawJson?: string;
  keyterms?: string[];
}

/**
 * Parses a timestamp string into total seconds
 * Supports formats: [MM:SS], [HH:MM:SS], MM:SS, HH:MM:SS
 * @param timestamp - Timestamp string to parse
 * @returns Total seconds, or null if invalid
 */
function parseTimestamp(timestamp: string): number | null {
  // Remove brackets if present
  const clean = timestamp.replace(/^\[|\]$/g, '').trim();

  if (!clean) {
    return null;
  }

  const parts = clean.split(':');

  // Validate we have 2 or 3 parts
  if (parts.length < 2 || parts.length > 3) {
    return null;
  }

  // Parse and validate each part is a valid number
  const numbers = parts.map(p => {
    const num = parseInt(p, 10);
    return isNaN(num) ? null : num;
  });

  if (numbers.some(n => n === null)) {
    return null;
  }

  let totalSeconds: number;

  if (parts.length === 3) {
    // HH:MM:SS format
    const [hours, minutes, seconds] = numbers as number[];

    // Validate ranges
    if (minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59 || hours < 0) {
      return null;
    }

    totalSeconds = hours * 3600 + minutes * 60 + seconds;
  } else {
    // MM:SS format
    const [minutes, seconds] = numbers as number[];

    // Validate ranges (minutes can be > 59 in MM:SS format for videos under 1 hour)
    if (minutes < 0 || seconds < 0 || seconds > 59) {
      return null;
    }

    totalSeconds = minutes * 60 + seconds;
  }

  return totalSeconds;
}

/**
 * Formats seconds into a timestamp string
 * Returns [HH:MM:SS] if hours > 0, otherwise [MM:SS]
 * @param totalSeconds - Total seconds to format
 * @param forceHourFormat - Force HH:MM:SS format even if hours is 0
 * @returns Formatted timestamp string with brackets
 */
function formatTimestamp(totalSeconds: number, forceHourFormat = false): string {
  // Handle negative times (shouldn't happen, but safety)
  if (totalSeconds < 0) {
    totalSeconds = 0;
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0 || forceHourFormat) {
    return `[${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}]`;
  }
  return `[${minutes}:${seconds.toString().padStart(2, '0')}]`;
}

/**
 * Adjusts timestamps in transcribed text by adding an offset
 * Handles both [MM:SS] and [HH:MM:SS] formats
 * @param text - Transcribed text containing timestamps
 * @param offsetSeconds - Number of seconds to add to each timestamp (can be decimal)
 * @returns Text with adjusted timestamps
 */
export function adjustTimestamps(text: string, offsetSeconds: number): string {
  if (offsetSeconds === 0 || !text) {
    return text;
  }

  // Round offset to nearest second for consistency
  const roundedOffset = Math.round(offsetSeconds);

  // Match timestamps in format [MM:SS] or [HH:MM:SS]
  // More robust regex that handles various edge cases
  const timestampRegex = /\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]/g;

  let replacementCount = 0;
  const result = text.replace(timestampRegex, (match) => {
    const parsed = parseTimestamp(match);

    if (parsed === null) {
      console.warn(`[Timestamp] Failed to parse timestamp: ${match}, keeping original`);
      return match;
    }

    const adjusted = parsed + roundedOffset;
    replacementCount++;

    // Determine if we should use hour format based on the result
    return formatTimestamp(adjusted);
  });

  console.log(`[Timestamp] Adjusted ${replacementCount} timestamps by +${roundedOffset}s`);
  return result;
}

/**
 * Adjusts timestamps in structured data segments by adding an offset
 * @param structuredData - Structured transcription data
 * @param offsetSeconds - Number of seconds to add to each timestamp (can be decimal)
 * @returns Structured data with adjusted timestamps
 */
export function adjustStructuredTimestamps(
  structuredData: StructuredTranscription,
  offsetSeconds: number
): StructuredTranscription {
  if (offsetSeconds === 0 || !structuredData.segments) {
    return structuredData;
  }

  // Round offset to nearest second for consistency
  const roundedOffset = Math.round(offsetSeconds);

  return {
    ...structuredData,
    segments: structuredData.segments.map(segment => ({
      ...segment,
      timestamp: adjustSingleTimestamp(segment.timestamp, roundedOffset),
    })),
  };
}

/**
 * Adjusts a single timestamp string by adding an offset
 * @param timestamp - Timestamp string in MM:SS or HH:MM:SS format (without brackets)
 * @param offsetSeconds - Number of seconds to add (integer)
 * @returns Adjusted timestamp string (without brackets)
 */
function adjustSingleTimestamp(timestamp: string, offsetSeconds: number): string {
  const parsed = parseTimestamp(timestamp);

  if (parsed === null) {
    console.warn(`[Timestamp] Failed to parse structured timestamp: ${timestamp}, keeping original`);
    return timestamp;
  }

  const adjusted = parsed + offsetSeconds;

  // Return without brackets (structured data doesn't use brackets)
  const formatted = formatTimestamp(adjusted);
  return formatted.replace(/^\[|\]$/g, '');
}

/**
 * Deduplicates overlapping content and stitches chunks together
 * Uses word-level fuzzy matching to find the best split point
 * @param chunks - Array of chunk results with overlap information
 * @returns Deduplicated and stitched text
 */
export function deduplicateAndStitch(chunks: ChunkResult[]): string {
  if (chunks.length === 0) {
    return '';
  }

  if (chunks.length === 1) {
    return chunks[0].text;
  }

  let stitched = chunks[0].text;
  let totalOverlapWordsRemoved = 0;

  for (let i = 1; i < chunks.length; i++) {
    const prevChunk = chunks[i - 1];
    const currChunk = chunks[i];

    // If there's no overlap, just concatenate
    if (!prevChunk.hasOverlapAfter || !currChunk.hasOverlapBefore) {
      stitched += '\n\n' + currChunk.text;
      continue;
    }

    // Extract overlap regions for matching
    // Last ~200 words of previous chunk
    const prevOverlap = extractLastNWords(prevChunk.text, 200);
    // First ~200 words of current chunk
    const currOverlap = extractFirstNWords(currChunk.text, 200);

    // Find best match point
    const splitPoint = findBestMatchPoint(prevOverlap, currOverlap, currChunk.text);

    // Count removed words for logging
    const removedText = currChunk.text.substring(0, splitPoint);
    const removedWords = removedText.split(/\s+/).filter(Boolean).length;
    totalOverlapWordsRemoved += removedWords;

    // Stitch: previous text + current text (after split point)
    const remainingText = currChunk.text.substring(splitPoint).trimStart();
    stitched += '\n\n' + remainingText;

    console.log(
      `[Deduplication] Chunk ${i}: removed ${removedWords} overlapping words, ` +
      `kept ${remainingText.split(/\s+/).filter(Boolean).length} words`
    );
  }

  console.log(`[Deduplication] Total overlap words removed: ${totalOverlapWordsRemoved}`);

  return stitched;
}

/**
 * Finds the best match point between overlapping text regions
 * Uses word-level sliding window to find longest matching sequence
 * @param text1 - End of previous chunk
 * @param text2 - Start of current chunk
 * @param fullText2 - Full text of current chunk (for finding position)
 * @returns Character position in fullText2 where to split
 */
function findBestMatchPoint(text1: string, text2: string, fullText2: string): number {
  // Extract search windows
  const window1 = extractLastNWords(text1, 50);
  const window2Words = extractFirstNWords(text2, 100).split(/\s+/).filter(Boolean);

  if (window2Words.length === 0) {
    return 0;
  }

  const words1 = window1.split(/\s+/).filter(Boolean);

  if (words1.length === 0) {
    // No overlap to deduplicate, use beginning of text2
    return 0;
  }

  let bestMatch = { length: 0, endPosition: 0 };

  // Slide through text2 looking for matching sequences from text1
  // Start with longer sequences (more reliable matches)
  for (let i = 0; i < window2Words.length - 3; i++) {
    for (let len = Math.min(15, window2Words.length - i); len >= 4; len--) {
      const candidate = window2Words.slice(i, i + len).join(' ');

      if (window1.includes(candidate)) {
        if (len > bestMatch.length) {
          bestMatch = {
            length: len,
            endPosition: i + len
          };
          break; // Found a good match at this position, move to next position
        }
      }
    }
  }

  // If we found a good match (at least 4 consecutive words)
  if (bestMatch.length >= 4) {
    // Find the position in fullText2 where this match ends
    const matchEndWords = window2Words.slice(0, bestMatch.endPosition);
    const matchText = matchEndWords.join(' ');

    // Find where this text appears in the full text
    const position = fullText2.indexOf(matchText);

    if (position !== -1) {
      // Return position after the matched text
      return position + matchText.length;
    }
  }

  // Fallback: use a conservative split point (after ~5 words)
  // This prevents data loss if matching fails
  const fallbackWords = Math.min(5, window2Words.length);
  const fallbackText = window2Words.slice(0, fallbackWords).join(' ');
  const fallbackPos = fullText2.indexOf(fallbackText);

  if (fallbackPos !== -1) {
    console.log(`[Deduplication] Using fallback split point (no good match found)`);
    return fallbackPos + fallbackText.length;
  }

  // Last resort: start of text
  return 0;
}

/**
 * Extracts the last N words from a text string
 * @param text - Input text
 * @param n - Number of words to extract
 * @returns Last N words as a string
 */
function extractLastNWords(text: string, n: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  const startIndex = Math.max(0, words.length - n);
  return words.slice(startIndex).join(' ');
}

/**
 * Extracts the first N words from a text string
 * @param text - Input text
 * @param n - Number of words to extract
 * @returns First N words as a string
 */
function extractFirstNWords(text: string, n: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  return words.slice(0, Math.min(n, words.length)).join(' ');
}
