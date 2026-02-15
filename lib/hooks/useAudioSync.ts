import { useState, useRef, useCallback } from 'react';
import { TranscriptionSegment } from '@/lib/ai/types';

interface SeekEvent {
  segmentIndex: number;
  id: number;
}

interface UseAudioSyncReturn {
  currentTime: number;
  isPlaying: boolean;
  activeSegmentIndex: number | null;
  isEditRequested: boolean;
  seekEvent: SeekEvent | null;
  editingSegmentIndex: number | null;
  setIsPlaying: (playing: boolean) => void;
  setIsEditRequested: (requested: boolean) => void;
  setEditingSegmentIndex: (index: number | null) => void;
  handleTimeUpdate: (time: number, audioRef: React.RefObject<HTMLAudioElement | null>) => void;
  handleSeek: (time: number) => void;
  handleSegmentClick: (segment: TranscriptionSegment, audioRef: React.RefObject<HTMLAudioElement | null>) => void;
  navigateToSegment: (index: number, audioRef: React.RefObject<HTMLAudioElement | null>) => void;
  playFromActiveSegment: (audioRef: React.RefObject<HTMLAudioElement | null>) => void;
  clearSeekEvent: () => void;
}

/**
 * Synchronizes audio playback with transcription segments.
 * Manages activeSegmentIndex which follows playback and can be set via clicks/keyboard.
 */
export function useAudioSync(segments: TranscriptionSegment[]): UseAudioSyncReturn {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);
  const [isEditRequested, setIsEditRequested] = useState(false);
  const [seekEvent, setSeekEvent] = useState<SeekEvent | null>(null);
  const [editingSegmentIndex, setEditingSegmentIndex] = useState<number | null>(null);

  const lastHighlightUpdateRef = useRef(0);
  const seekIdRef = useRef(0);
  const lastNavigationTimeRef = useRef(0);
  const NAVIGATION_LOCK_DURATION = 500;

  const findSegmentAtTime = useCallback(
    (time: number) => segments.findIndex((s) => time >= s.startTime && time <= s.endTime),
    [segments]
  );

  const emitSeekEvent = useCallback((index: number) => {
    seekIdRef.current += 1;
    setSeekEvent({ segmentIndex: index, id: seekIdRef.current });
  }, []);

  // Called during audio playback - updates active segment with throttling
  // When editing a segment, loops playback within that segment's bounds
  const handleTimeUpdate = useCallback(
    (time: number, audioRef: React.RefObject<HTMLAudioElement | null>) => {
      setCurrentTime(time);

      // If editing a segment, loop playback within its bounds
      if (editingSegmentIndex !== null && audioRef?.current) {
        const editingSegment = segments[editingSegmentIndex];
        if (editingSegment && time > editingSegment.endTime) {
          audioRef.current.currentTime = editingSegment.startTime;
          return; // Don't update active segment while looping
        }
      }

      const now = Date.now();
      if (now - lastNavigationTimeRef.current < NAVIGATION_LOCK_DURATION) return;

      const index = findSegmentAtTime(time);
      if (index !== activeSegmentIndex && now - lastHighlightUpdateRef.current > 250) {
        lastHighlightUpdateRef.current = now;
        setActiveSegmentIndex(index === -1 ? null : index);
      }
    },
    [findSegmentAtTime, activeSegmentIndex, editingSegmentIndex, segments]
  );

  // Called when user scrubs the audio slider
  const handleSeek = useCallback(
    (time: number) => {
      setCurrentTime(time);
      lastNavigationTimeRef.current = Date.now();

      const index = findSegmentAtTime(time);
      setActiveSegmentIndex(index === -1 ? null : index);
      if (index !== -1) emitSeekEvent(index);
    },
    [findSegmentAtTime, emitSeekEvent]
  );

  const clearSeekEvent = useCallback(() => setSeekEvent(null), []);

  // Click on segment - seeks and starts playback
  const handleSegmentClick = useCallback(
    (segment: TranscriptionSegment, audioRef: React.RefObject<HTMLAudioElement | null>) => {
      if (!audioRef.current) return;

      lastNavigationTimeRef.current = Date.now();
      const index = segments.indexOf(segment);

      audioRef.current.currentTime = segment.startTime;
      setActiveSegmentIndex(index);
      emitSeekEvent(index);
      audioRef.current.play();
    },
    [segments, emitSeekEvent]
  );

  // Keyboard navigation - seeks without auto-play
  const navigateToSegment = useCallback(
    (index: number, audioRef: React.RefObject<HTMLAudioElement | null>) => {
      if (index < 0 || index >= segments.length) return;

      lastNavigationTimeRef.current = Date.now();
      setActiveSegmentIndex(index);
      emitSeekEvent(index);

      if (audioRef.current) {
        audioRef.current.currentTime = segments[index].startTime;
      }
    },
    [segments, emitSeekEvent]
  );

  const playFromActiveSegment = useCallback(
    (audioRef: React.RefObject<HTMLAudioElement | null>) => {
      if (!audioRef.current || activeSegmentIndex === null) return;

      const segment = segments[activeSegmentIndex];
      if (segment) {
        audioRef.current.currentTime = segment.startTime;
        audioRef.current.play();
      }
    },
    [segments, activeSegmentIndex]
  );

  return {
    currentTime,
    isPlaying,
    activeSegmentIndex,
    isEditRequested,
    seekEvent,
    editingSegmentIndex,
    setIsPlaying,
    setIsEditRequested,
    setEditingSegmentIndex,
    handleTimeUpdate,
    handleSeek,
    handleSegmentClick,
    navigateToSegment,
    playFromActiveSegment,
    clearSeekEvent,
  };
}
