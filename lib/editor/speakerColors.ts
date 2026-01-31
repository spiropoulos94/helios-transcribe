import { TranscriptionSegment } from '../ai/types';

/**
 * Color scheme for speaker differentiation
 */
export interface ColorScheme {
  bg: string;
  border: string;
  text: string;
  name: string;
}

/**
 * Predefined color palette for speakers
 * Uses Tailwind CSS color classes for consistent styling
 */
export const SPEAKER_COLORS: ColorScheme[] = [
  {
    bg: 'bg-blue-100',
    border: 'border-blue-400',
    text: 'text-blue-700',
    name: 'Blue',
  },
  {
    bg: 'bg-green-100',
    border: 'border-green-400',
    text: 'text-green-700',
    name: 'Green',
  },
  {
    bg: 'bg-purple-100',
    border: 'border-purple-400',
    text: 'text-purple-700',
    name: 'Purple',
  },
  {
    bg: 'bg-orange-100',
    border: 'border-orange-400',
    text: 'text-orange-700',
    name: 'Orange',
  },
  {
    bg: 'bg-pink-100',
    border: 'border-pink-400',
    text: 'text-pink-700',
    name: 'Pink',
  },
  {
    bg: 'bg-teal-100',
    border: 'border-teal-400',
    text: 'text-teal-700',
    name: 'Teal',
  },
  {
    bg: 'bg-indigo-100',
    border: 'border-indigo-400',
    text: 'text-indigo-700',
    name: 'Indigo',
  },
  {
    bg: 'bg-rose-100',
    border: 'border-rose-400',
    text: 'text-rose-700',
    name: 'Rose',
  },
  {
    bg: 'bg-cyan-100',
    border: 'border-cyan-400',
    text: 'text-cyan-700',
    name: 'Cyan',
  },
  {
    bg: 'bg-amber-100',
    border: 'border-amber-400',
    text: 'text-amber-700',
    name: 'Amber',
  },
];

/**
 * Get color scheme for a specific speaker
 * Colors are assigned deterministically based on unique speaker order
 *
 * @param speaker - Speaker identifier (e.g., "Speaker A", "Speaker B")
 * @param allSegments - All transcription segments to determine unique speakers
 * @returns Color scheme for the speaker
 */
export function getSpeakerColor(
  speaker: string,
  allSegments: TranscriptionSegment[]
): ColorScheme {
  // Extract unique speakers in order of first appearance
  const uniqueSpeakers: string[] = [];
  for (const segment of allSegments) {
    if (!uniqueSpeakers.includes(segment.speaker)) {
      uniqueSpeakers.push(segment.speaker);
    }
  }

  // Find index of current speaker
  const speakerIndex = uniqueSpeakers.indexOf(speaker);

  // Assign color based on index (cycle through palette if more speakers than colors)
  const colorIndex = speakerIndex >= 0 ? speakerIndex % SPEAKER_COLORS.length : 0;

  return SPEAKER_COLORS[colorIndex];
}

/**
 * Get all unique speakers with their assigned colors
 *
 * @param segments - All transcription segments
 * @returns Array of speakers with their color schemes
 */
export function getAllSpeakersWithColors(
  segments: TranscriptionSegment[]
): Array<{ speaker: string; color: ColorScheme }> {
  // Extract unique speakers in order of first appearance
  const uniqueSpeakers: string[] = [];
  for (const segment of segments) {
    if (!uniqueSpeakers.includes(segment.speaker)) {
      uniqueSpeakers.push(segment.speaker);
    }
  }

  return uniqueSpeakers.map((speaker, index) => ({
    speaker,
    color: SPEAKER_COLORS[index % SPEAKER_COLORS.length],
  }));
}

/**
 * Format timestamp for display (MM:SS or HH:MM:SS)
 *
 * @param seconds - Time in seconds
 * @returns Formatted time string
 */
export function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
