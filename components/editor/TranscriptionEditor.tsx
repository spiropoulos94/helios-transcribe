'use client';

import { useRef, useCallback, useMemo } from 'react';
import { SavedTranscription } from '@/lib/transcriptionStorage';
import { SPEAKER_COLORS, ColorScheme } from '@/lib/editor/speakerColors';
import { useEditorKeyboardShortcuts } from '@/lib/hooks/useEditorKeyboardShortcuts';
import { useEditorState } from '@/lib/hooks/useEditorState';
import { useSegmentNavigation } from '@/lib/hooks/useSegmentNavigation';
import { useAudioSync } from '@/lib/hooks/useAudioSync';
import { useTranslations } from '@/contexts/TranslationsContext';
import EditorHeader from './EditorHeader';
import AudioPlayer from './AudioPlayer';
import SpeakerLegend from './SpeakerLegend';
import SegmentList from './SegmentList';

interface TranscriptionEditorProps {
  transcription: SavedTranscription;
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export default function TranscriptionEditor({ transcription }: TranscriptionEditorProps) {
  const { t } = useTranslations();
  const audioRef = useRef<HTMLAudioElement>(null);
  const segments = transcription.metadata?.structuredData?.segments || [];

  // Custom hooks
  const { editorState, handleApprove, handleUnapprove, handleEdit, handleFinalize, approvedCount } =
    useEditorState(transcription, () => alert(t.editor?.finalizeSuccess || 'Transcription finalized successfully!'));

  const { previousId, nextId } = useSegmentNavigation(transcription.id);

  const {
    isPlaying,
    highlightedSegmentIndex,
    selectedSegmentIndex,
    isEditRequested,
    setIsPlaying,
    setSelectedSegmentIndex,
    setIsEditRequested,
    handleTimeUpdate,
    handleTimestampClick,
  } = useAudioSync(segments);

  // Memoize speaker colors
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

  // Export handler
  const handleExport = useCallback(() => {
    const exportText = segments
      .map((segment, index) => {
        const approval = editorState.approvals[index];
        const text = approval?.editedText || segment.text;
        return `${segment.speaker} [${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}]:\n${text}\n`;
      })
      .join('\n');

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

  // Keyboard shortcut handlers
  const handleKeyboardApprove = useCallback(() => {
    const index = selectedSegmentIndex ?? highlightedSegmentIndex;
    if (index !== null) {
      editorState.approvals[index]?.approved ? handleUnapprove(index) : handleApprove(index);
    }
  }, [selectedSegmentIndex, highlightedSegmentIndex, editorState.approvals, handleApprove, handleUnapprove]);

  const handleKeyboardEdit = useCallback(() => {
    const index = selectedSegmentIndex ?? highlightedSegmentIndex;
    if (index !== null) {
      setSelectedSegmentIndex(index);
      setIsEditRequested(true);
    }
  }, [selectedSegmentIndex, highlightedSegmentIndex, setSelectedSegmentIndex, setIsEditRequested]);

  const handleNextSegment = useCallback(() => {
    setSelectedSegmentIndex((prev) =>
      prev === null ? (highlightedSegmentIndex ?? 0) : Math.min(prev + 1, segments.length - 1)
    );
  }, [segments.length, highlightedSegmentIndex, setSelectedSegmentIndex]);

  const handlePrevSegment = useCallback(() => {
    setSelectedSegmentIndex((prev) =>
      prev === null ? (highlightedSegmentIndex ?? 0) : Math.max(prev - 1, 0)
    );
  }, [highlightedSegmentIndex, setSelectedSegmentIndex]);

  const handlePlayPause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.paused ? audioRef.current.play() : audioRef.current.pause();
    }
  }, []);

  useEditorKeyboardShortcuts({
    onApprove: handleKeyboardApprove,
    onEdit: handleKeyboardEdit,
    onNextSegment: handleNextSegment,
    onPrevSegment: handlePrevSegment,
    onPlayPause: handlePlayPause,
    onEscape: () => setSelectedSegmentIndex(null),
    enabled: true,
  });

  return (
    <div className="overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 h-[100vh] max-h-[calc(100vh-67px)] flex flex-col">
      <div className="shrink-0">
        <EditorHeader
          transcription={transcription}
          editorState={editorState}
          totalSegments={segments.length}
          approvedCount={approvedCount}
          previousId={previousId}
          nextId={nextId}
          onFinalize={handleFinalize}
          onExport={handleExport}
        />
      </div>

      <div className="lg:hidden shrink-0">
        <AudioPlayer ref={audioRef} audioFileId={editorState.audioFileId} onTimeUpdate={handleTimeUpdate} onPlayingChange={setIsPlaying} compact />
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="hidden lg:flex lg:flex-col lg:w-88 lg:shrink-0 p-6 space-y-4 overflow-y-auto">
          <AudioPlayer ref={audioRef} audioFileId={editorState.audioFileId} onTimeUpdate={handleTimeUpdate} onPlayingChange={setIsPlaying} />
          <SpeakerLegend segments={segments} />
        </div>

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
            onTimestampClick={(segment) => handleTimestampClick(segment, audioRef)}
            onSelect={setSelectedSegmentIndex}
            onEditRequestHandled={() => setIsEditRequested(false)}
          />
        </div>
      </div>
    </div>
  );
}
