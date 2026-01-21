import React, { useState, useEffect } from 'react';
import { History, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { TranscriptionCard } from './TranscriptionCard';
import { SavedTranscription, getSavedTranscriptions, deleteTranscription, clearAllTranscriptions } from '@/lib/storage';

export const TranscriptionHistory: React.FC = () => {
  const [transcriptions, setTranscriptions] = useState<SavedTranscription[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadTranscriptions();
  }, []);

  const loadTranscriptions = () => {
    const saved = getSavedTranscriptions();
    setTranscriptions(saved);
  };

  const handleDelete = (id: string) => {
    deleteTranscription(id);
    loadTranscriptions();
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to delete all saved transcriptions?')) {
      clearAllTranscriptions();
      loadTranscriptions();
    }
  };

  if (transcriptions.length === 0) {
    return null;
  }

  const displayedTranscriptions = isExpanded ? transcriptions : transcriptions.slice(0, 3);

  return (
    <div className="w-full max-w-7xl mx-auto mt-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
            <History className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Recent Transcriptions</h2>
            <p className="text-sm text-slate-500">{transcriptions.length} saved {transcriptions.length === 1 ? 'transcription' : 'transcriptions'}</p>
          </div>
        </div>
        <button
          onClick={handleClearAll}
          className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Clear All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedTranscriptions.map((transcription) => (
          <TranscriptionCard
            key={transcription.id}
            transcription={transcription}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {transcriptions.length > 3 && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-6 py-3 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center gap-2"
          >
            {isExpanded ? (
              <>
                Show less <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                Show {transcriptions.length - 3} more <ChevronDown className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
