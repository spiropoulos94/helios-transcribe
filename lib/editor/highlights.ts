import { TranscriptionSegment } from '@/lib/ai/types';
import { SegmentEdit } from '@/lib/transcriptionStorage';
import { resolveSegmentsForExport } from '@/lib/export/types';
import { formatTimestamp } from './speakerColors';

const STORAGE_KEY_PREFIX = 'grecho-highlights-';

function getStorageKey(transcriptionId: string): string {
  return `${STORAGE_KEY_PREFIX}${transcriptionId}`;
}

/**
 * Load highlighted segment indices for a transcription from localStorage.
 */
export function loadHighlights(transcriptionId: string): number[] {
  try {
    const stored = localStorage.getItem(getStorageKey(transcriptionId));
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((value): value is number => typeof value === 'number');
  } catch (e) {
    console.warn('Failed to load highlights from localStorage:', e);
    return [];
  }
}

/**
 * Persist highlighted segment indices for a transcription to localStorage.
 */
export function saveHighlights(transcriptionId: string, indices: number[]): void {
  try {
    localStorage.setItem(getStorageKey(transcriptionId), JSON.stringify(indices));
  } catch (e) {
    console.warn('Failed to save highlights to localStorage:', e);
  }
}

/**
 * Build the plain-text quotes export for the highlighted segments.
 *
 * For each highlighted segment (sorted ascending), produces:
 *   `${speakerDisplayName} [${timestamp}]:\n"${text}"\n`
 */
export function buildQuotesExport(
  segments: TranscriptionSegment[],
  edits: SegmentEdit[],
  getSpeakerDisplayName: (id: string) => string,
  highlightedIndices: number[]
): string {
  const resolved = resolveSegmentsForExport(segments, edits, getSpeakerDisplayName);

  return [...highlightedIndices]
    .sort((a, b) => a - b)
    .map((index) => resolved[index])
    .filter((segment): segment is (typeof resolved)[number] => segment !== undefined)
    .map(
      (segment) =>
        `${segment.speakerDisplayName} [${formatTimestamp(segment.startTime)}]:\n"${segment.text}"\n`
    )
    .join('\n');
}
