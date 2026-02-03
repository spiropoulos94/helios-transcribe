'use client';

import { useState, useEffect, useCallback } from 'react';
import { History, Trash2, FileText, Loader2 } from 'lucide-react';
import { TranscriptionCard } from '@/components/TranscriptionCard';
import {
  TranscriptionListItem,
  getTranscriptionList,
  deleteTranscription,
  clearAllTranscriptions,
  migrateFromLocalStorage
} from '@/lib/transcriptionStorage';
import Link from 'next/link';
import { useTranslations } from '@/contexts/TranslationsContext';

const PAGE_SIZE = 20;

export default function LibraryPageClient() {
  const { t, lang } = useTranslations();
  const [transcriptions, setTranscriptions] = useState<TranscriptionListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    initializeAndLoad();
  }, []);

  const initializeAndLoad = async () => {
    setIsLoading(true);
    await migrateFromLocalStorage();
    await loadTranscriptions();
  };

  const loadTranscriptions = async () => {
    setIsLoading(true);
    const result = await getTranscriptionList(undefined, PAGE_SIZE);
    setTranscriptions(result.items);
    setNextCursor(result.nextCursor);
    setTotal(result.total);
    setIsLoading(false);
  };

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    const result = await getTranscriptionList(nextCursor, PAGE_SIZE);
    setTranscriptions(prev => [...prev, ...result.items]);
    setNextCursor(result.nextCursor);
    setIsLoadingMore(false);
  }, [nextCursor, isLoadingMore]);

  const handleDelete = async (id: string) => {
    await deleteTranscription(id);
    setTranscriptions(prev => prev.filter(item => item.id !== id));
    setTotal(prev => prev - 1);
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to delete all saved transcriptions? This action cannot be undone.')) {
      await clearAllTranscriptions();
      setTranscriptions([]);
      setNextCursor(null);
      setTotal(0);
    }
  };

  const hasMore = nextCursor !== null;

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 flex flex-col">
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Page Header */}
        <div className="flex items-center justify-between mb-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
              <History className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{t.library.title}</h1>
              <p className="text-sm text-slate-500 mt-1">
                {isLoading ? 'Loading...' : `${total} saved ${total === 1 ? 'transcription' : 'transcriptions'}`}
              </p>
            </div>
          </div>

          {transcriptions.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">{t.library.delete}</span>
            </button>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-20">
            <div className="text-slate-400">Loading transcriptions...</div>
          </div>
        ) : transcriptions.length === 0 ? (
          <div className="text-center py-20 animate-in fade-in slide-in-from-bottom-4">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">{t.library.empty.title}</h2>
            <p className="text-slate-600 mb-8 max-w-md mx-auto">
              {t.library.empty.subtitle}
            </p>
            <Link
              href={`/${lang}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all"
            >
              {t.library.empty.button}
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4">
              {transcriptions.map((transcription) => (
                <TranscriptionCard
                  key={transcription.id}
                  transcription={transcription}
                  onDelete={handleDelete}
                />
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="px-6 py-3 bg-white border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Load more ({total - transcriptions.length} remaining)
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}

      </main>
    </div>
  );
}
