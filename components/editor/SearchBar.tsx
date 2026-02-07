'use client';

import { useRef, useEffect } from 'react';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import { useTranslations } from '@/contexts/TranslationsContext';

interface SearchBarProps {
  isOpen: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClose: () => void;
  onNextMatch: () => void;
  onPrevMatch: () => void;
  currentMatchIndex: number;
  matchCount: number;
}

export default function SearchBar({
  isOpen,
  searchQuery,
  onSearchChange,
  onClose,
  onNextMatch,
  onPrevMatch,
  currentMatchIndex,
  matchCount,
}: SearchBarProps) {
  const { t } = useTranslations();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when search opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard navigation within search
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        onPrevMatch();
      } else {
        onNextMatch();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      onNextMatch();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      onPrevMatch();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="bg-white border-b border-slate-200 px-3 sm:px-6 lg:px-8 py-2">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          {/* Search icon */}
          <Search className="w-4 h-4 text-slate-400 shrink-0" />

          {/* Search input */}
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.editor?.searchPlaceholder || 'Search in transcription...'}
            className="flex-1 text-sm bg-transparent border-none outline-none placeholder-slate-400 text-slate-900"
          />

          {/* Match count */}
          {searchQuery && (
            <span className="text-xs text-slate-500 shrink-0">
              {matchCount > 0 ? (
                <>
                  {currentMatchIndex + 1} / {matchCount}
                </>
              ) : (
                t.editor?.noResults || 'No results'
              )}
            </span>
          )}

          {/* Navigation buttons */}
          {matchCount > 0 && (
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={onPrevMatch}
                className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                title={t.editor?.prevMatch || 'Previous match (Shift+Enter)'}
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                onClick={onNextMatch}
                className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                title={t.editor?.nextMatch || 'Next match (Enter)'}
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors shrink-0"
            title={t.editor?.closeSearch || 'Close (Esc)'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Keyboard hints */}
        <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
          <span>
            <kbd className="px-1 py-0.5 bg-slate-100 rounded text-slate-500">Enter</kbd>
            {' '}{t.editor?.nextMatchHint || 'next'}
          </span>
          <span>
            <kbd className="px-1 py-0.5 bg-slate-100 rounded text-slate-500">Shift+Enter</kbd>
            {' '}{t.editor?.prevMatchHint || 'prev'}
          </span>
          <span>
            <kbd className="px-1 py-0.5 bg-slate-100 rounded text-slate-500">Esc</kbd>
            {' '}{t.editor?.closeHint || 'close'}
          </span>
        </div>
      </div>
    </div>
  );
}
