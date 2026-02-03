import { useState } from 'react';
import { AppStatus, TranscriptionResult, UploadConfig } from '@/types';
import { saveMultiModelTranscriptions, updateTranscriptionEditorState } from '@/lib/transcriptionStorage';
import { saveAudioFile } from '@/lib/audioStorage';

interface UseTranscriptionReturn {
  status: AppStatus;
  results: TranscriptionResult[] | null;
  errorMsg: string | null;
  currentFileName: string;
  handleStartProcessing: (config: UploadConfig) => Promise<void>;
  resetApp: () => void;
}

/**
 * Hook for managing the transcription workflow.
 *
 * Handles the complete transcription process including:
 * - File upload or YouTube URL processing
 * - API calls to the transcription endpoint
 * - Saving results to IndexedDB
 * - Storing the original audio file for playback in the editor
 * - Error handling and state management
 *
 * Supports two modes:
 * 1. File upload: User uploads an audio/video file
 * 2. YouTube URL: User provides a YouTube video URL (when enabled)
 *
 * @returns Transcription state and handler functions
 *
 * @example
 * const { status, results, handleStartProcessing, resetApp } = useTranscription();
 *
 * // Start transcription
 * await handleStartProcessing({ mode: 'file', file: audioFile });
 *
 * // Reset to initial state
 * resetApp();
 */
export function useTranscription(): UseTranscriptionReturn {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [results, setResults] = useState<TranscriptionResult[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>('');

  const handleStartProcessing = async (config: UploadConfig) => {
    setErrorMsg(null);

    // Handle YouTube URL mode
    if (config.mode === 'url' && config.youtubeUrl) {
      setStatus(AppStatus.PROCESSING);
      setCurrentFileName(config.youtubeUrl);

      try {
        const response = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ youtubeUrl: config.youtubeUrl }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to process YouTube video');
        }

        setResults(data.results);
        setStatus(AppStatus.COMPLETED);
        await saveMultiModelTranscriptions(data.results);
      } catch (err: unknown) {
        console.error('YouTube Processing Error:', err);
        const message = err instanceof Error ? err.message : 'Failed to process YouTube video. Please try again.';
        setErrorMsg(message);
        setStatus(AppStatus.ERROR);
      }
      return;
    }

    // Handle file upload mode
    if (config.mode === 'file' && config.file) {
      setStatus(AppStatus.PROCESSING);
      setCurrentFileName(config.file.name);

      try {
        // Send file to transcription API
        const formData = new FormData();
        formData.append('file', config.file);

        const response = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'An unexpected error occurred.');
        }

        setResults(data.results);
        setStatus(AppStatus.COMPLETED);

        // Save transcription results to IndexedDB
        const savedTranscriptions = await saveMultiModelTranscriptions(data.results);

        // Save audio file to IndexedDB and link it to transcriptions for editor playback
        if (config.file) {
          try {
            const audioFileId = await saveAudioFile(config.file, undefined, config.file.name);

            // Update each transcription with the audio file reference
            for (const transcription of savedTranscriptions) {
              await updateTranscriptionEditorState(transcription.id, {
                approvals: transcription.metadata?.structuredData?.segments.map((_, index) => ({
                  segmentIndex: index,
                  approved: false,
                })) || [],
                isDraft: true,
                audioFileId,
                audioFileName: config.file!.name,
                audioDuration: transcription.metadata?.audioDurationSeconds,
              });
            }
          } catch (err) {
            console.error('Failed to save audio file:', err);
          }
        }
      } catch (err: unknown) {
        console.error(err);
        const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
        setErrorMsg(message);
        setStatus(AppStatus.ERROR);
      }
    }
  };

  // Reset app to initial idle state
  const resetApp = () => {
    setStatus(AppStatus.IDLE);
    setResults(null);
    setErrorMsg(null);
    setCurrentFileName('');
  };

  return {
    status,
    results,
    errorMsg,
    currentFileName,
    handleStartProcessing,
    resetApp,
  };
}
