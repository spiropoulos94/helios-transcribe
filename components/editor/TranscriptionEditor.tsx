'use client';

import { useRef, useCallback, useMemo, useState } from 'react';
import { SavedTranscription } from '@/lib/transcriptionStorage';
import { resolveSegmentsForExport } from '@/lib/export/types';
import { toSRT, toVTT, downloadSubtitles } from '@/lib/export/subtitleFormats';
import { SPEAKER_COLORS, ColorScheme } from '@/lib/editor/speakerColors';
import { useEditorKeyboardShortcuts } from '@/lib/hooks/useEditorKeyboardShortcuts';
import { useEditorState } from '@/lib/hooks/useEditorState';
import { useHighlights } from '@/lib/hooks/useHighlights';
import { buildQuotesExport } from '@/lib/editor/highlights';
import { useAudioSync } from '@/lib/hooks/useAudioSync';
import { useSegmentSearch } from '@/lib/hooks/useSegmentSearch';
import { useSpeakerSample } from '@/lib/hooks/useSpeakerSample';
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
  const audioRef = useRef<HTMLAudioElement>(null);
  const [showOfficialMinutesDialog, setShowOfficialMinutesDialog] = useState(false);
  const [showPressReleaseDialog, setShowPressReleaseDialog] = useState(false);

  const segments = useMemo(() => {
    const rawSegments = transcription.metadata?.structuredData?.segments || [];
    return [...rawSegments].sort((a, b) => a.startTime - b.startTime);
  }, [transcription.metadata?.structuredData?.segments]);

  const {
    editorState,
    handleEdit,
    speakerLabels,
    handleLabelSpeaker,
    getSpeakerDisplayName,
    uniqueSpeakers,
    labeledCount,
  } = useEditorState(transcription, segments);

  const { highlighted, toggle: toggleHighlight } = useHighlights(transcription.id);

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
  } = useAudioSync(segments);

  const handleTimeUpdateWithRef = useCallback(
    (time: number) => handleTimeUpdate(time, audioRef),
    [handleTimeUpdate]
  );

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
  } = useSegmentSearch(segments, editorState.edits);

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

  const handleExportPlainText = useCallback(() => {
    const exportText = segments
      .map((segment, index) => {
        const edit = editorState.edits.find((e) => e.segmentIndex === index);
        const text = edit?.editedText || segment.text;
        const speakerName = getSpeakerDisplayName(segment.speaker);
        return `${speakerName} [${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}]:\n${text}\n`;
      })
      .join('\n');

    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${transcription.fileName.replace(/\.[^/.]+$/, '')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [segments, editorState.edits, transcription.fileName, getSpeakerDisplayName]);

  const handleExportSrt = useCallback(() => {
    const resolved = resolveSegmentsForExport(segments, editorState.edits, getSpeakerDisplayName);
    const content = toSRT(resolved);
    downloadSubtitles(content, transcription.fileName.replace(/\.[^/.]+$/, ''), 'srt');
  }, [segments, editorState.edits, transcription.fileName, getSpeakerDisplayName]);

  const handleExportVtt = useCallback(() => {
    const resolved = resolveSegmentsForExport(segments, editorState.edits, getSpeakerDisplayName);
    const content = toVTT(resolved);
    downloadSubtitles(content, transcription.fileName.replace(/\.[^/.]+$/, ''), 'vtt');
  }, [segments, editorState.edits, transcription.fileName, getSpeakerDisplayName]);

  const handleExportQuotes = useCallback(() => {
    const exportText = buildQuotesExport(
      segments,
      editorState.edits,
      getSpeakerDisplayName,
      [...highlighted]
    );

    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${transcription.fileName.replace(/\.[^/.]+$/, '')}_quotes.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [segments, editorState.edits, getSpeakerDisplayName, highlighted, transcription.fileName]);

  const handleExportOfficialMinutes = useCallback(() => {
    setShowOfficialMinutesDialog(true);
  }, []);

  const handleExportPressRelease = useCallback(() => {
    setShowPressReleaseDialog(true);
  }, []);

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
    onEdit: handleKeyboardEdit,
    onNextSegment: handleNextSegment,
    onPrevSegment: handlePrevSegment,
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
          labeledCount={labeledCount}
          totalSpeakers={uniqueSpeakers.length}
          onExportPlainText={handleExportPlainText}
          onExportSrt={handleExportSrt}
          onExportVtt={handleExportVtt}
          onExportOfficialMinutes={handleExportOfficialMinutes}
          onExportPressRelease={handleExportPressRelease}
          onExportQuotes={handleExportQuotes}
          highlightCount={highlighted.size}
        />
      </div>

      <div className="lg:hidden shrink-0">
        <AudioPlayer
          ref={audioRef}
          audioFileId={editorState.audioFileId}
          onTimeUpdate={handleTimeUpdateWithRef}
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
            onTimeUpdate={handleTimeUpdateWithRef}
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
            edits={editorState.edits}
            speakerColorMap={speakerColorMap}
            activeSegmentIndex={activeSegmentIndex}
            seekEvent={seekEvent}
            currentSearchMatch={currentMatch}
            isPlaying={isPlaying}
            isEditRequested={isEditRequested}
            editingSegmentIndex={editingSegmentIndex}
            highlightedIndices={highlighted}
            onToggleHighlight={toggleHighlight}
            onEdit={handleEdit}
            onSegmentClick={(segment) => handleSegmentClick(segment, audioRef)}
            onEditRequestHandled={() => setIsEditRequested(false)}
            onSeekEventHandled={clearSeekEvent}
            onEditingChange={setEditingSegmentIndex}
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
        edits={editorState.edits}
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
        edits={editorState.edits}
        getSpeakerDisplayName={getSpeakerDisplayName}
        fileName={transcription.fileName}
        transcriptionId={transcription.id}
      />
    </div>
  );
}
