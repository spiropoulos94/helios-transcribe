import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  SavedTranscription,
  TranscriptionEditorState,
  SpeakerLabel,
  updateTranscriptionEditorState,
} from '@/lib/transcriptionStorage';
import { TranscriptionSegment } from '@/lib/ai/types';

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
  setEditorState: React.Dispatch<React.SetStateAction<TranscriptionEditorState>>;
  handleApprove: (segmentIndex: number) => void;
  handleUnapprove: (segmentIndex: number) => void;
  handleApproveAll: () => void;
  handleUnapproveAll: () => void;
  handleEdit: (segmentIndex: number, newText: string) => void;
  handleFinalize: () => void;
  handleRevertToDraft: () => void;
  approvedCount: number;
  getNextUnapprovedIndex: (fromIndex?: number) => number | null;
  getPrevUnapprovedIndex: (fromIndex?: number) => number | null;
  // Speaker label management
  speakerLabels: SpeakerLabel[];
  handleLabelSpeaker: (originalId: string, customName: string) => void;
  getSpeakerDisplayName: (originalId: string) => string;
  uniqueSpeakers: string[];
  labeledCount: number;
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
 * @param segments - The transcription segments (for computing unique speakers)
 * @param onFinalizeSuccess - Optional callback when finalization succeeds
 * @returns Editor state and handler functions
 *
 * @example
 * const { editorState, handleApprove, handleEdit, approvedCount } = useEditorState(transcription, segments);
 * // approvedCount tracks how many segments have been approved
 */
export function useEditorState(
  transcription: SavedTranscription,
  segments: TranscriptionSegment[],
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

  // Remove approval from a segment (reverts to draft if finalized)
  const handleUnapprove = useCallback((segmentIndex: number) => {
    setEditorState((prev) => ({
      ...prev,
      isDraft: true, // Revert to draft when any segment is unapproved
      approvals: prev.approvals.map((a, i) =>
        i === segmentIndex ? { ...a, approved: false } : a
      ),
    }));
  }, []);

  // Mark all segments as approved
  const handleApproveAll = useCallback(() => {
    setEditorState((prev) => ({
      ...prev,
      approvals: prev.approvals.map((a) => ({ ...a, approved: true })),
    }));
  }, []);

  // Remove approval from all segments (reverts to draft if finalized)
  const handleUnapproveAll = useCallback(() => {
    setEditorState((prev) => ({
      ...prev,
      isDraft: true, // Revert to draft when segments are unapproved
      approvals: prev.approvals.map((a) => ({ ...a, approved: false })),
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

  // Revert finalized transcription back to draft for further editing
  const handleRevertToDraft = useCallback(() => {
    setEditorState((prev) => ({
      ...prev,
      isDraft: true,
      finalizedAt: undefined,
    }));
  }, []);

  const approvedCount = editorState.approvals.filter((a) => a.approved).length;

  // Compute unique speakers from segments
  const uniqueSpeakers = useMemo(() => {
    const speakers: string[] = [];
    for (const segment of segments) {
      if (!speakers.includes(segment.speaker)) {
        speakers.push(segment.speaker);
      }
    }
    return speakers;
  }, [segments]);

  // Speaker labels from state
  const speakerLabels = editorState.speakerLabels || [];

  // Count labeled speakers
  const labeledCount = useMemo(() => {
    return speakerLabels.filter(
      (l) =>
        l.customName &&
        l.customName.trim() !== '' &&
        uniqueSpeakers.includes(l.originalId) &&
        l.customName !== l.originalId
    ).length;
  }, [speakerLabels, uniqueSpeakers]);

  // Label a speaker with a custom name
  const handleLabelSpeaker = useCallback(
    (originalId: string, customName: string) => {
      setEditorState((prev) => {
        const existingLabels = prev.speakerLabels || [];
        const existingIndex = existingLabels.findIndex((l) => l.originalId === originalId);

        let newLabels: SpeakerLabel[];
        if (customName.trim() === '') {
          // Clear the label
          newLabels = existingLabels.filter((l) => l.originalId !== originalId);
        } else if (existingIndex >= 0) {
          // Update existing label
          newLabels = existingLabels.map((l, i) =>
            i === existingIndex ? { ...l, customName, labeledAt: Date.now() } : l
          );
        } else {
          // Add new label
          newLabels = [...existingLabels, { originalId, customName, labeledAt: Date.now() }];
        }

        return { ...prev, speakerLabels: newLabels };
      });
    },
    [setEditorState]
  );

  // Get display name for a speaker (custom name or original ID)
  const getSpeakerDisplayName = useCallback(
    (originalId: string): string => {
      const label = speakerLabels.find((l) => l.originalId === originalId);
      return label?.customName && label.customName.trim() !== ''
        ? label.customName
        : originalId;
    },
    [speakerLabels]
  );

  // Get the next unapproved segment index (searching forward from fromIndex)
  const getNextUnapprovedIndex = useCallback((fromIndex?: number): number | null => {
    const startIndex = fromIndex !== undefined ? fromIndex + 1 : 0;
    for (let i = startIndex; i < editorState.approvals.length; i++) {
      if (!editorState.approvals[i]?.approved) {
        return i;
      }
    }
    // Wrap around to beginning if not found
    for (let i = 0; i < startIndex; i++) {
      if (!editorState.approvals[i]?.approved) {
        return i;
      }
    }
    return null;
  }, [editorState.approvals]);

  // Get the previous unapproved segment index (searching backward from fromIndex)
  const getPrevUnapprovedIndex = useCallback((fromIndex?: number): number | null => {
    const startIndex = fromIndex !== undefined ? fromIndex - 1 : editorState.approvals.length - 1;
    for (let i = startIndex; i >= 0; i--) {
      if (!editorState.approvals[i]?.approved) {
        return i;
      }
    }
    // Wrap around to end if not found
    for (let i = editorState.approvals.length - 1; i > startIndex; i--) {
      if (!editorState.approvals[i]?.approved) {
        return i;
      }
    }
    return null;
  }, [editorState.approvals]);

  return {
    editorState,
    setEditorState,
    handleApprove,
    handleUnapprove,
    handleApproveAll,
    handleUnapproveAll,
    handleEdit,
    handleFinalize,
    handleRevertToDraft,
    approvedCount,
    getNextUnapprovedIndex,
    getPrevUnapprovedIndex,
    // Speaker label management
    speakerLabels,
    handleLabelSpeaker,
    getSpeakerDisplayName,
    uniqueSpeakers,
    labeledCount,
  };
}
