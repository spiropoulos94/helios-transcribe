'use client';

import { getTranscriptionSummary } from '@/lib/export/formatTranscriptionForMinutes';
import { ExportTranslations } from './types';

interface TranscriptionSummaryCardProps {
  summary: ReturnType<typeof getTranscriptionSummary>;
  t: ExportTranslations;
}

export default function TranscriptionSummaryCard({ summary, t }: TranscriptionSummaryCardProps) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
      <h4 className="font-medium text-slate-900 mb-2">
        {t.editor?.transcriptionSummary || 'Transcription Summary'}
      </h4>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-slate-500">{t.editor?.segments || 'Segments'}:</span>
          <span className="ml-2 font-medium text-slate-900">{summary.segmentCount}</span>
        </div>
        <div>
          <span className="text-slate-500">{t.editor?.speakers || 'Speakers'}:</span>
          <span className="ml-2 font-medium text-slate-900">{summary.speakerCount}</span>
        </div>
        <div>
          <span className="text-slate-500">{t.editor?.characters || 'Characters'}:</span>
          <span className="ml-2 font-medium text-slate-900">{summary.charCount.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-slate-500">{t.editor?.duration || 'Duration'}:</span>
          <span className="ml-2 font-medium text-slate-900">{summary.estimatedDuration}</span>
        </div>
      </div>
    </div>
  );
}
