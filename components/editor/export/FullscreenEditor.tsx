'use client';

import { useEffect, useRef } from 'react';
import { RefreshCw, Minimize2, Pencil, RotateCcw } from 'lucide-react';
import { DownloadFormat } from '@/lib/export/downloadFormats';
import DownloadMenu from './DownloadMenu';
import { ExportTranslations } from './types';

interface FullscreenEditorProps {
  content: string;
  onChange: (content: string) => void;
  onRegenerate: () => void;
  onDownload: (format: DownloadFormat) => Promise<void>;
  onClose: () => void;
  title: string;
  t: ExportTranslations;
  colorScheme?: 'purple' | 'emerald';
  canRevert?: boolean;
  onRevert?: () => void;
}

export default function FullscreenEditor({
  content,
  onChange,
  onRegenerate,
  onDownload,
  onClose,
  title,
  t,
  colorScheme = 'purple',
  canRevert = false,
  onRevert,
}: FullscreenEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle Escape key to exit fullscreen
  useEffect(() => {
    function handleEscapeFullscreen(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    }
    // Use capture phase to handle before the modal's escape handler
    document.addEventListener('keydown', handleEscapeFullscreen, true);
    return () => document.removeEventListener('keydown', handleEscapeFullscreen, true);
  }, [onClose]);

  const ringColor = colorScheme === 'purple' ? 'focus:ring-purple-500' : 'focus:ring-emerald-500';

  return (
    <div className="fixed inset-0 z-70 bg-white flex flex-col animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
        <h4 className="font-medium text-slate-900">{title}</h4>
        <div className="flex items-center gap-2">
          {onRevert && (
            <button
              onClick={onRevert}
              disabled={!canRevert}
              title={t.editor?.revert || 'Revert to original'}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-4 h-4" />
              {t.editor?.revert || 'Revert'}
            </button>
          )}

          <button
            onClick={onRegenerate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {t.editor?.regenerate || 'Regenerate'}
          </button>

          <DownloadMenu onDownload={onDownload} t={t} colorScheme={colorScheme} />

          <button
            onClick={onClose}
            title={t.editor?.exitFullscreen || 'Exit fullscreen (Esc)'}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Minimize2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Textarea */}
      <div className="flex-1 p-6 overflow-hidden">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full h-full p-4 text-sm text-slate-800 font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 ${ringColor} focus:border-transparent resize-none`}
          placeholder={t.editor?.editMinutesPlaceholder || 'Edit the generated content here...'}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Pencil className="w-3 h-3" />
          {t.editor?.editableHint || 'Editable'}
        </div>
        <div className="text-xs text-slate-400">
          {t.editor?.pressEscToExit || 'Press Esc to exit fullscreen'}
        </div>
      </div>
    </div>
  );
}
