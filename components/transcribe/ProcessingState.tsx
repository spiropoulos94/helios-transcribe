import { Loader2 } from 'lucide-react';
import { useTranslations } from '@/contexts/TranslationsContext';

export default function ProcessingState() {
  const { t } = useTranslations();

  return (
    <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in duration-300">
      <div className="relative">
        <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
        <div className="relative bg-white p-4 rounded-full shadow-xl shadow-blue-500/20 border border-blue-100">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        </div>
      </div>
      <h3 className="mt-8 text-xl font-semibold text-slate-900">{t.transcribe.processing.title}</h3>
      <p className="text-slate-500 mt-2 max-w-md text-center">{t.transcribe.processing.subtitle}</p>
    </div>
  );
}
