import { useState, useEffect } from 'react';
import { getAdjacentTranscriptionIds } from '@/lib/transcriptionStorage';

interface UseSegmentNavigationReturn {
  previousId: string | null;
  nextId: string | null;
  isLoading: boolean;
}

export function useSegmentNavigation(transcriptionId: string): UseSegmentNavigationReturn {
  const [previousId, setPreviousId] = useState<string | null>(null);
  const [nextId, setNextId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadNavigation = async () => {
      setIsLoading(true);
      const { prevId, nextId } = await getAdjacentTranscriptionIds(transcriptionId);
      setPreviousId(prevId);
      setNextId(nextId);
      setIsLoading(false);
    };
    loadNavigation();
  }, [transcriptionId]);

  return { previousId, nextId, isLoading };
}
