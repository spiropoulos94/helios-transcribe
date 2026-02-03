import { useState, useEffect } from 'react';
import { getAudioFile } from '@/lib/audioStorage';

interface UseAudioLoaderReturn {
  audioUrl: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useAudioLoader(audioFileId?: string): UseAudioLoaderReturn {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!audioFileId) {
      setIsLoading(false);
      return;
    }

    let objectUrl: string | null = null;

    const loadAudio = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const blob = await getAudioFile(audioFileId);

        if (!blob) {
          setError('Audio file not found');
          setIsLoading(false);
          return;
        }

        objectUrl = URL.createObjectURL(blob);
        setAudioUrl(objectUrl);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading audio:', err);
        setError('Failed to load audio file');
        setIsLoading(false);
      }
    };

    loadAudio();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [audioFileId]);

  return { audioUrl, isLoading, error };
}
