'use client';

import { useRef, useCallback, useMemo, useState } from 'react';
import { SavedTranscription } from '@/lib/transcriptionStorage';
import { resolveSegmentsForExport } from '@/lib/export/types';
import { toSRT, toVTT, downloadSubtitles } from '@/lib/export/subtitleFormats';
import { applyExportWatermark } from '@/lib/export/watermark';
import { SPEAKER_COLORS, ColorScheme } from '@/lib/editor/speakerColors';
import { useTranslations } from '@/contexts/TranslationsContext';
import { useEntitlements } from '@/lib/hooks/useEntitlements';
import { canExport, canUseAiTool, minPlanForAiTool } from '@/lib/billing/entitlements';
import type { PlanId } from '@/lib/pricing/plans';
import UpgradePrompt from '@/components/billing/UpgradePrompt';
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
import AiToolDialog from './AiToolDialog';
import { AiToolType } from '@/lib/ai/journalistPrompts';

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
  const [activeAiTool, setActiveAiTool] = useState<AiToolType | null>(null);
  const [gate, setGate] = useState<{ requiredPlan: PlanId | null } | null>(null);

  const { lang } = useTranslations();
  const { entitlements } = useEntitlements();
  const isPaidTier = entitlements.features.aiTools.length > 0; // Pro+ (AI documents)

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
    let exportText = segments
      .map((segment, index) => {
        const edit = editorState.edits.find((e) => e.segmentIndex === index);
        const text = edit?.editedText || segment.text;
        const speakerName = getSpeakerDisplayName(segment.speaker);
        return `${speakerName} [${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}]:\n${text}\n`;
      })
      .join('\n');

    // Free plan → watermark txt/pdf/docx exports (best-effort, client-side).
    if (entitlements.features.watermark) {
      exportText = applyExportWatermark(exportText, lang);
    }

    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${transcription.fileName.replace(/\.[^/.]+$/, '')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [segments, editorState.edits, transcription.fileName, getSpeakerDisplayName, entitlements.features.watermark, lang]);

  const handleExportSrt = useCallback(() => {
    if (!canExport(entitlements, 'srt')) {
      setGate({ requiredPlan: 'pro' });
      return;
    }
    const resolved = resolveSegmentsForExport(segments, editorState.edits, getSpeakerDisplayName);
    const content = toSRT(resolved);
    downloadSubtitles(content, transcription.fileName.replace(/\.[^/.]+$/, ''), 'srt');
  }, [segments, editorState.edits, transcription.fileName, getSpeakerDisplayName, entitlements]);

  const handleExportVtt = useCallback(() => {
    if (!canExport(entitlements, 'vtt')) {
      setGate({ requiredPlan: 'pro' });
      return;
    }
    const resolved = resolveSegmentsForExport(segments, editorState.edits, getSpeakerDisplayName);
    const content = toVTT(resolved);
    downloadSubtitles(content, transcription.fileName.replace(/\.[^/.]+$/, ''), 'vtt');
  }, [segments, editorState.edits, transcription.fileName, getSpeakerDisplayName, entitlements]);

  const handleExportQuotes = useCallback(() => {
    if (!entitlements.features.highlights) {
      setGate({ requiredPlan: 'pro' });
      return;
    }
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
  }, [segments, editorState.edits, getSpeakerDisplayName, highlighted, transcription.fileName, entitlements]);

  const handleExportOfficialMinutes = useCallback(() => {
    if (!isPaidTier) {
      setGate({ requiredPlan: 'pro' });
      return;
    }
    setShowOfficialMinutesDialog(true);
  }, [isPaidTier]);

  const handleExportPressRelease = useCallback(() => {
    if (!isPaidTier) {
      setGate({ requiredPlan: 'pro' });
      return;
    }
    setShowPressReleaseDialog(true);
  }, [isPaidTier]);

  const openAiTool = useCallback(
    (tool: AiToolType) => {
      if (!canUseAiTool(entitlements, tool)) {
        setGate({ requiredPlan: minPlanForAiTool(tool) });
        return;
      }
      setActiveAiTool(tool);
    },
    [entitlements]
  );

  const handleAiSummary = useCallback(() => openAiTool('summary'), [openAiTool]);
  const handleAiArticle = useCallback(() => openAiTool('article'), [openAiTool]);
  const handleAiShowNotes = useCallback(() => openAiTool('show-notes'), [openAiTool]);
  const handleAiClips = useCallback(() => openAiTool('clips'), [openAiTool]);

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
          onAiSummary={handleAiSummary}
          onAiArticle={handleAiArticle}
          onAiShowNotes={handleAiShowNotes}
          onAiClips={handleAiClips}
          onOpenGenerated={setActiveAiTool}
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

      {/* AI Content Toolkit Dialog */}
      {activeAiTool && (
        <AiToolDialog
          isOpen={activeAiTool !== null}
          onClose={() => setActiveAiTool(null)}
          type={activeAiTool}
          segments={segments}
          edits={editorState.edits}
          getSpeakerDisplayName={getSpeakerDisplayName}
          fileName={transcription.fileName}
          transcriptionId={transcription.id}
        />
      )}

      {/* Upgrade prompt for gated actions (client-side UX; server re-checks). */}
      {gate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setGate(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900 mb-3">
              {lang === 'el' ? 'Αναβαθμίστε το πλάνο σας' : 'Upgrade your plan'}
            </h3>
            <UpgradePrompt lang={lang} requiredPlan={gate.requiredPlan} />
            <button
              onClick={() => setGate(null)}
              className="mt-4 w-full py-2 rounded-lg text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700"
            >
              {lang === 'el' ? 'Κλείσιμο' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
