import { useState, useCallback } from 'react';

interface UseFileDownloadReturn {
  isLoading: boolean;
  downloadTextFile: (text: string, fileName: string) => void;
}

export function useFileDownload(): UseFileDownloadReturn {
  const [isLoading, setIsLoading] = useState(false);

  const downloadTextFile = useCallback((text: string, fileName: string) => {
    setIsLoading(true);
    try {
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName.replace(/\.[^/.]+$/, '')}_transcript.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, downloadTextFile };
}
