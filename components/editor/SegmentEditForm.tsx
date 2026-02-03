import { useRef, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { useTranslations } from '@/contexts/TranslationsContext';

interface SegmentEditFormProps {
  editedText: string;
  onTextChange: (text: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function SegmentEditForm({
  editedText,
  onTextChange,
  onSave,
  onCancel,
}: SegmentEditFormProps) {
  const { t } = useTranslations();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.focus();
      textAreaRef.current.select();
    }
  }, []);

  return (
    <div className="space-y-3">
      <textarea
        ref={textAreaRef}
        value={editedText}
        onChange={(e) => onTextChange(e.target.value)}
        className="w-full px-3 py-2 border border-yellow-300 rounded-lg text-sm sm:text-base text-slate-700 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400"
        rows={3}
        style={{ minHeight: '80px' }}
      />
      <div className="flex items-center gap-2">
        <button
          onClick={onSave}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium"
        >
          <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          {t.editor?.save || t.common?.save || 'Save'}
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-xs sm:text-sm font-medium"
        >
          <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          {t.editor?.cancel || t.common?.cancel || 'Cancel'}
        </button>
      </div>
    </div>
  );
}
