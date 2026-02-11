'use client';

import { useState, useRef } from 'react';
import { RefreshCw, Newspaper, Maximize2, Pencil, RotateCcw } from 'lucide-react';
import { PressReleaseFormState } from '@/lib/export/pressReleaseTypes';
import { DownloadFormat } from '@/lib/export/downloadFormats';
import { getTranscriptionSummary } from '@/lib/export/formatTranscriptionForMinutes';
import {
  DownloadMenu,
  FullscreenEditor,
  TranscriptionSummaryCard,
  WarningAlert,
  ErrorAlert,
  GeneratingSpinner,
  ExportTranslations,
} from '../index';

interface PressReleaseGenerateProps {
  formState: PressReleaseFormState;
  summary: ReturnType<typeof getTranscriptionSummary>;
  isTooLong: boolean;
  canGenerate: boolean;
  onGenerate: () => void;
  onRegenerate: () => void;
  onDownload: (format: DownloadFormat) => Promise<void>;
  onUpdateMarkdown: (markdown: string) => void;
  t: ExportTranslations;
}

export default function PressReleaseGenerate({
  formState,
  summary,
  isTooLong,
  canGenerate,
  onGenerate,
  onRegenerate,
  onDownload,
  onUpdateMarkdown,
  t,
}: PressReleaseGenerateProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const originalContentRef = useRef<string | null>(null);

  // Store the original content when it's first generated
  if (formState.generatedMarkdown && originalContentRef.current === null) {
    originalContentRef.current = formState.generatedMarkdown;
  }

  // Reset original content reference when regenerating
  if (formState.isGenerating) {
    originalContentRef.current = null;
  }

  const hasChanges = originalContentRef.current !== null &&
    formState.generatedMarkdown !== originalContentRef.current;

  const handleRevert = () => {
    if (originalContentRef.current) {
      onUpdateMarkdown(originalContentRef.current);
    }
  };

  // Show error state
  if (formState.error) {
    return (
      <div className="space-y-4">
        <ErrorAlert
          title={t.editor?.generationFailed || 'Generation Failed'}
          message={formState.error}
        />
        <button
          onClick={onRegenerate}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          {t.editor?.tryAgain || 'Try Again'}
        </button>
      </div>
    );
  }

  // Show loading state
  if (formState.isGenerating) {
    return (
      <GeneratingSpinner
        title={t.editor?.pressReleaseGenerating || 'Generating press release...'}
        subtitle={t.editor?.generatingDesc || 'This may take a moment'}
        colorScheme="emerald"
      />
    );
  }

  // Show generated result
  if (formState.generatedMarkdown) {
    // Fullscreen mode
    if (isFullscreen) {
      return (
        <FullscreenEditor
          content={formState.generatedMarkdown}
          onChange={onUpdateMarkdown}
          onRegenerate={onRegenerate}
          onDownload={onDownload}
          onClose={() => setIsFullscreen(false)}
          title={t.editor?.pressReleasePreview || 'Generated Press Release'}
          t={t}
          colorScheme="emerald"
          canRevert={hasChanges}
          onRevert={handleRevert}
        />
      );
    }

    // Normal mode
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-slate-900">
            {t.editor?.pressReleasePreview || 'Generated Press Release'}
          </h4>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRevert}
              disabled={!hasChanges}
              title={t.editor?.revert || 'Revert to original'}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-4 h-4" />
              {t.editor?.revert || 'Revert'}
            </button>
            <button
              onClick={() => setIsFullscreen(true)}
              title={t.editor?.fullscreen || 'Fullscreen'}
              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={onRegenerate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              {t.editor?.regenerate || 'Regenerate'}
            </button>
            <DownloadMenu onDownload={onDownload} t={t} colorScheme="emerald" />
          </div>
        </div>
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={formState.generatedMarkdown}
            onChange={(e) => onUpdateMarkdown(e.target.value)}
            className="w-full h-[400px] p-4 text-sm text-slate-800 font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
            placeholder={t.editor?.editMinutesPlaceholder || 'Edit the generated content here...'}
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-2 text-xs text-slate-400">
            <button
              onClick={() => setIsFullscreen(true)}
              className="flex items-center gap-1 hover:text-slate-600 transition-colors"
              title={t.editor?.fullscreen || 'Fullscreen'}
            >
              <Maximize2 className="w-3 h-3" />
              {t.editor?.fullscreen || 'Fullscreen'}
            </button>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-1">
              <Pencil className="w-3 h-3" />
              {t.editor?.editableHint || 'Editable'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Show generate prompt
  return (
    <div className="space-y-4">
      <TranscriptionSummaryCard summary={summary} t={t} />

      {isTooLong && (
        <WarningAlert
          title={t.editor?.longTranscriptionWarning || 'Long Transcription'}
          message={t.editor?.longTranscriptionDesc || 'This transcription is quite long. Generation may take longer.'}
        />
      )}

      {!canGenerate && (
        <WarningAlert
          title={t.editor?.requiredFieldsMissing || 'Required Fields Missing'}
          message={t.editor?.requiredFieldsPressReleaseDesc || 'Please fill in Organization and Title/Subject in the previous step.'}
        />
      )}

      <button
        onClick={onGenerate}
        disabled={!canGenerate}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Newspaper className="w-4 h-4" />
        {t.editor?.pressReleaseGenerateBtn || 'Generate Press Release'}
      </button>

      <p className="text-xs text-slate-500 text-center">
        {t.editor?.pressReleaseNote || 'The AI will create a press release from the transcription content.'}
      </p>
    </div>
  );
}
