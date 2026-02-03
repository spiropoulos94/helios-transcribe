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
 * Hook for handling keyboard shortcuts in the transcription editor.
 *
 * Provides vim-style keyboard navigation and quick actions for efficient
 * transcription review workflow. Automatically disables shortcuts when
 * the user is typing in an input field (except for Escape).
 *
 * Keyboard Shortcuts:
 * - A: Toggle approve on selected/highlighted segment
 * - E: Enter edit mode on selected/highlighted segment
 * - J / ArrowDown: Select next segment
 * - K / ArrowUp: Select previous segment
 * - Space: Play/pause audio playback
 * - Escape: Cancel editing / clear selection
 *
 * @param config - Configuration object with callback handlers
 * @param config.onApprove - Called when A is pressed
 * @param config.onEdit - Called when E is pressed
 * @param config.onNextSegment - Called when J or ArrowDown is pressed
 * @param config.onPrevSegment - Called when K or ArrowUp is pressed
 * @param config.onPlayPause - Called when Space is pressed
 * @param config.onEscape - Called when Escape is pressed
 * @param config.enabled - Whether shortcuts are active (default: true)
 *
 * @example
 * useEditorKeyboardShortcuts({
 *   onApprove: () => handleApprove(selectedIndex),
 *   onEdit: () => setIsEditing(true),
 *   onNextSegment: () => setSelectedIndex(prev => prev + 1),
 *   onPrevSegment: () => setSelectedIndex(prev => prev - 1),
 *   onPlayPause: () => audioRef.current?.paused ? play() : pause(),
 *   onEscape: () => setSelectedIndex(null),
 *   enabled: !isModalOpen,
 * });
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

      // Check if user is typing in an input field
      const target = e.target as HTMLElement;
      const isTyping = target instanceof HTMLInputElement ||
                       target instanceof HTMLTextAreaElement ||
                       target.isContentEditable;

      // Allow Escape even when typing (to cancel editing)
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
          // Toggle approve (ignore if modifier keys are pressed)
          if (!e.metaKey && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            onApprove();
          }
          break;

        case 'e':
        case 'E':
          // Enter edit mode (ignore if modifier keys are pressed)
          if (!e.metaKey && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            onEdit();
          }
          break;

        case 'j':
        case 'ArrowDown':
          // Navigate to next segment
          e.preventDefault();
          onNextSegment();
          break;

        case 'k':
        case 'ArrowUp':
          // Navigate to previous segment
          e.preventDefault();
          onPrevSegment();
          break;

        case ' ':
          // Toggle audio playback
          e.preventDefault();
          onPlayPause();
          break;

        case 'Escape':
          // Clear selection or cancel editing
          e.preventDefault();
          onEscape();
          break;
      }
    },
    [enabled, onApprove, onEdit, onNextSegment, onPrevSegment, onPlayPause, onEscape]
  );

  // Register keyboard event listener
  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
}
