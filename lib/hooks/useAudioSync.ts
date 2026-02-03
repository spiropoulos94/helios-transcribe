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

export function useAudioSync(segments: TranscriptionSegment[]): UseAudioSyncReturn {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [highlightedSegmentIndex, setHighlightedSegmentIndex] = useState<number | null>(null);
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState<number | null>(null);
  const [isEditRequested, setIsEditRequested] = useState(false);

  const lastHighlightUpdateRef = useRef(0);

  const handleTimeUpdate = useCallback(
    (time: number) => {
      setCurrentTime(time);

      const index = segments.findIndex(
        (s) => time >= s.startTime && time <= s.endTime
      );

      // Throttle highlight updates to reduce re-renders (~4/sec)
      const now = Date.now();
      if (index !== -1 && index !== highlightedSegmentIndex && now - lastHighlightUpdateRef.current > 250) {
        lastHighlightUpdateRef.current = now;
        setHighlightedSegmentIndex(index);
      }
    },
    [segments, highlightedSegmentIndex]
  );

  const handleTimestampClick = useCallback(
    (segment: TranscriptionSegment, audioRef: React.RefObject<HTMLAudioElement | null>) => {
      if (audioRef.current) {
        audioRef.current.currentTime = segment.startTime;
        setHighlightedSegmentIndex(segments.indexOf(segment));

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
