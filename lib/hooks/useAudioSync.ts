import { useState, useRef, useCallback } from 'react';
import { TranscriptionSegment } from '@/lib/ai/types';

interface UseAudioSyncReturn {
  currentTime: number;
  isPlaying: boolean;
  highlightedSegmentIndex: number | null;
  selectedSegmentIndex: number | null;
  isEditRequested: boolean;
  setIsPlaying: (playing: boolean) => void;
  setSelectedSegmentIndex: React.Dispatch<React.SetStateAction<number | null>>;
  setIsEditRequested: (requested: boolean) => void;
  handleTimeUpdate: (time: number) => void;
  handleTimestampClick: (
    segment: TranscriptionSegment,
    audioRef: React.RefObject<HTMLAudioElement | null>
  ) => void;
}

/**
 * Hook for synchronizing audio playback with transcription segments.
 *
 * Tracks the current playback time and determines which segment should be
 * highlighted based on the audio position. Also manages segment selection
 * for keyboard navigation and editing.
 *
 * Features:
 * - Tracks current audio time and playing state
 * - Auto-highlights segment based on playback position
 * - Throttles highlight updates to ~4/sec for performance
 * - Handles timestamp clicks to seek audio
 * - Manages selected segment for keyboard navigation
 * - Tracks edit request state for keyboard shortcut handling
 *
 * @param segments - Array of transcription segments with timing info
 * @returns Audio sync state and handler functions
 *
 * @example
 * const { highlightedSegmentIndex, handleTimeUpdate } = useAudioSync(segments);
 * // Pass handleTimeUpdate to audio element's onTimeUpdate
 */
export function useAudioSync(segments: TranscriptionSegment[]): UseAudioSyncReturn {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [highlightedSegmentIndex, setHighlightedSegmentIndex] = useState<number | null>(null);
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState<number | null>(null);
  const [isEditRequested, setIsEditRequested] = useState(false);

  // Ref to track last highlight update time for throttling
  const lastHighlightUpdateRef = useRef(0);

  // Handle audio time updates - finds matching segment and updates highlight
  const handleTimeUpdate = useCallback(
    (time: number) => {
      setCurrentTime(time);

      // Find segment that contains the current time
      const index = segments.findIndex(
        (s) => time >= s.startTime && time <= s.endTime
      );

      // Throttle highlight updates to ~4/sec to reduce re-renders
      const now = Date.now();
      if (index !== -1 && index !== highlightedSegmentIndex && now - lastHighlightUpdateRef.current > 250) {
        lastHighlightUpdateRef.current = now;
        setHighlightedSegmentIndex(index);
      }
    },
    [segments, highlightedSegmentIndex]
  );

  // Handle click on timestamp - seeks audio and starts playback
  const handleTimestampClick = useCallback(
    (segment: TranscriptionSegment, audioRef: React.RefObject<HTMLAudioElement | null>) => {
      if (audioRef.current) {
        audioRef.current.currentTime = segment.startTime;
        setHighlightedSegmentIndex(segments.indexOf(segment));

        // Auto-play if not already playing
        if (!isPlaying) {
          audioRef.current.play();
        }
      }
    },
    [segments, isPlaying]
  );

  return {
    currentTime,
    isPlaying,
    highlightedSegmentIndex,
    selectedSegmentIndex,
    isEditRequested,
    setIsPlaying,
    setSelectedSegmentIndex,
    setIsEditRequested,
    handleTimeUpdate,
    handleTimestampClick,
  };
}
