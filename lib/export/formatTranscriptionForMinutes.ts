/**
 * Utility to format transcription segments for official minutes generation
 */

import { ResolvedSegment } from './types';

/**
 * Format seconds to HH:MM:SS timestamp
 */
function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format resolved segments into a text format suitable for AI processing
 */
export function formatTranscriptionForMinutes(segments: ResolvedSegment[]): string {
  if (segments.length === 0) {
    return '(Δεν υπάρχει διαθέσιμο κείμενο μεταγραφής)';
  }

  // Group consecutive segments by speaker for cleaner output
  const groupedSegments = groupBySpeaker(segments);

  return groupedSegments
    .map(group => {
      const timestamp = formatTimestamp(group.startTime);
      const speakerName = group.speakerDisplayName;
      const text = group.texts.join(' ');

      return `[${timestamp}] ${speakerName}:\n${text}`;
    })
    .join('\n\n');
}

/**
 * Group consecutive segments by the same speaker
 */
interface GroupedSegment {
  speaker: string;
  speakerDisplayName: string;
  startTime: number;
  endTime: number;
  texts: string[];
}

function groupBySpeaker(segments: ResolvedSegment[]): GroupedSegment[] {
  if (segments.length === 0) return [];

  const groups: GroupedSegment[] = [];
  let currentGroup: GroupedSegment | null = null;

  for (const segment of segments) {
    if (currentGroup && currentGroup.speaker === segment.speaker) {
      // Same speaker, extend the group
      currentGroup.texts.push(segment.text);
      currentGroup.endTime = segment.endTime;
    } else {
      // New speaker, start a new group
      if (currentGroup) {
        groups.push(currentGroup);
      }
      currentGroup = {
        speaker: segment.speaker,
        speakerDisplayName: segment.speakerDisplayName,
        startTime: segment.startTime,
        endTime: segment.endTime,
        texts: [segment.text],
      };
    }
  }

  // Don't forget the last group
  if (currentGroup) {
    groups.push(currentGroup);
  }

  return groups;
}

/**
 * Calculate the total character count of the transcription
 */
export function calculateTranscriptionLength(segments: ResolvedSegment[]): number {
  return segments.reduce((total, segment) => total + segment.text.length, 0);
}

/**
 * Check if the transcription might be too long for processing
 */
export function isTranscriptionTooLong(segments: ResolvedSegment[], threshold = 50000): boolean {
  return calculateTranscriptionLength(segments) > threshold;
}

/**
 * Get a summary of the transcription for display
 */
export function getTranscriptionSummary(segments: ResolvedSegment[]): {
  segmentCount: number;
  speakerCount: number;
  charCount: number;
  estimatedDuration: string;
} {
  const speakers = new Set(segments.map(s => s.speaker));
  const charCount = calculateTranscriptionLength(segments);

  // Estimate duration from the last segment's end time
  const lastSegment = segments[segments.length - 1];
  const durationSeconds = lastSegment ? lastSegment.endTime : 0;
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);

  let estimatedDuration: string;
  if (hours > 0) {
    estimatedDuration = `${hours}h ${minutes}m`;
  } else {
    estimatedDuration = `${minutes}m`;
  }

  return {
    segmentCount: segments.length,
    speakerCount: speakers.size,
    charCount,
    estimatedDuration,
  };
}
