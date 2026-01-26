'use client';

import { useState } from 'react';
import Link from 'next/link';
import { InputSection } from '@/components/InputSection';
import { TranscriptView } from '@/components/TranscriptView';
import { AppStatus, TranscriptionResult, UploadConfig } from '@/types';
import { saveMultiModelTranscriptions } from '@/lib/storage';
import { Loader2, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { type Locale } from '@/i18n/config';

interface TranscribePageProps {
  translations: any;
  lang: Locale;
}

export default function TranscribePage({ translations, lang }: TranscribePageProps) {
  const t = translations;
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

        // Save all transcriptions with multi-model support
        saveMultiModelTranscriptions(data.results);
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

        setResults(data.results);
        setStatus(AppStatus.COMPLETED);

        // Save all transcriptions with multi-model support
        saveMultiModelTranscriptions(data.results);
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
    setResults(null);
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
              {t.hero.title} <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">{t.hero.titleHighlight}</span>
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              {t.hero.subtitle}
            </p>
          </div>
        )}

        {/* State Management */}
        {status === AppStatus.IDLE && (
          <InputSection
            onStartProcessing={handleStartProcessing}
            isProcessing={false}
            translations={t.inputSection}
          />
        )}

        {status === AppStatus.PROCESSING && (
          <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in duration-300">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
              <div className="relative bg-white p-4 rounded-full shadow-xl shadow-blue-500/20 border border-blue-100">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              </div>
            </div>
            <h3 className="mt-8 text-xl font-semibold text-slate-900">{t.processing.title}</h3>
            <p className="text-slate-500 mt-2 max-w-md text-center">
              {t.processing.subtitle}
            </p>
          </div>
        )}

        {status === AppStatus.ERROR && (
          <div className="w-full max-w-md mx-auto bg-red-50 border border-red-200 rounded-xl p-6 text-center animate-in fade-in slide-in-from-bottom-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-red-900 mb-2">{t.error.title}</h3>
            <p className="text-sm text-red-700 mb-6">{errorMsg}</p>
            <button
              onClick={resetApp}
              className="px-6 py-2 bg-white border border-red-200 text-red-700 font-medium rounded-lg hover:bg-red-50 transition-colors"
            >
              {t.error.button}
            </button>
          </div>
        )}

        {status === AppStatus.COMPLETED && results && (
          <div className="w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-full max-w-4xl space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                {t.completed.title} - {results.filter(r => r.success).length} {t.completed.modelsSucceeded} {results.length} {t.completed.modelsSucceededSuffix}
              </h2>

              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-6 rounded-xl shadow-lg border-2 transition-all ${
                    result.success
                      ? 'bg-white border-green-200 hover:border-green-300'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-slate-900">
                          {result.model}
                        </h3>
                        {result.success ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      {result.metadata?.pricing && (
                        <div className="text-sm text-slate-600">
                          <p className="font-medium">
                            <span className="text-purple-600">{result.metadata.pricing.model10min}</span> per 10 min • <span className="text-purple-600">{result.metadata.pricing.model30min}</span> per 30 min • <span className="text-purple-600">{result.metadata.pricing.model1hr}</span> per 1 hr
                          </p>
                          <p className="text-blue-600 font-medium mt-1">
                            {result.metadata.pricing.bestFor}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {result.success ? (
                    <div className="mt-4">
                      <div className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg p-4 max-h-96 overflow-y-auto border border-slate-200">
                        {result.text.length > 500 ? `${result.text.substring(0, 500)}...` : result.text}
                      </div>
                      {result.metadata?.wordCount && (
                        <p className="mt-3 text-xs text-slate-500">
                          {result.metadata.wordCount} {t.completed.words}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 p-4 bg-red-100 rounded-lg border border-red-300">
                      <p className="text-red-700 font-medium text-sm">
                        {t.completed.error}: {result.metadata?.error || t.completed.unknownError}
                      </p>
                    </div>
                  )}

                  {result.metadata?.processingTimeMs && (
                    <p className="mt-4 text-xs text-slate-500">
                      {t.completed.processedIn} {(result.metadata.processingTimeMs / 1000).toFixed(2)}s
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 flex items-center gap-4">
              <button
                onClick={resetApp}
                className="text-slate-500 hover:text-slate-800 font-medium text-sm border-b border-transparent hover:border-slate-300 transition-all"
              >
                {t.completed.transcribeAnother}
              </button>
              <span className="text-slate-300">•</span>
              <Link
                href={`/${lang}/library`}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm border-b border-transparent hover:border-blue-300 transition-all"
              >
                {t.completed.viewAll}
              </Link>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
