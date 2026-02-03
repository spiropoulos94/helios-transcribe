import { useState, useEffect } from 'react';
import { SavedTranscription, getTranscriptionById } from '@/lib/transcriptionStorage';

interface UseTranscriptionDetailReturn {
  transcription: SavedTranscription | null;
  isLoading: boolean;
}

/**
 * Hook for loading a transcription detail page.
 *
 * Fetches the transcription data for use in the library detail view.
 *
 * @param id - The ID of the transcription to load
 * @returns Transcription data and loading state
 *
 * @example
 * const { transcription, isLoading } = useTranscriptionDetail(id);
 *
 * if (isLoading) return <Loading />;
 * if (!transcription) return <NotFound />;
 */
export function useTranscriptionDetail(id: string): UseTranscriptionDetailReturn {
  const [transcription, setTranscription] = useState<SavedTranscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (id) {
        const data = await getTranscriptionById(id);
        setTranscription(data);
        setIsLoading(false);
      }
    };
    loadData();
  }, [id]);

  return { transcription, isLoading };
}
