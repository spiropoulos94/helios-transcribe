'use client';

import { useState, useEffect } from 'react';
import { History, Trash2, FileText } from 'lucide-react';
import { TranscriptionCard } from '@/components/TranscriptionCard';
import { SavedTranscription, getSavedTranscriptions, deleteTranscription, clearAllTranscriptions } from '@/lib/storage';
import Link from 'next/link';

export default function LibraryPage() {
  const [transcriptions, setTranscriptions] = useState<SavedTranscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTranscriptions();
  }, []);

  const loadTranscriptions = () => {
    setIsLoading(true);
    const saved = getSavedTranscriptions();
    setTranscriptions(saved);
    setIsLoading(false);
  };

  const handleDelete = (id: string) => {
    deleteTranscription(id);
    loadTranscriptions();
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to delete all saved transcriptions? This action cannot be undone.')) {
      clearAllTranscriptions();
      loadTranscriptions();
    }
  };

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
              <h1 className="text-3xl font-bold text-slate-900">Transcription Library</h1>
              <p className="text-sm text-slate-500 mt-1">
                {isLoading ? 'Loading...' : `${transcriptions.length} saved ${transcriptions.length === 1 ? 'transcription' : 'transcriptions'}`}
              </p>
            </div>
          </div>

          {transcriptions.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Clear All</span>
            </button>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-20">
            <div className="text-slate-400">Loading transcriptions...</div>
          </div>
        ) : transcriptions.length === 0 ? (
          // Empty State
          <div className="text-center py-20 animate-in fade-in slide-in-from-bottom-4">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">No Transcriptions Yet</h2>
            <p className="text-slate-600 mb-8 max-w-md mx-auto">
              Start by transcribing your first audio or video file. All your transcriptions will appear here.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all"
            >
              Create Your First Transcription
            </Link>
          </div>
        ) : (
          // Grid of Transcriptions
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4">
            {transcriptions.map((transcription) => (
              <TranscriptionCard
                key={transcription.id}
                transcription={transcription}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
