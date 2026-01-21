'use client';

import { useState } from 'react';
import Link from 'next/link';
import { InputSection } from '@/components/InputSection';
import { TranscriptView } from '@/components/TranscriptView';
import { AppStatus, TranscriptionResult, UploadConfig } from '@/types';
import { saveTranscription } from '@/lib/storage';
import { Loader2, AlertTriangle } from 'lucide-react';

export default function Home() {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
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

        setResult(data);
        setStatus(AppStatus.COMPLETED);

        // Save to localStorage with video title as fileName
        saveTranscription(
          data.text,
          data.fileName || config.youtubeUrl,
          data.metadata?.model?.includes('gemini') ? 'google-gemini' : data.metadata?.model?.includes('whisper') ? 'openai' : undefined,
          data.metadata
        );
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

        setResult(data);
        setStatus(AppStatus.COMPLETED);

        // Save to localStorage
        saveTranscription(
          data.text,
          config.file.name,
          data.metadata?.model?.includes('gemini') ? 'google-gemini' : data.metadata?.model?.includes('whisper') ? 'openai' : undefined,
          data.metadata
        );
      } catch (err: unknown) {
        console.error(err);
        const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
        setErrorMsg(message);
        setStatus(AppStatus.ERROR);
      }
    }
  };

  const resetApp = () => {
    setStatus(AppStatus.IDLE);
    setResult(null);
    setErrorMsg(null);
    setCurrentFileName('');
  };

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 flex flex-col">
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center">

        {/* Intro Text */}
        {status === AppStatus.IDLE && (
          <div className="text-center mb-12 max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
              Turn Video into <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Greek Text</span>
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              Upload your video or audio files and let our AI engine generate accurate, fluent Greek transcriptions in seconds.
            </p>
          </div>
        )}

        {/* State Management */}
        {status === AppStatus.IDLE && (
          <InputSection onStartProcessing={handleStartProcessing} isProcessing={false} />
        )}

        {status === AppStatus.PROCESSING && (
          <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in duration-300">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
              <div className="relative bg-white p-4 rounded-full shadow-xl shadow-blue-500/20 border border-blue-100">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              </div>
            </div>
            <h3 className="mt-8 text-xl font-semibold text-slate-900">Transcribing Media...</h3>
            <p className="text-slate-500 mt-2 max-w-md text-center">
              AI is listening to your audio and translating it to Greek. This may take a moment depending on file size.
            </p>
          </div>
        )}

        {status === AppStatus.ERROR && (
          <div className="w-full max-w-md mx-auto bg-red-50 border border-red-200 rounded-xl p-6 text-center animate-in fade-in slide-in-from-bottom-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-red-900 mb-2">Transcription Failed</h3>
            <p className="text-sm text-red-700 mb-6">{errorMsg}</p>
            <button
              onClick={resetApp}
              className="px-6 py-2 bg-white border border-red-200 text-red-700 font-medium rounded-lg hover:bg-red-50 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {status === AppStatus.COMPLETED && result && (
          <div className="w-full flex flex-col items-center">
            <TranscriptView result={result} />
            <div className="mt-8 flex items-center gap-4">
              <button
                onClick={resetApp}
                className="text-slate-500 hover:text-slate-800 font-medium text-sm border-b border-transparent hover:border-slate-300 transition-all"
              >
                Transcribe another file
              </button>
              <span className="text-slate-300">•</span>
              <Link
                href="/library"
                className="text-blue-600 hover:text-blue-700 font-medium text-sm border-b border-transparent hover:border-blue-300 transition-all"
              >
                View all transcriptions
              </Link>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
