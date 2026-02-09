'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { TranscriptionSegment } from '@/lib/ai/types';

interface UseSpeakerSampleProps {
  segments: TranscriptionSegment[];
  audioRef: React.RefObject<HTMLAudioElement | null>;
  enabled?: boolean;
}

interface UseSpeakerSampleReturn {
  playSpeakerSample: (speakerId: string, maxDuration?: number) => void;
  stopSample: () => void;
  isPlayingSample: boolean;
  currentSpeaker: string | null;
  sampleProgress: number; // 0-100
}

const DEFAULT_SAMPLE_DURATION = 5; // seconds

/**
 * Hook for playing short audio samples of specific speakers.
 * Automatically stops playback at segment end or max duration.
 */
export function useSpeakerSample({
  segments,
  audioRef,
  enabled = true,
}: UseSpeakerSampleProps): UseSpeakerSampleReturn {
  const [isPlayingSample, setIsPlayingSample] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
  const [sampleProgress, setSampleProgress] = useState(0);

  const stopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sampleStartTimeRef = useRef<number>(0);
  const sampleEndTimeRef = useRef<number>(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get all segments for a specific speaker
  const getSpeakerSegments = useCallback(
    (speakerId: string): TranscriptionSegment[] => {
      return segments.filter((s) => s.speaker === speakerId);
    },
    [segments]
  );

  // Find the best sample segment for a speaker (prefer longer segments)
  const getBestSampleSegment = useCallback(
    (speakerId: string): TranscriptionSegment | null => {
      const speakerSegments = getSpeakerSegments(speakerId);
      if (speakerSegments.length === 0) return null;

      // Sort by duration (descending) and pick the longest one up to 10 seconds
      const sorted = [...speakerSegments].sort((a, b) => {
        const durationA = a.endTime - a.startTime;
        const durationB = b.endTime - b.startTime;
        return durationB - durationA;
      });

      return sorted[0];
    },
    [getSpeakerSegments]
  );

  // Stop any currently playing sample
  const stopSample = useCallback(() => {
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (audioRef.current && isPlayingSample) {
      audioRef.current.pause();
    }
    setIsPlayingSample(false);
    setCurrentSpeaker(null);
    setSampleProgress(0);
  }, [audioRef, isPlayingSample]);

  // Play a sample of a specific speaker
  const playSpeakerSample = useCallback(
    (speakerId: string, maxDuration: number = DEFAULT_SAMPLE_DURATION) => {
      if (!enabled || !audioRef.current) return;

      // Stop any current sample first
      stopSample();

      const segment = getBestSampleSegment(speakerId);
      if (!segment) return;

      const audio = audioRef.current;
      const segmentDuration = segment.endTime - segment.startTime;
      const playDuration = Math.min(segmentDuration, maxDuration);

      // Store sample bounds
      sampleStartTimeRef.current = segment.startTime;
      sampleEndTimeRef.current = segment.startTime + playDuration;

      // Seek and play
      audio.currentTime = segment.startTime;
      setIsPlayingSample(true);
      setCurrentSpeaker(speakerId);
      setSampleProgress(0);

      audio.play().catch(() => {
        // Handle autoplay restrictions gracefully
        setIsPlayingSample(false);
        setCurrentSpeaker(null);
      });

      // Set timeout to stop at end
      stopTimeoutRef.current = setTimeout(() => {
        audio.pause();
        setIsPlayingSample(false);
        setCurrentSpeaker(null);
        setSampleProgress(100);
      }, playDuration * 1000);

      // Update progress
      progressIntervalRef.current = setInterval(() => {
        if (audio.currentTime >= sampleEndTimeRef.current) {
          setSampleProgress(100);
        } else {
          const elapsed = audio.currentTime - sampleStartTimeRef.current;
          const total = sampleEndTimeRef.current - sampleStartTimeRef.current;
          setSampleProgress(Math.min(100, (elapsed / total) * 100));
        }
      }, 100);
    },
    [enabled, audioRef, getBestSampleSegment, stopSample]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Stop sample when disabled
  useEffect(() => {
    if (!enabled && isPlayingSample) {
      stopSample();
    }
  }, [enabled, isPlayingSample, stopSample]);

  return {
    playSpeakerSample,
    stopSample,
    isPlayingSample,
    currentSpeaker,
    sampleProgress,
  };
}
