import { useState, useEffect, useCallback } from 'react';
import { loadHighlights, saveHighlights } from '@/lib/editor/highlights';

/**
 * Manages the set of highlighted segment indices for a transcription.
 * Loads persisted highlights on mount and saves (as a sorted array) on change.
 */
export function useHighlights(transcriptionId: string) {
  const [highlighted, setHighlighted] = useState<Set<number>>(new Set());

  useEffect(() => {
    setHighlighted(new Set(loadHighlights(transcriptionId)));
  }, [transcriptionId]);

  useEffect(() => {
    saveHighlights(transcriptionId, [...highlighted].sort((a, b) => a - b));
  }, [transcriptionId, highlighted]);

  const toggle = useCallback((index: number) => {
    setHighlighted((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  return { highlighted, toggle, count: highlighted.size };
}
