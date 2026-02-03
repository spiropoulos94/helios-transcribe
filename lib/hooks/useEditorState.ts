import { useState, useEffect, useCallback } from 'react';
import {
  SavedTranscription,
  TranscriptionEditorState,
  SegmentApproval,
  updateTranscriptionEditorState,
} from '@/lib/transcriptionStorage';

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

export function useEditorState(
  transcription: SavedTranscription,
  onFinalizeSuccess?: () => void
): UseEditorStateReturn {
  const [editorState, setEditorState] = useState<TranscriptionEditorState>(() =>
    initializeEditorState(transcription)
  );

  // Auto-save editor state to IndexedDB (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateTranscriptionEditorState(transcription.id, editorState).catch(console.error);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [editorState, transcription.id]);

  const handleApprove = useCallback((segmentIndex: number) => {
    setEditorState((prev) => ({
      ...prev,
      approvals: prev.approvals.map((a, i) =>
        i === segmentIndex ? { ...a, approved: true } : a
      ),
    }));
  }, []);

  const handleUnapprove = useCallback((segmentIndex: number) => {
    setEditorState((prev) => ({
      ...prev,
      approvals: prev.approvals.map((a, i) =>
        i === segmentIndex ? { ...a, approved: false } : a
      ),
    }));
  }, []);

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
