import { useState, useEffect } from 'react';
import { SavedTranscription, getTranscriptionById, getAdjacentTranscriptionIds } from '@/lib/transcriptionStorage';

interface UseTranscriptionDetailReturn {
  transcription: SavedTranscription | null;
  previousId: string | null;
  nextId: string | null;
  isLoading: boolean;
}

export function useTranscriptionDetail(id: string): UseTranscriptionDetailReturn {
  const [transcription, setTranscription] = useState<SavedTranscription | null>(null);
  const [previousId, setPreviousId] = useState<string | null>(null);
  const [nextId, setNextId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (id) {
        const [data, adjacentIds] = await Promise.all([
          getTranscriptionById(id),
          getAdjacentTranscriptionIds(id)
        ]);

        setTranscription(data);
        setPreviousId(adjacentIds.prevId);
        setNextId(adjacentIds.nextId);
        setIsLoading(false);
      }
    };
    loadData();
  }, [id]);

  return { transcription, previousId, nextId, isLoading };
}
