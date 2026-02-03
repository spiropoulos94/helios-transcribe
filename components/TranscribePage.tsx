'use client';

import { InputSection } from '@/components/InputSection';
import { AppStatus } from '@/types';
import { useTranscription } from '@/lib/hooks/useTranscription';
import { useTranslations } from '@/contexts/TranslationsContext';
import ProcessingState from './transcribe/ProcessingState';
import ErrorState from './transcribe/ErrorState';
import ResultsView from './transcribe/ResultsView';

export default function TranscribePage() {
  const { t, lang } = useTranslations();
  const { status, results, errorMsg, handleStartProcessing, resetApp } = useTranscription();

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 flex flex-col">
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center">
        {/* Intro Text */}
        {status === AppStatus.IDLE && (
          <div className="text-center mb-12 max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
              {t.transcribe.hero.title}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
                {t.transcribe.hero.titleHighlight}
              </span>
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">{t.transcribe.hero.subtitle}</p>
          </div>
        )}

        {status === AppStatus.IDLE && (
          <InputSection onStartProcessing={handleStartProcessing} isProcessing={false} />
        )}

        {status === AppStatus.PROCESSING && <ProcessingState />}

        {status === AppStatus.ERROR && <ErrorState errorMsg={errorMsg} onReset={resetApp} />}

        {status === AppStatus.COMPLETED && results && (
          <ResultsView results={results} onReset={resetApp} />
        )}
      </main>
    </div>
  );
}
