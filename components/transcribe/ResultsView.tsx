import Link from 'next/link';
import { TranscriptionResult } from '@/types';
import { useTranslations } from '@/contexts/TranslationsContext';
import { localePath } from '@/i18n/config';
import ResultCard from './ResultCard';

interface ResultsViewProps {
  results: TranscriptionResult[];
  onReset: () => void;
}

export default function ResultsView({ results, onReset }: ResultsViewProps) {
  const { t, lang } = useTranslations();
  const successCount = results.filter(r => r.success).length;

  return (
    <div className="w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-full max-w-4xl space-y-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">
          {t.transcribe.completed.title} - {successCount} {t.transcribe.completed.modelsSucceeded} {results.length} {t.transcribe.completed.modelsSucceededSuffix}
        </h2>

        {results.map((result, index) => (
          <ResultCard key={index} result={result} />
        ))}
      </div>

      <div className="mt-8 flex items-center gap-4">
        <button
          onClick={onReset}
          className="text-slate-500 hover:text-slate-800 font-medium text-sm border-b border-transparent hover:border-slate-300 transition-all"
        >
          {t.transcribe.completed.transcribeAnother}
        </button>
        <span className="text-slate-300">•</span>
        <Link
          href={localePath('/library', lang)}
          className="text-blue-600 hover:text-blue-700 font-medium text-sm border-b border-transparent hover:border-blue-300 transition-all"
        >
          {t.transcribe.completed.viewAll}
        </Link>
      </div>
    </div>
  );
}
