'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X,
  ListChecks,
  Newspaper,
  Podcast,
  Scissors,
  RefreshCw,
  Sparkles,
  Pencil,
  type LucideIcon,
} from 'lucide-react';
import { downloadInFormat, DownloadFormat } from '@/lib/export/downloadFormats';
import { useTranslations } from '@/contexts/TranslationsContext';
import { resolveSegmentsForExport } from '@/lib/export/types';
import {
  getTranscriptionSummary,
  isTranscriptionTooLong,
} from '@/lib/export/formatTranscriptionForMinutes';
import { AiToolType, AiGenerateResponse } from '@/lib/ai/journalistPrompts';
import { getGeneratedContent, saveGeneratedContent } from '@/lib/generatedContent';
import { TranscriptionSegment } from '@/lib/ai/types';
import { SegmentEdit } from '@/lib/transcriptionStorage';
import {
  DownloadMenu,
  TranscriptionSummaryCard,
  WarningAlert,
  ErrorAlert,
  GeneratingSpinner,
} from './export';

interface AiToolDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type: AiToolType;
  segments: TranscriptionSegment[];
  edits: SegmentEdit[];
  getSpeakerDisplayName: (id: string) => string;
  fileName: string;
  transcriptionId: string;
}

interface ToolConfig {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  titleKey: string;
  titleFallback: string;
  descKey: string;
  descFallback: string;
}

const TOOL_CONFIG: Record<AiToolType, ToolConfig> = {
  summary: {
    icon: ListChecks,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    titleKey: 'aiSummaryTitle',
    titleFallback: 'Summary & Quotes',
    descKey: 'aiSummaryDesc',
    descFallback: 'A TL;DR and suggested pull-quotes',
  },
  article: {
    icon: Newspaper,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    titleKey: 'aiArticleTitle',
    titleFallback: 'Article Draft',
    descKey: 'aiArticleDesc',
    descFallback: 'A journalistic article draft to fact-check',
  },
  'show-notes': {
    icon: Podcast,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    titleKey: 'aiShowNotesTitle',
    titleFallback: 'Show Notes',
    descKey: 'aiShowNotesDesc',
    descFallback: 'Podcast show notes with chapters',
  },
  clips: {
    icon: Scissors,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    titleKey: 'aiClipsTitle',
    titleFallback: 'Clip Suggestions',
    descKey: 'aiClipsDesc',
    descFallback: 'Short-video clip ideas for reels/shorts',
  },
};

const STORAGE_KEY_PREFIX = 'ai-tool-';

function getStorageKey(transcriptionId: string, type: AiToolType): string {
  return `${STORAGE_KEY_PREFIX}${transcriptionId}:${type}`;
}

export default function AiToolDialog({
  isOpen,
  onClose,
  type,
  segments,
  edits,
  getSpeakerDisplayName,
  fileName,
  transcriptionId,
}: AiToolDialogProps) {
  const { t, lang } = useTranslations();
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const config = TOOL_CONFIG[type];
  const Icon = config.icon;

  // Resolve segments and summary (memoized)
  const resolvedSegments = useMemo(
    () => resolveSegmentsForExport(segments, edits, getSpeakerDisplayName),
    [segments, edits, getSpeakerDisplayName]
  );
  const summary = useMemo(() => getTranscriptionSummary(resolvedSegments), [resolvedSegments]);
  const isTooLong = useMemo(() => isTranscriptionTooLong(resolvedSegments), [resolvedSegments]);

  // Load persisted markdown when the dialog opens (or the tool type changes).
  // Prefer the server copy (available from any device); fall back to the
  // localStorage offline cache. Both paths are fail-soft.
  useEffect(() => {
    if (!isOpen) return;
    setError(null);

    let cancelled = false;

    // Show the cached value immediately so the dialog is never empty offline.
    let cached: string | null = null;
    try {
      const stored = localStorage.getItem(getStorageKey(transcriptionId, type));
      cached = stored && stored.length > 0 ? stored : null;
    } catch {
      cached = null;
    }
    setMarkdown(cached);

    // Then override with the server copy when one exists.
    getGeneratedContent(transcriptionId, type)
      .then((item) => {
        if (cancelled) return;
        if (item && item.content.length > 0) {
          setMarkdown(item.content);
        }
      })
      .catch(() => {
        // Keep the cached value on any error.
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, transcriptionId, type]);

  // Persist generated markdown. Never auto-delete: removing on a null value
  // would clobber the saved content on reopen (StrictMode runs effects twice,
  // so the load pass reads back the just-deleted value).
  useEffect(() => {
    if (!isOpen || !markdown) return;
    try {
      localStorage.setItem(getStorageKey(transcriptionId, type), markdown);
    } catch {
      // Ignore storage errors (private mode, quota, etc.)
    }
  }, [isOpen, markdown, transcriptionId, type]);

  const handleClose = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    // Persist manual edits server-side on close (fire-and-forget, fail-soft).
    if (markdown && markdown.length > 0) {
      void saveGeneratedContent({ transcriptionId, type, content: markdown });
    }
    onClose();
  }, [onClose, markdown, transcriptionId, type]);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isGenerating) {
        handleClose();
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, handleClose, isGenerating]);

  const handleGenerate = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsGenerating(true);
    setError(null);

    try {
      const resolvedSegs = resolveSegmentsForExport(segments, edits, getSpeakerDisplayName);

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments: resolvedSegs,
          type,
          language: lang === 'en' ? 'en' : 'el',
        }),
        signal: abortController.signal,
      });

      const result: AiGenerateResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate content');
      }

      setMarkdown(result.markdown ?? '');
      setIsGenerating(false);
      // Persist server-side so it is retrievable from any device (fail-soft).
      void saveGeneratedContent({ transcriptionId, type, content: result.markdown ?? '' });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setIsGenerating(false);
    } finally {
      abortControllerRef.current = null;
    }
  }, [segments, edits, getSpeakerDisplayName, type, lang, transcriptionId]);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  }, []);

  const handleRegenerate = useCallback(() => {
    setMarkdown(null);
    setError(null);
    handleGenerate();
  }, [handleGenerate]);

  const handleDownload = useCallback(
    async (format: DownloadFormat) => {
      if (!markdown) return;
      const baseFilename = `${fileName.replace(/\.[^/.]+$/, '')}_${type}`;
      await downloadInFormat(markdown, baseFilename, format);
    },
    [markdown, fileName, type]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !isGenerating && handleClose()}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${config.iconBg} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${config.iconColor}`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {t.editor?.[config.titleKey] || config.titleFallback}
              </h2>
              <p className="text-sm text-slate-500">
                {t.editor?.[config.descKey] || config.descFallback}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isGenerating}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isGenerating ? (
            <div className="space-y-4">
              <GeneratingSpinner
                title={t.editor?.aiGenerating || 'Generating...'}
                subtitle={t.editor?.generatingDesc || 'This may take a moment'}
                colorScheme="emerald"
              />
              <div className="flex justify-center">
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                  {t.editor?.cancel || 'Άκυρο'}
                </button>
              </div>
            </div>
          ) : error ? (
            <div className="space-y-4">
              <ErrorAlert
                title={t.editor?.generationFailed || 'Generation Failed'}
                message={error}
              />
              <button
                onClick={handleRegenerate}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                {t.editor?.tryAgain || 'Try Again'}
              </button>
            </div>
          ) : markdown !== null ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-slate-900">
                  {t.editor?.[config.titleKey] || config.titleFallback}
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRegenerate}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {t.editor?.aiRegenerate || 'Regenerate'}
                  </button>
                  <DownloadMenu onDownload={handleDownload} t={t} colorScheme="emerald" />
                </div>
              </div>
              <div className="relative">
                <textarea
                  value={markdown}
                  onChange={(e) => setMarkdown(e.target.value)}
                  className="w-full h-[400px] p-4 text-sm text-slate-800 font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                  placeholder={t.editor?.aiEditHint || 'Edit the generated content here...'}
                />
                <div className="absolute bottom-3 right-3 flex items-center gap-1 text-xs text-slate-400">
                  <Pencil className="w-3 h-3" />
                  {t.editor?.aiEditHint || 'Editable'}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <TranscriptionSummaryCard summary={summary} t={t} />

              {isTooLong && (
                <WarningAlert
                  title={t.editor?.longTranscriptionWarning || 'Long Transcription'}
                  message={
                    t.editor?.longTranscriptionDesc ||
                    'This transcription is quite long. Generation may take longer.'
                  }
                />
              )}

              <button
                onClick={handleGenerate}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                {t.editor?.aiGenerate || 'Generate'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
