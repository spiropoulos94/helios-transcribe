'use client';

import { useRef, useCallback, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { SavedTranscription } from '@/lib/transcriptionStorage';
import { SPEAKER_COLORS, ColorScheme } from '@/lib/editor/speakerColors';
import { useEditorKeyboardShortcuts } from '@/lib/hooks/useEditorKeyboardShortcuts';
import { useEditorState } from '@/lib/hooks/useEditorState';
import { useAudioSync } from '@/lib/hooks/useAudioSync';
import { useSegmentSearch } from '@/lib/hooks/useSegmentSearch';
import { useSpeakerSample } from '@/lib/hooks/useSpeakerSample';
import { useTranslations } from '@/contexts/TranslationsContext';
import EditorHeader from './EditorHeader';
import AudioPlayer from './AudioPlayer';
import SpeakerLegend from './SpeakerLegend';
import SegmentList from './SegmentList';
import SearchBar from './SearchBar';
import OfficialMinutesDialog from './OfficialMinutesDialog';
import PressReleaseDialog from './PressReleaseDialog';

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
  const [showOfficialMinutesDialog, setShowOfficialMinutesDialog] = useState(false);
  const [showPressReleaseDialog, setShowPressReleaseDialog] = useState(false);

  // Get segments sorted by start time
  const segments = useMemo(() => {
    const rawSegments = transcription.metadata?.structuredData?.segments || [];
    return [...rawSegments].sort((a, b) => a.startTime - b.startTime);
  }, [transcription.metadata?.structuredData?.segments]);

  // Editor state with speaker management
  const {
    editorState,
    handleApprove,
    handleUnapprove,
    handleApproveAll,
    handleUnapproveAll,
    handleEdit,
    handleFinalize,
    handleRevertToDraft,
    approvedCount,
    getNextUnapprovedIndex,
    getPrevUnapprovedIndex,
    speakerLabels,
    handleLabelSpeaker,
    getSpeakerDisplayName,
    uniqueSpeakers,
    labeledCount,
  } = useEditorState(transcription, segments, () =>
    toast.success(t.editor?.finalizeSuccess || 'Transcription finalized successfully!')
  );

  // Speaker sample playback (always enabled for sidebar legend)
  const speakerSample = useSpeakerSample({
    segments,
    audioRef,
    enabled: true,
  });

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
    const speakers: string[] = [];
    for (const segment of segments) {
      if (!speakers.includes(segment.speaker)) {
        speakers.push(segment.speaker);
      }
    }
    return Object.fromEntries(
      speakers.map((speaker, i) => [speaker, SPEAKER_COLORS[i % SPEAKER_COLORS.length]])
    ) as Record<string, ColorScheme>;
  }, [segments]);

  // Plain text export handler
  const handleExportPlainText = useCallback(() => {
    const exportText = segments
      .map((segment, index) => {
        const approval = editorState.approvals[index];
        const text = approval?.editedText || segment.text;
        const speakerName = getSpeakerDisplayName(segment.speaker);
        return `${speakerName} [${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}]:\n${text}\n`;
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
  }, [segments, editorState.approvals, transcription.fileName, getSpeakerDisplayName]);

  // Official minutes export handler
  const handleExportOfficialMinutes = useCallback(() => {
    setShowOfficialMinutesDialog(true);
  }, []);

  // Press release export handler
  const handleExportPressRelease = useCallback(() => {
    setShowPressReleaseDialog(true);
  }, []);

  // Keyboard shortcut handlers
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
    const nextIndex =
      activeSegmentIndex === null ? 0 : Math.min(activeSegmentIndex + 1, segments.length - 1);
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
        playFromActiveSegment(audioRef);
      } else {
        audioRef.current.pause();
      }
    }
  }, [playFromActiveSegment]);

  const handleEscape = useCallback(() => {
    if (isSearchOpen) {
      closeSearch();
    }
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
    enabled: !isSearchOpen,
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
          labeledCount={labeledCount}
          totalSpeakers={uniqueSpeakers.length}
          onFinalize={handleFinalize}
          onRevertToDraft={handleRevertToDraft}
          onExportPlainText={handleExportPlainText}
          onExportOfficialMinutes={handleExportOfficialMinutes}
          onExportPressRelease={handleExportPressRelease}
          onApproveAll={handleApproveAll}
          onUnapproveAll={handleUnapproveAll}
          onNextUnapproved={handleNextUnapproved}
          onPrevUnapproved={handlePrevUnapproved}
          hasUnapproved={approvedCount < segments.length}
        />
      </div>

      <div className="lg:hidden shrink-0">
        <AudioPlayer
          ref={audioRef}
          audioFileId={editorState.audioFileId}
          onTimeUpdate={handleTimeUpdate}
          onSeek={handleSeek}
          onPlayingChange={setIsPlaying}
          compact
        />
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="hidden lg:flex lg:flex-col lg:w-88 lg:shrink-0 p-6 space-y-4 overflow-y-auto">
          <AudioPlayer
            ref={audioRef}
            audioFileId={editorState.audioFileId}
            onTimeUpdate={handleTimeUpdate}
            onSeek={handleSeek}
            onPlayingChange={setIsPlaying}
          />

          <SpeakerLegend
            segments={segments}
            getSpeakerDisplayName={getSpeakerDisplayName}
            onLabelSpeaker={handleLabelSpeaker}
            onPlaySpeakerSample={(speakerId) => speakerSample.playSpeakerSample(speakerId, 5)}
            onStopSample={speakerSample.stopSample}
            isPlayingSample={speakerSample.isPlayingSample}
            currentPlayingSpeaker={speakerSample.currentSpeaker}
          />
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
            getSpeakerDisplayName={getSpeakerDisplayName}
            onLabelSpeaker={handleLabelSpeaker}
          />
        </div>
      </div>

      {/* Official Minutes Export Dialog */}
      <OfficialMinutesDialog
        isOpen={showOfficialMinutesDialog}
        onClose={() => setShowOfficialMinutesDialog(false)}
        segments={segments}
        approvals={editorState.approvals}
        speakerLabels={speakerLabels}
        getSpeakerDisplayName={getSpeakerDisplayName}
        fileName={transcription.fileName}
        transcriptionId={transcription.id}
      />

      {/* Press Release Export Dialog */}
      <PressReleaseDialog
        isOpen={showPressReleaseDialog}
        onClose={() => setShowPressReleaseDialog(false)}
        segments={segments}
        approvals={editorState.approvals}
        getSpeakerDisplayName={getSpeakerDisplayName}
        fileName={transcription.fileName}
        transcriptionId={transcription.id}
      />
    </div>
  );
}
