import { useEffect, useCallback } from 'react';

interface KeyboardShortcutsConfig {
  onApprove: () => void;
  onEdit: () => void;
  onNextSegment: () => void;
  onPrevSegment: () => void;
  onPlayPause: () => void;
  onEscape: () => void;
  enabled?: boolean;
}

/**
 * Keyboard shortcuts for the transcription editor
 *
 * Shortcuts:
 * - A: Toggle approve on selected segment
 * - E: Enter edit mode on selected segment
 * - J / ArrowDown: Select next segment
 * - K / ArrowUp: Select previous segment
 * - Space: Play/pause audio
 * - Escape: Cancel editing / clear selection
 */
export function useEditorKeyboardShortcuts({
  onApprove,
  onEdit,
  onNextSegment,
  onPrevSegment,
  onPlayPause,
  onEscape,
  enabled = true,
}: KeyboardShortcutsConfig) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Don't intercept when typing in inputs (except for Escape)
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
        case 'a':
        case 'A':
          if (!e.metaKey && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            onApprove();
          }
          break;

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
          // Only handle space when not in an input
          e.preventDefault();
          onPlayPause();
          break;

        case 'Escape':
          e.preventDefault();
          onEscape();
          break;
      }
    },
    [enabled, onApprove, onEdit, onNextSegment, onPrevSegment, onPlayPause, onEscape]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
}
