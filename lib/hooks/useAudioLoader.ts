import { useState, useEffect } from 'react';
import { getAudioFile } from '@/lib/audioStorage';

interface UseAudioLoaderReturn {
  audioUrl: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for loading audio files from IndexedDB.
 *
 * Retrieves the audio blob from IndexedDB by its ID and creates an object URL
 * for use with the HTML audio element. Handles cleanup of the object URL
 * when the component unmounts or the audioFileId changes.
 *
 * @param audioFileId - The ID of the audio file stored in IndexedDB
 * @returns Object containing audioUrl, loading state, and error message
 *
 * @example
 * const { audioUrl, isLoading, error } = useAudioLoader(transcription.audioFileId);
 * // Use audioUrl as src for <audio> element
 */
export function useAudioLoader(audioFileId?: string): UseAudioLoaderReturn {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Skip loading if no audio file ID provided
    if (!audioFileId) {
      setIsLoading(false);
      return;
    }

    let objectUrl: string | null = null;

    const loadAudio = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch audio blob from IndexedDB
        const blob = await getAudioFile(audioFileId);

        if (!blob) {
          setError('Audio file not found');
          setIsLoading(false);
          return;
        }

        // Create object URL for the audio element
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

    // Cleanup: revoke object URL to free memory
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [audioFileId]);

  return { audioUrl, isLoading, error };
}
