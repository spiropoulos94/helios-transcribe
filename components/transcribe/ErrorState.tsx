import { AlertTriangle } from 'lucide-react';
import { useTranslations } from '@/contexts/TranslationsContext';

interface ErrorStateProps {
  errorMsg: string | null;
  onReset: () => void;
}

export default function ErrorState({ errorMsg, onReset }: ErrorStateProps) {
  const { t } = useTranslations();

  return (
    <div className="w-full max-w-md mx-auto bg-red-50 border border-red-200 rounded-xl p-6 text-center animate-in fade-in slide-in-from-bottom-4">
      <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-semibold text-red-900 mb-2">{t.transcribe.error.title}</h3>
      <p className="text-sm text-red-700 mb-6">{errorMsg}</p>
      <button
        onClick={onReset}
        className="px-6 py-2 bg-white border border-red-200 text-red-700 font-medium rounded-lg hover:bg-red-50 transition-colors"
      >
        {t.transcribe.error.button}
      </button>
    </div>
  );
}
