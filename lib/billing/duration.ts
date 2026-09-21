/**
 * Pure helper to derive audio duration (seconds) from transcript segments — the
 * authoritative source for usage metering. Works on any segment array exposing
 * numeric `startTime`/`endTime` (both `TranscriptionSegment` and `ResolvedSegment`).
 */

interface TimedSegment {
  startTime?: number;
  endTime?: number;
}

/** The largest `endTime` across segments, i.e. the audio length. 0 when unknown. */
export function durationSecondsFromSegments(
  segments: TimedSegment[] | null | undefined
): number {
  if (!segments || segments.length === 0) return 0;
  let max = 0;
  for (const seg of segments) {
    const end = typeof seg.endTime === 'number' ? seg.endTime : seg.startTime ?? 0;
    if (end > max) max = end;
  }
  return Math.round(max);
}
