import { useEffect, useCallback } from 'react';

interface KeyboardShortcutsConfig {
  onEdit: () => void;
  onNextSegment: () => void;
  onPrevSegment: () => void;
  onPlayPause: () => void;
  onEscape: () => void;
  onSearch: () => void;
  enabled?: boolean;
}

/**
 * Hook for handling keyboard shortcuts in the transcription editor.
 *
 * Keyboard Shortcuts:
 * - E: Enter edit mode on selected segment
 * - J / ArrowDown: Next segment
 * - K / ArrowUp: Previous segment
 * - Space: Play/pause audio
 * - / or Ctrl+F: Open search
 * - Escape: Cancel editing / close search
 */
export function useEditorKeyboardShortcuts({
  onEdit,
  onNextSegment,
  onPrevSegment,
  onPlayPause,
  onSearch,
  onEscape,
  enabled = true,
}: KeyboardShortcutsConfig) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      const target = e.target as HTMLElement;
      const isTyping = target instanceof HTMLInputElement ||
                       target instanceof HTMLTextAreaElement ||
                       target.isContentEditable;

      if (isTyping) {
        if (e.key === 'Escape') {
          e.preventDefault();
          onEscape();
        }
        return;
      }

      switch (e.key) {
        case 'e':
        case 'E':
          if (!e.metaKey && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            onEdit();
          }
          break;

        case 'j':
        case 'ArrowDown':
          e.preventDefault();
          onNextSegment();
          break;

        case 'k':
        case 'ArrowUp':
          e.preventDefault();
          onPrevSegment();
          break;

        case ' ':
          e.preventDefault();
          onPlayPause();
          break;

        case '/':
          if (!e.metaKey && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            onSearch();
          }
          break;

        case 'f':
        case 'F':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            onSearch();
          }
          break;

        case 'Escape':
          e.preventDefault();
          onEscape();
          break;
      }
    },
    [enabled, onEdit, onNextSegment, onPrevSegment, onPlayPause, onSearch, onEscape]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
}
