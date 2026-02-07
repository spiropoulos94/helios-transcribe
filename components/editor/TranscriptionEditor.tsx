'use client';

import { useRef, useCallback, useMemo } from 'react';
import { SavedTranscription } from '@/lib/transcriptionStorage';
import { SPEAKER_COLORS, ColorScheme } from '@/lib/editor/speakerColors';
import { useEditorKeyboardShortcuts } from '@/lib/hooks/useEditorKeyboardShortcuts';
import { useEditorState } from '@/lib/hooks/useEditorState';
import { useAudioSync } from '@/lib/hooks/useAudioSync';
import { useSegmentSearch } from '@/lib/hooks/useSegmentSearch';
import { useTranslations } from '@/contexts/TranslationsContext';
import EditorHeader from './EditorHeader';
import AudioPlayer from './AudioPlayer';
import SpeakerLegend from './SpeakerLegend';
import SegmentList from './SegmentList';
import SearchBar from './SearchBar';

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

  // Get segments sorted by start time
  const segments = useMemo(() => {
    const rawSegments = transcription.metadata?.structuredData?.segments || [];
    return [...rawSegments].sort((a, b) => a.startTime - b.startTime);
  }, [transcription.metadata?.structuredData?.segments]);

  // Custom hooks
  const { editorState, handleApprove, handleUnapprove, handleApproveAll, handleUnapproveAll, handleEdit, handleFinalize, approvedCount, getNextUnapprovedIndex, getPrevUnapprovedIndex } =
    useEditorState(transcription, () => alert(t.editor?.finalizeSuccess || 'Transcription finalized successfully!'));

  const {
    isPlaying,
    activeSegmentIndex,
    isEditRequested,
    seekEvent,
    setIsPlaying,
    setIsEditRequested,
    handleTimeUpdate,
    handleSeek,
    handleSegmentClick,
    navigateToSegment,
    playFromActiveSegment,
    clearSeekEvent,
  } = useAudioSync(segments);

  // Search functionality
  const {
    searchQuery,
    setSearchQuery,
    isSearchOpen,
    openSearch,
    closeSearch,
    currentMatch,
    currentMatchIndex,
    matchCount,
    goToNextMatch,
    goToPrevMatch,
  } = useSegmentSearch(segments, editorState.approvals);

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

  // Keyboard shortcut handlers - all use activeSegmentIndex
  const handleKeyboardApprove = useCallback(() => {
    if (activeSegmentIndex !== null) {
      editorState.approvals[activeSegmentIndex]?.approved
        ? handleUnapprove(activeSegmentIndex)
        : handleApprove(activeSegmentIndex);
    }
  }, [activeSegmentIndex, editorState.approvals, handleApprove, handleUnapprove]);

  const handleKeyboardEdit = useCallback(() => {
    if (activeSegmentIndex !== null) {
      setIsEditRequested(true);
    }
  }, [activeSegmentIndex, setIsEditRequested]);

  const handleNextSegment = useCallback(() => {
    const nextIndex = activeSegmentIndex === null ? 0 : Math.min(activeSegmentIndex + 1, segments.length - 1);
    navigateToSegment(nextIndex, audioRef);
  }, [activeSegmentIndex, segments.length, navigateToSegment]);

  const handlePrevSegment = useCallback(() => {
    const prevIndex = activeSegmentIndex === null ? 0 : Math.max(activeSegmentIndex - 1, 0);
    navigateToSegment(prevIndex, audioRef);
  }, [activeSegmentIndex, navigateToSegment]);

  const handleNextUnapproved = useCallback(() => {
    const currentIndex = activeSegmentIndex ?? -1;
    const nextIndex = getNextUnapprovedIndex(currentIndex);
    if (nextIndex !== null) {
      navigateToSegment(nextIndex, audioRef);
    }
  }, [activeSegmentIndex, getNextUnapprovedIndex, navigateToSegment]);

  const handlePrevUnapproved = useCallback(() => {
    const currentIndex = activeSegmentIndex ?? segments.length;
    const prevIndex = getPrevUnapprovedIndex(currentIndex);
    if (prevIndex !== null) {
      navigateToSegment(prevIndex, audioRef);
    }
  }, [activeSegmentIndex, segments.length, getPrevUnapprovedIndex, navigateToSegment]);

  const handlePlayPause = useCallback(() => {
    if (audioRef.current) {
      if (audioRef.current.paused) {
        // If paused, play from active segment start
        playFromActiveSegment(audioRef);
      } else {
        audioRef.current.pause();
      }
    }
  }, [playFromActiveSegment]);

  // Handle escape - close search first if open
  const handleEscape = useCallback(() => {
    if (isSearchOpen) {
      closeSearch();
    }
    // No need to clear selection - we only have activeSegmentIndex now
  }, [isSearchOpen, closeSearch]);

  useEditorKeyboardShortcuts({
    onApprove: handleKeyboardApprove,
    onEdit: handleKeyboardEdit,
    onNextSegment: handleNextSegment,
    onPrevSegment: handlePrevSegment,
    onNextUnapproved: handleNextUnapproved,
    onPrevUnapproved: handlePrevUnapproved,
    onPlayPause: handlePlayPause,
    onSearch: openSearch,
    onEscape: handleEscape,
    enabled: !isSearchOpen, // Disable most shortcuts when search is open
  });

  return (
    <div className="overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 h-[100vh] max-h-[calc(100vh-67px)] flex flex-col">
      <div className="shrink-0">
        <SearchBar
          isOpen={isSearchOpen}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onClose={closeSearch}
          onNextMatch={goToNextMatch}
          onPrevMatch={goToPrevMatch}
          currentMatchIndex={currentMatchIndex}
          matchCount={matchCount}
        />
        <EditorHeader
          transcription={transcription}
          editorState={editorState}
          totalSegments={segments.length}
          approvedCount={approvedCount}
          onFinalize={handleFinalize}
          onExport={handleExport}
          onApproveAll={handleApproveAll}
          onUnapproveAll={handleUnapproveAll}
          onNextUnapproved={handleNextUnapproved}
          onPrevUnapproved={handlePrevUnapproved}
          hasUnapproved={approvedCount < segments.length}
        />
      </div>

      <div className="lg:hidden shrink-0">
        <AudioPlayer ref={audioRef} audioFileId={editorState.audioFileId} onTimeUpdate={handleTimeUpdate} onSeek={handleSeek} onPlayingChange={setIsPlaying} compact />
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="hidden lg:flex lg:flex-col lg:w-88 lg:shrink-0 p-6 space-y-4 overflow-y-auto">
          <AudioPlayer ref={audioRef} audioFileId={editorState.audioFileId} onTimeUpdate={handleTimeUpdate} onSeek={handleSeek} onPlayingChange={setIsPlaying} />
          <SpeakerLegend segments={segments} />
        </div>

        <div className="flex-1 overflow-hidden p-4 lg:p-6 lg:pl-0">
          <SegmentList
            segments={segments}
            approvals={editorState.approvals}
            speakerColorMap={speakerColorMap}
            activeSegmentIndex={activeSegmentIndex}
            seekEvent={seekEvent}
            currentSearchMatch={currentMatch}
            isPlaying={isPlaying}
            isEditRequested={isEditRequested}
            onApprove={handleApprove}
            onUnapprove={handleUnapprove}
            onEdit={handleEdit}
            onSegmentClick={(segment) => handleSegmentClick(segment, audioRef)}
            onEditRequestHandled={() => setIsEditRequested(false)}
            onSeekEventHandled={clearSeekEvent}
          />
        </div>
      </div>
    </div>
  );
}
