import { useState, useEffect, useCallback } from 'react';
import {
  SavedTranscription,
  TranscriptionEditorState,
  SegmentApproval,
  updateTranscriptionEditorState,
} from '@/lib/transcriptionStorage';

/**
 * Initializes editor state from a saved transcription.
 * If the transcription already has editor state saved, it uses that.
 * Otherwise, creates a new state with all segments unapproved.
 */
function initializeEditorState(transcription: SavedTranscription): TranscriptionEditorState {
  if (transcription.metadata?.editorState) {
    return transcription.metadata.editorState;
  }

  const segments = transcription.metadata?.structuredData?.segments || [];

  return {
    approvals: segments.map((_, index) => ({
      segmentIndex: index,
      approved: false,
    })),
    isDraft: true,
    audioFileId: transcription.metadata?.editorState?.audioFileId,
    audioFileName: transcription.fileName,
    audioDuration: transcription.metadata?.audioDurationSeconds,
  };
}

interface UseEditorStateReturn {
  editorState: TranscriptionEditorState;
  handleApprove: (segmentIndex: number) => void;
  handleUnapprove: (segmentIndex: number) => void;
  handleEdit: (segmentIndex: number, newText: string) => void;
  handleFinalize: () => void;
  approvedCount: number;
}

/**
 * Hook for managing the transcription editor state.
 *
 * Handles segment approvals, text edits, and finalization status.
 * Automatically persists changes to IndexedDB with debouncing (500ms delay).
 *
 * Features:
 * - Approve/unapprove individual segments
 * - Edit segment text with timestamp tracking
 * - Finalize transcription when all segments are approved
 * - Auto-save to IndexedDB (debounced)
 *
 * @param transcription - The saved transcription to edit
 * @param onFinalizeSuccess - Optional callback when finalization succeeds
 * @returns Editor state and handler functions
 *
 * @example
 * const { editorState, handleApprove, handleEdit, approvedCount } = useEditorState(transcription);
 * // approvedCount tracks how many segments have been approved
 */
export function useEditorState(
  transcription: SavedTranscription,
  onFinalizeSuccess?: () => void
): UseEditorStateReturn {
  const [editorState, setEditorState] = useState<TranscriptionEditorState>(() =>
    initializeEditorState(transcription)
  );

  // Auto-save editor state to IndexedDB with 500ms debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateTranscriptionEditorState(transcription.id, editorState).catch(console.error);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [editorState, transcription.id]);

  // Mark a segment as approved
  const handleApprove = useCallback((segmentIndex: number) => {
    setEditorState((prev) => ({
      ...prev,
      approvals: prev.approvals.map((a, i) =>
        i === segmentIndex ? { ...a, approved: true } : a
      ),
    }));
  }, []);

  // Remove approval from a segment
  const handleUnapprove = useCallback((segmentIndex: number) => {
    setEditorState((prev) => ({
      ...prev,
      approvals: prev.approvals.map((a, i) =>
        i === segmentIndex ? { ...a, approved: false } : a
      ),
    }));
  }, []);

  // Update segment text with edit timestamp
  const handleEdit = useCallback((segmentIndex: number, newText: string) => {
    setEditorState((prev) => ({
      ...prev,
      approvals: prev.approvals.map((a, i) =>
        i === segmentIndex
          ? { ...a, editedText: newText, editedAt: Date.now() }
          : a
      ),
    }));
  }, []);

  // Mark transcription as finalized (no longer a draft)
  const handleFinalize = useCallback(() => {
    setEditorState((prev) => ({
      ...prev,
      isDraft: false,
      finalizedAt: Date.now(),
    }));
    onFinalizeSuccess?.();
  }, [onFinalizeSuccess]);

  const approvedCount = editorState.approvals.filter((a) => a.approved).length;

  return {
    editorState,
    handleApprove,
    handleUnapprove,
    handleEdit,
    handleFinalize,
    approvedCount,
  };
}
