import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  SavedTranscription,
  TranscriptionEditorState,
  SegmentEdit,
  SpeakerLabel,
  updateTranscriptionEditorState,
} from '@/lib/transcriptionStorage';
import { TranscriptionSegment } from '@/lib/ai/types';

/**
 * Initializes editor state from a saved transcription.
 * Migrates legacy approval-workflow state (approvals[], isDraft, finalizedAt)
 * to the simplified edit-only state on first read.
 */
function initializeEditorState(transcription: SavedTranscription): TranscriptionEditorState {
  const stored = transcription.metadata?.editorState as
    | (TranscriptionEditorState & { approvals?: Array<SegmentEdit & { approved?: boolean }> })
    | undefined;

  if (stored) {
    const legacyEdits = stored.approvals?.map(({ segmentIndex, editedText, editedAt }) => ({
      segmentIndex,
      editedText,
      editedAt,
    }));
    return {
      edits: stored.edits ?? legacyEdits ?? [],
      lastEditedAt: stored.lastEditedAt,
      audioFileId: stored.audioFileId,
      audioFileName: stored.audioFileName,
      audioDuration: stored.audioDuration,
      speakerLabels: stored.speakerLabels,
    };
  }

  const segments = transcription.metadata?.structuredData?.segments || [];
  return {
    edits: segments.map((_, index) => ({ segmentIndex: index })),
    audioFileName: transcription.fileName,
    audioDuration: transcription.metadata?.audioDurationSeconds,
  };
}

interface UseEditorStateReturn {
  editorState: TranscriptionEditorState;
  setEditorState: React.Dispatch<React.SetStateAction<TranscriptionEditorState>>;
  handleEdit: (segmentIndex: number, newText: string) => void;
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
 * Tracks per-segment edits and speaker labels, auto-persisting to IndexedDB
 * with a 500ms debounce.
 */
export function useEditorState(
  transcription: SavedTranscription,
  segments: TranscriptionSegment[]
): UseEditorStateReturn {
  const [editorState, setEditorState] = useState<TranscriptionEditorState>(() =>
    initializeEditorState(transcription)
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateTranscriptionEditorState(transcription.id, editorState).catch(console.error);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [editorState, transcription.id]);

  const handleEdit = useCallback((segmentIndex: number, newText: string) => {
    const now = Date.now();
    setEditorState((prev) => {
      const existing = prev.edits.find((e) => e.segmentIndex === segmentIndex);
      const nextEdits = existing
        ? prev.edits.map((e) =>
            e.segmentIndex === segmentIndex ? { ...e, editedText: newText, editedAt: now } : e
          )
        : [...prev.edits, { segmentIndex, editedText: newText, editedAt: now }];
      return { ...prev, edits: nextEdits, lastEditedAt: now };
    });
  }, []);

  const uniqueSpeakers = useMemo(() => {
    const speakers: string[] = [];
    for (const segment of segments) {
      if (!speakers.includes(segment.speaker)) {
        speakers.push(segment.speaker);
      }
    }
    return speakers;
  }, [segments]);

  const speakerLabels = editorState.speakerLabels || [];

  const labeledCount = useMemo(() => {
    return speakerLabels.filter(
      (l) =>
        l.customName &&
        l.customName.trim() !== '' &&
        uniqueSpeakers.includes(l.originalId) &&
        l.customName !== l.originalId
    ).length;
  }, [speakerLabels, uniqueSpeakers]);

  const handleLabelSpeaker = useCallback(
    (originalId: string, customName: string) => {
      setEditorState((prev) => {
        const existingLabels = prev.speakerLabels || [];
        const existingIndex = existingLabels.findIndex((l) => l.originalId === originalId);

        let newLabels: SpeakerLabel[];
        if (customName.trim() === '') {
          newLabels = existingLabels.filter((l) => l.originalId !== originalId);
        } else if (existingIndex >= 0) {
          newLabels = existingLabels.map((l, i) =>
            i === existingIndex ? { ...l, customName, labeledAt: Date.now() } : l
          );
        } else {
          newLabels = [...existingLabels, { originalId, customName, labeledAt: Date.now() }];
        }

        return { ...prev, speakerLabels: newLabels };
      });
    },
    []
  );

  const getSpeakerDisplayName = useCallback(
    (originalId: string): string => {
      const label = speakerLabels.find((l) => l.originalId === originalId);
      return label?.customName && label.customName.trim() !== ''
        ? label.customName
        : originalId;
    },
    [speakerLabels]
  );

  return {
    editorState,
    setEditorState,
    handleEdit,
    speakerLabels,
    handleLabelSpeaker,
    getSpeakerDisplayName,
    uniqueSpeakers,
    labeledCount,
  };
}
