import { CheckCircle2, XCircle } from 'lucide-react';
import { TranscriptionResult } from '@/types';
import { useTranslations } from '@/contexts/TranslationsContext';

interface ResultCardProps {
  result: TranscriptionResult;
}

export default function ResultCard({ result }: ResultCardProps) {
  const { t } = useTranslations();

  return (
    <div
      className={`p-6 rounded-xl shadow-lg border-2 transition-all ${
        result.success
          ? 'bg-white border-green-200 hover:border-green-300'
          : 'bg-red-50 border-red-200'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {result.success ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
          </div>
          {result.metadata?.pricing && (
            <div className="text-sm text-slate-600">
              <p className="font-medium">
                <span className="text-purple-600">{result.metadata.pricing.model10min}</span> per 10 min •{' '}
                <span className="text-purple-600">{result.metadata.pricing.model30min}</span> per 30 min •{' '}
                <span className="text-purple-600">{result.metadata.pricing.model1hr}</span> per 1 hr
              </p>
              <p className="text-blue-600 font-medium mt-1">{result.metadata.pricing.bestFor}</p>
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
              {result.metadata.wordCount} {t.transcribe.completed.words}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4 p-4 bg-red-100 rounded-lg border border-red-300">
          <p className="text-red-700 font-medium text-sm">
            {t.transcribe.completed.error}: {result.metadata?.error || t.transcribe.completed.unknownError}
          </p>
        </div>
      )}

      {result.metadata?.processingTimeMs && (
        <p className="mt-4 text-xs text-slate-500">
          {t.transcribe.completed.processedIn} {(result.metadata.processingTimeMs / 1000).toFixed(2)}s
        </p>
      )}
    </div>
  );
}
