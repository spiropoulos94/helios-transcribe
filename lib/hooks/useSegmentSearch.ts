import { useState, useCallback, useMemo, useRef } from 'react';
import { TranscriptionSegment } from '@/lib/ai/types';
import { SegmentApproval } from '@/lib/transcriptionStorage';

export interface SearchMatch {
  segmentIndex: number;
  matchStart: number;
  matchEnd: number;
}

export interface SearchMatchEvent extends SearchMatch {
  id: number; // Unique ID to ensure navigation works between matches in the same segment
}

interface UseSegmentSearchReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  matches: SearchMatch[];
  currentMatchIndex: number;
  currentMatch: SearchMatchEvent | null;
  matchCount: number;
  goToNextMatch: () => void;
  goToPrevMatch: () => void;
  goToMatch: (index: number) => void;
}

/**
 * Hook for searching through transcription segments.
 *
 * Provides search functionality that works with virtualized lists by
 * searching through the segment data (not DOM) and returning matching
 * segment indices that can be scrolled to.
 *
 * Features:
 * - Case-insensitive search
 * - Searches through both original and edited text
 * - Navigate between matches with next/prev
 * - Wraps around when reaching end/beginning
 *
 * @param segments - Array of transcription segments
 * @param approvals - Array of segment approvals (for edited text)
 * @returns Search state and navigation functions
 */
export function useSegmentSearch(
  segments: TranscriptionSegment[],
  approvals: SegmentApproval[]
): UseSegmentSearchReturn {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const matchIdRef = useRef(0);

  // Find all matches
  const matches = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    const results: SearchMatch[] = [];

    segments.forEach((segment, index) => {
      // Get the text to search (prefer edited text if available)
      const text = (approvals[index]?.editedText || segment.text).toLowerCase();

      // Find all occurrences in this segment
      let position = 0;
      while (position < text.length) {
        const matchStart = text.indexOf(query, position);
        if (matchStart === -1) break;

        results.push({
          segmentIndex: index,
          matchStart,
          matchEnd: matchStart + query.length,
        });
        position = matchStart + 1;
      }
    });

    return results;
  }, [segments, approvals, searchQuery]);

  // Current match with unique ID for navigation
  const [matchEventId, setMatchEventId] = useState(0);
  const currentMatch: SearchMatchEvent | null = matches.length > 0
    ? { ...matches[currentMatchIndex], id: matchEventId }
    : null;
  const matchCount = matches.length;

  // Reset match index when query changes
  const handleSetSearchQuery = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentMatchIndex(0);
    matchIdRef.current += 1;
    setMatchEventId(matchIdRef.current);
  }, []);

  // Open search
  const openSearch = useCallback(() => {
    setIsSearchOpen(true);
  }, []);

  // Close search and reset
  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setCurrentMatchIndex(0);
  }, []);

  // Navigate to next match (wraps around)
  const goToNextMatch = useCallback(() => {
    if (matches.length === 0) return;
    setCurrentMatchIndex((prev) => (prev + 1) % matches.length);
    matchIdRef.current += 1;
    setMatchEventId(matchIdRef.current);
  }, [matches.length]);

  // Navigate to previous match (wraps around)
  const goToPrevMatch = useCallback(() => {
    if (matches.length === 0) return;
    setCurrentMatchIndex((prev) => (prev - 1 + matches.length) % matches.length);
    matchIdRef.current += 1;
    setMatchEventId(matchIdRef.current);
  }, [matches.length]);

  // Navigate to specific match
  const goToMatch = useCallback((index: number) => {
    if (index >= 0 && index < matches.length) {
      setCurrentMatchIndex(index);
      matchIdRef.current += 1;
      setMatchEventId(matchIdRef.current);
    }
  }, [matches.length]);

  return {
    searchQuery,
    setSearchQuery: handleSetSearchQuery,
    isSearchOpen,
    openSearch,
    closeSearch,
    matches,
    currentMatchIndex,
    currentMatch,
    matchCount,
    goToNextMatch,
    goToPrevMatch,
    goToMatch,
  };
}
