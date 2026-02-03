import { useState, useCallback } from 'react';

interface UseFileDownloadReturn {
  isLoading: boolean;
  downloadTextFile: (text: string, fileName: string) => void;
}

/**
 * Hook for downloading text content as a file.
 *
 * Creates a downloadable text file from string content. Handles the creation
 * of a blob, object URL, and programmatic click to trigger the download.
 * Automatically appends "_transcript.txt" to the filename.
 *
 * @returns Object with loading state and download function
 *
 * @example
 * const { downloadTextFile, isLoading } = useFileDownload();
 *
 * // Download transcription text
 * downloadTextFile(transcription.text, transcription.fileName);
 * // Downloads as "filename_transcript.txt"
 */
export function useFileDownload(): UseFileDownloadReturn {
  const [isLoading, setIsLoading] = useState(false);

  const downloadTextFile = useCallback((text: string, fileName: string) => {
    setIsLoading(true);
    try {
      // Create blob from text content
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);

      // Create temporary link element and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName.replace(/\.[^/.]+$/, '')}_transcript.txt`;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, downloadTextFile };
}
