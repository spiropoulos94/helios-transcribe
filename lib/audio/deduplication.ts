export interface ChunkResult {
  text: string;
  startTime: number;
  endTime: number;
  hasOverlapBefore: boolean;
  hasOverlapAfter: boolean;
  model?: string;
  wasTruncated?: boolean;
}

/**
 * Adjusts timestamps in transcribed text by adding an offset
 * Handles both [MM:SS] and [HH:MM:SS] formats
 * @param text - Transcribed text containing timestamps
 * @param offsetSeconds - Number of seconds to add to each timestamp
 * @returns Text with adjusted timestamps
 */
export function adjustTimestamps(text: string, offsetSeconds: number): string {
  if (offsetSeconds === 0) {
    return text;
  }

  // Match timestamps in format [MM:SS] or [HH:MM:SS]
  const timestampRegex = /\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]/g;

  return text.replace(timestampRegex, (match, first, second, third) => {
    let totalSeconds: number;

    if (third !== undefined) {
      // [HH:MM:SS] format
      const hours = parseInt(first, 10);
      const minutes = parseInt(second, 10);
      const seconds = parseInt(third, 10);
      totalSeconds = hours * 3600 + minutes * 60 + seconds;
    } else {
      // [MM:SS] format
      const minutes = parseInt(first, 10);
      const seconds = parseInt(second, 10);
      totalSeconds = minutes * 60 + seconds;
    }

    // Add offset
    totalSeconds += offsetSeconds;

    // Format back to appropriate format
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    if (hours > 0) {
      return `[${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}]`;
    }
    return `[${minutes}:${seconds.toString().padStart(2, '0')}]`;
  });
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
