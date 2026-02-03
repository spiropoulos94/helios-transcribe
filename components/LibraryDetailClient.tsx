'use client';

import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { useTranslations } from '@/contexts/TranslationsContext';
import { useTranscriptionDetail } from '@/lib/hooks/useTranscriptionDetail';
import TranscriptionEditor from './editor/TranscriptionEditor';
import LegacyTranscriptView from './LegacyTranscriptView';

interface LibraryDetailClientProps {
  id: string;
}

export default function LibraryDetailClient({ id }: LibraryDetailClientProps) {
  const { t, lang } = useTranslations();
  const { transcription, previousId, nextId, isLoading } = useTranscriptionDetail(id);

  if (isLoading) {
    return (
      <div className="flex-1 bg-linear-to-br from-slate-50 via-blue-50/30 to-slate-100 flex items-center justify-center">
        <div className="text-slate-600">{t.libraryDetail?.loading}</div>
      </div>
    );
  }

  if (!transcription) {
    return (
      <div className="flex-1 bg-linear-to-br from-slate-50 via-blue-50/30 to-slate-100 flex flex-col">
        <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center">
          <div className="text-center animate-in fade-in slide-in-from-bottom-4">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-3">{t.libraryDetail?.notFoundTitle}</h1>
            <p className="text-slate-600 mb-8 max-w-md mx-auto">{t.libraryDetail?.notFoundDescription}</p>
            <Link
              href={`/${lang}/library`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              {t.libraryDetail?.backToLibrary}
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const hasStructuredData = transcription.metadata?.structuredData?.segments &&
                            transcription.metadata.structuredData.segments.length > 0;

  if (hasStructuredData) {
    return <TranscriptionEditor transcription={transcription} />;
  }

  return (
    <LegacyTranscriptView
      transcription={transcription}
      previousId={previousId}
      nextId={nextId}
    />
  );
}
