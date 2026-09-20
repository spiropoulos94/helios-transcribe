'use client';

import { useState, useRef, useEffect } from 'react';
import { Sparkles, ChevronDown, ListChecks, Newspaper, Podcast, Scissors } from 'lucide-react';
import { useTranslations } from '@/contexts/TranslationsContext';

interface AiToolsMenuProps {
  onSummary: () => void;
  onArticle: () => void;
  onShowNotes: () => void;
  onClips: () => void;
  disabled?: boolean;
}

export default function AiToolsMenu({
  onSummary,
  onArticle,
  onShowNotes,
  onClips,
  disabled = false,
}: AiToolsMenuProps) {
  const { t } = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleSelect = (handler: () => void) => {
    handler();
    setIsOpen(false);
  };

  if (disabled) return null;

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 bg-linear-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 text-white font-medium rounded-lg shadow-md shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-200 flex items-center gap-1.5"
        title={t.editor?.aiTools || 'AI'}
      >
        <Sparkles className="w-4 h-4" />
        <span className="text-sm">{t.editor?.aiTools || 'AI'}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden min-w-[280px]">
          <div className="py-1">
            {/* Summary */}
            <button
              onClick={() => handleSelect(onSummary)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-emerald-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <ListChecks className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-slate-900">
                  {t.editor?.aiSummaryTitle || 'Summary & Quotes'}
                </div>
                <div className="text-xs text-slate-500">
                  {t.editor?.aiSummaryDesc || 'A TL;DR and suggested pull-quotes'}
                </div>
              </div>
            </button>

            <div className="border-t border-slate-100 my-1" />

            {/* Article */}
            <button
              onClick={() => handleSelect(onArticle)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-blue-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Newspaper className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-slate-900">
                  {t.editor?.aiArticleTitle || 'Article Draft'}
                </div>
                <div className="text-xs text-slate-500">
                  {t.editor?.aiArticleDesc || 'A journalistic article draft to fact-check'}
                </div>
              </div>
            </button>

            <div className="border-t border-slate-100 my-1" />

            {/* Show Notes */}
            <button
              onClick={() => handleSelect(onShowNotes)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-purple-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <Podcast className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-slate-900">
                  {t.editor?.aiShowNotesTitle || 'Show Notes'}
                </div>
                <div className="text-xs text-slate-500">
                  {t.editor?.aiShowNotesDesc || 'Podcast show notes with chapters'}
                </div>
              </div>
            </button>

            <div className="border-t border-slate-100 my-1" />

            {/* Clips */}
            <button
              onClick={() => handleSelect(onClips)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-amber-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                <Scissors className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-slate-900">
                  {t.editor?.aiClipsTitle || 'Clip Suggestions'}
                </div>
                <div className="text-xs text-slate-500">
                  {t.editor?.aiClipsDesc || 'Short-video clip ideas for reels/shorts'}
                </div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
