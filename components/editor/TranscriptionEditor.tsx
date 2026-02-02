'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { SavedTranscription, TranscriptionEditorState, updateTranscriptionEditorState, getSavedTranscriptions } from '@/lib/transcriptionStorage';
import { TranscriptionSegment } from '@/lib/ai/types';
import { type Locale } from '@/i18n/config';
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
  const [previousId, setPreviousId] = useState<string | null>(null);
  const [nextId, setNextId] = useState<string | null>(null);

  const segments = transcription.metadata?.structuredData?.segments || [];

  // Get prev/next transcription IDs
  useEffect(() => {
    const loadNavigation = async () => {
      const allTranscriptions = await getSavedTranscriptions();
      const currentIndex = allTranscriptions.findIndex((t) => t.id === transcription.id);

      if (currentIndex !== -1) {
        setPreviousId(currentIndex > 0 ? allTranscriptions[currentIndex - 1].id : null);
        setNextId(currentIndex < allTranscriptions.length - 1 ? allTranscriptions[currentIndex + 1].id : null);
      }
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

  // Handle audio time update -> highlight current segment
  const handleTimeUpdate = useCallback(
    (time: number) => {
      setCurrentTime(time);

      // Find current segment
      const index = segments.findIndex(
        (s) => time >= s.startTime && time <= s.endTime
      );

      if (index !== -1 && index !== highlightedSegmentIndex) {
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
            highlightedSegmentIndex={highlightedSegmentIndex}
            isPlaying={isPlaying}
            onApprove={handleApprove}
            onUnapprove={handleUnapprove}
            onEdit={handleEdit}
            onTimestampClick={handleTimestampClick}
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
