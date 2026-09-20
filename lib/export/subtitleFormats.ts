/**
 * Subtitle export utilities (SRT + WebVTT)
 *
 * Timing is segment-level (start/end per segment), not word-level.
 */

import { saveAs } from 'file-saver';
import { ResolvedSegment } from './types';

interface SubtitleOptions {
  /** Prefix each cue's text with `SpeakerName: ` (default true) */
  includeSpeaker?: boolean;
}

/**
 * Break a duration in seconds into padded hours/minutes/seconds/milliseconds.
 * Negative values are clamped to zero.
 */
function splitTimestamp(seconds: number): {
  hh: string;
  mm: string;
  ss: string;
  mmm: string;
} {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const ms = totalMs % 1000;
  const totalSeconds = Math.floor(totalMs / 1000);
  const ss = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const mm = totalMinutes % 60;
  const hh = Math.floor(totalMinutes / 60);

  return {
    hh: String(hh).padStart(2, '0'),
    mm: String(mm).padStart(2, '0'),
    ss: String(ss).padStart(2, '0'),
    mmm: String(ms).padStart(3, '0'),
  };
}

/**
 * Format seconds as an SRT timestamp: `HH:MM:SS,mmm`
 */
export function formatSrtTimestamp(seconds: number): string {
  const { hh, mm, ss, mmm } = splitTimestamp(seconds);
  return `${hh}:${mm}:${ss},${mmm}`;
}

/**
 * Format seconds as a WebVTT timestamp: `HH:MM:SS.mmm`
 */
export function formatVttTimestamp(seconds: number): string {
  const { hh, mm, ss, mmm } = splitTimestamp(seconds);
  return `${hh}:${mm}:${ss}.${mmm}`;
}

/**
 * Build the text of a single cue, optionally prefixed with the speaker name.
 */
function buildCueText(segment: ResolvedSegment, includeSpeaker: boolean): string {
  const text = segment.text.trim();
  if (includeSpeaker && segment.speakerDisplayName) {
    return `${segment.speakerDisplayName}: ${text}`;
  }
  return text;
}

/**
 * Convert resolved segments into an SRT (SubRip) subtitle string.
 */
export function toSRT(segments: ResolvedSegment[], opts?: SubtitleOptions): string {
  const includeSpeaker = opts?.includeSpeaker ?? true;

  return segments
    .map((segment, index) => {
      const start = formatSrtTimestamp(segment.startTime);
      const end = formatSrtTimestamp(segment.endTime);
      const text = buildCueText(segment, includeSpeaker);
      return `${index + 1}\n${start} --> ${end}\n${text}\n`;
    })
    .join('\n');
}

/**
 * Convert resolved segments into a WebVTT subtitle string.
 */
export function toVTT(segments: ResolvedSegment[], opts?: SubtitleOptions): string {
  const includeSpeaker = opts?.includeSpeaker ?? true;

  const cues = segments
    .map((segment) => {
      const start = formatVttTimestamp(segment.startTime);
      const end = formatVttTimestamp(segment.endTime);
      const text = buildCueText(segment, includeSpeaker);
      return `${start} --> ${end}\n${text}\n`;
    })
    .join('\n');

  return `WEBVTT\n\n${cues}`;
}

/**
 * Download subtitle content as a file using the correct MIME type.
 */
export function downloadSubtitles(
  content: string,
  filenameBase: string,
  ext: 'srt' | 'vtt'
): void {
  const mimeType = ext === 'vtt' ? 'text/vtt' : 'application/x-subrip';
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  saveAs(blob, `${filenameBase}.${ext}`);
}
