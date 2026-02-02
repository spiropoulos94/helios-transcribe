'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { SavedTranscription, TranscriptionEditorState, updateTranscriptionEditorState, getAdjacentTranscriptionIds } from '@/lib/transcriptionStorage';
import { TranscriptionSegment } from '@/lib/ai/types';
import { type Locale } from '@/i18n/config';
import { SPEAKER_COLORS, ColorScheme } from '@/lib/editor/speakerColors';
import { useEditorKeyboardShortcuts } from '@/lib/hooks/useEditorKeyboardShortcuts';
import EditorHeader from './EditorHeader';
import AudioPlayer from './AudioPlayer';
import SpeakerLegend from './SpeakerLegend';
import SegmentList from './SegmentList';

interface TranscriptionEditorProps {
  transcription: SavedTranscription;
  lang: Locale;
  translations: any;
}

export default function TranscriptionEditor({
  transcription,
  lang,
  translations: t,
}: TranscriptionEditorProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [editorState, setEditorState] = useState<TranscriptionEditorState>(() =>
    initializeEditorState(transcription)
  );
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [highlightedSegmentIndex, setHighlightedSegmentIndex] = useState<number | null>(null);
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState<number | null>(null);
  const [isEditRequested, setIsEditRequested] = useState(false);
  const [previousId, setPreviousId] = useState<string | null>(null);
  const [nextId, setNextId] = useState<string | null>(null);

  const segments = transcription.metadata?.structuredData?.segments || [];

  // Memoize speaker colors - compute once instead of O(n) per segment
  const speakerColorMap = useMemo(() => {
    const uniqueSpeakers: string[] = [];
    for (const segment of segments) {
      if (!uniqueSpeakers.includes(segment.speaker)) {
        uniqueSpeakers.push(segment.speaker);
      }
    }
    return Object.fromEntries(
      uniqueSpeakers.map((speaker, i) => [speaker, SPEAKER_COLORS[i % SPEAKER_COLORS.length]])
    ) as Record<string, ColorScheme>;
  }, [segments]);

  // Ref for throttling audio time updates
  const lastHighlightUpdateRef = useRef(0);

  // Get prev/next transcription IDs (efficient - only fetches adjacent records)
  useEffect(() => {
    const loadNavigation = async () => {
      const { prevId, nextId } = await getAdjacentTranscriptionIds(transcription.id);
      setPreviousId(prevId);
      setNextId(nextId);
    };
    loadNavigation();
  }, [transcription.id]);

  // Auto-save editor state to IndexedDB (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateTranscriptionEditorState(transcription.id, editorState).catch(console.error);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [editorState, transcription.id]);

  // Handle audio time update -> highlight current segment (throttled to ~4/sec)
  const handleTimeUpdate = useCallback(
    (time: number) => {
      setCurrentTime(time);

      // Find current segment
      const index = segments.findIndex(
        (s) => time >= s.startTime && time <= s.endTime
      );

      // Throttle highlight updates to reduce re-renders
      const now = Date.now();
      if (index !== -1 && index !== highlightedSegmentIndex && now - lastHighlightUpdateRef.current > 250) {
        lastHighlightUpdateRef.current = now;
        setHighlightedSegmentIndex(index);
      }
    },
    [segments, highlightedSegmentIndex]
  );

  // Handle segment timestamp click -> jump audio to that time
  const handleTimestampClick = useCallback(
    (segment: TranscriptionSegment) => {
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

  // Handle segment approval
  const handleApprove = useCallback((segmentIndex: number) => {
    setEditorState((prev) => ({
      ...prev,
      approvals: prev.approvals.map((a, i) =>
        i === segmentIndex ? { ...a, approved: true } : a
      ),
    }));
  }, []);

  // Handle segment unapprove
  const handleUnapprove = useCallback((segmentIndex: number) => {
    setEditorState((prev) => ({
      ...prev,
      approvals: prev.approvals.map((a, i) =>
        i === segmentIndex ? { ...a, approved: false } : a
      ),
    }));
  }, []);

  // Handle segment text edit
  const handleEdit = useCallback((segmentIndex: number, newText: string) => {
    setEditorState((prev) => ({
      ...prev,
      approvals: prev.approvals.map((a, i) =>
        i === segmentIndex
          ? { ...a, editedText: newText, editedAt: Date.now() }
          : a
      ),
    }));
  }, []);

  // Handle finalize
  const handleFinalize = useCallback(() => {
    setEditorState((prev) => ({
      ...prev,
      isDraft: false,
      finalizedAt: Date.now(),
    }));

    // Show success message
    alert(t.editor?.finalizeSuccess || 'Transcription finalized successfully!');
  }, []);

  // Handle export
  const handleExport = useCallback(() => {
    // Build export text with approved/edited segments
    const exportText = segments
      .map((segment, index) => {
        const approval = editorState.approvals[index];
        const text = approval?.editedText || segment.text;
        return `${segment.speaker} [${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}]:\n${text}\n`;
      })
      .join('\n');

    // Download as text file
    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${transcription.fileName.replace(/\.[^/.]+$/, '')}_approved.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [segments, editorState.approvals, transcription.fileName]);

  // Calculate approved count
  const approvedCount = useMemo(
    () => editorState.approvals.filter((a) => a.approved).length,
    [editorState.approvals]
  );

  // Keyboard shortcut handlers
  const handleKeyboardApprove = useCallback(() => {
    const index = selectedSegmentIndex ?? highlightedSegmentIndex;
    if (index !== null) {
      const approval = editorState.approvals[index];
      if (approval?.approved) {
        handleUnapprove(index);
      } else {
        handleApprove(index);
      }
    }
  }, [selectedSegmentIndex, highlightedSegmentIndex, editorState.approvals, handleApprove, handleUnapprove]);

  const handleKeyboardEdit = useCallback(() => {
    const index = selectedSegmentIndex ?? highlightedSegmentIndex;
    if (index !== null) {
      setSelectedSegmentIndex(index);
      setIsEditRequested(true);
    }
  }, [selectedSegmentIndex, highlightedSegmentIndex]);

  const handleEditRequestHandled = useCallback(() => {
    setIsEditRequested(false);
  }, []);

  const handleNextSegment = useCallback(() => {
    setSelectedSegmentIndex((prev) => {
      if (prev === null) return highlightedSegmentIndex ?? 0;
      return Math.min(prev + 1, segments.length - 1);
    });
  }, [segments.length, highlightedSegmentIndex]);

  const handlePrevSegment = useCallback(() => {
    setSelectedSegmentIndex((prev) => {
      if (prev === null) return highlightedSegmentIndex ?? 0;
      return Math.max(prev - 1, 0);
    });
  }, [highlightedSegmentIndex]);

  const handlePlayPause = useCallback(() => {
    if (audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  }, []);

  const handleEscape = useCallback(() => {
    setSelectedSegmentIndex(null);
  }, []);

  // Register keyboard shortcuts
  useEditorKeyboardShortcuts({
    onApprove: handleKeyboardApprove,
    onEdit: handleKeyboardEdit,
    onNextSegment: handleNextSegment,
    onPrevSegment: handlePrevSegment,
    onPlayPause: handlePlayPause,
    onEscape: handleEscape,
    enabled: true,
  });

  return (
    <div className="overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 h-[100vh] max-h-[calc(100vh-67px)] flex flex-col">
      {/* Header - sticky top */}
      <div className="shrink-0">
        <EditorHeader
          transcription={transcription}
          editorState={editorState}
          totalSegments={segments.length}
          approvedCount={approvedCount}
          lang={lang}
          translations={t}
          previousId={previousId}
          nextId={nextId}
          onFinalize={handleFinalize}
          onExport={handleExport}
        />
      </div>

      {/* Mobile: Compact Audio Player (sticky bar) */}
      <div className="lg:hidden shrink-0">
        <AudioPlayer
          ref={audioRef}
          audioFileId={editorState.audioFileId}
          onTimeUpdate={handleTimeUpdate}
          onPlayingChange={setIsPlaying}
          translations={t}
          compact
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar: Audio Player + Speaker Legend */}
        <div className="hidden lg:flex lg:flex-col lg:w-88 lg:shrink-0 p-6 space-y-4 overflow-y-auto">
          <AudioPlayer
            ref={audioRef}
            audioFileId={editorState.audioFileId}
            onTimeUpdate={handleTimeUpdate}
            onPlayingChange={setIsPlaying}
            translations={t}
          />
          <SpeakerLegend segments={segments} translations={t} />
        </div>

        {/* Segments List - scrollable */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 lg:pl-0">
          <SegmentList
            segments={segments}
            approvals={editorState.approvals}
            speakerColorMap={speakerColorMap}
            highlightedSegmentIndex={highlightedSegmentIndex}
            selectedSegmentIndex={selectedSegmentIndex}
            isPlaying={isPlaying}
            isEditRequested={isEditRequested}
            onApprove={handleApprove}
            onUnapprove={handleUnapprove}
            onEdit={handleEdit}
            onTimestampClick={handleTimestampClick}
            onSelect={setSelectedSegmentIndex}
            onEditRequestHandled={handleEditRequestHandled}
            translations={t}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Initialize editor state for a transcription
 */
function initializeEditorState(transcription: SavedTranscription): TranscriptionEditorState {
  // If already has editor state, use it
  if (transcription.metadata?.editorState) {
    return transcription.metadata.editorState;
  }

  // Initialize fresh state
  const segments = transcription.metadata?.structuredData?.segments || [];

  return {
    approvals: segments.map((_, index) => ({
      segmentIndex: index,
      approved: false,
    })),
    isDraft: true,
    audioFileId: transcription.metadata?.editorState?.audioFileId,
    audioFileName: transcription.fileName,
    audioDuration: transcription.metadata?.audioDurationSeconds,
  };
}

/**
 * Format time for export
 */
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
