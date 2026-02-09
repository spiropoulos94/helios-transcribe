import React, { useState } from 'react';
import Link from 'next/link';
import { FileText, Download, Trash2, ArrowRight } from 'lucide-react';
import { TranscriptionListItem, getTranscriptionById } from '@/lib/transcriptionStorage';
import { useFileDownload } from '@/lib/hooks/useFileDownload';
import { useTranslations } from '@/contexts/TranslationsContext';
import MetadataBadges from './shared/MetadataBadges';
import ConfirmDialog from './ConfirmDialog';

interface TranscriptionCardProps {
  transcription: TranscriptionListItem;
  onDelete: (id: string) => void;
}

export const TranscriptionCard: React.FC<TranscriptionCardProps> = ({ transcription, onDelete }) => {
  const { t, lang } = useTranslations();
  const [fullText, setFullText] = useState<string | null>(null);
  const [isLoadingFull, setIsLoadingFull] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { downloadTextFile } = useFileDownload();

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    let text = fullText;
    if (!text) {
      setIsLoadingFull(true);
      try {
        const full = await getTranscriptionById(transcription.id);
        if (full) {
          text = full.text;
          setFullText(text);
        }
      } finally {
        setIsLoadingFull(false);
      }
    }
    if (text) downloadTextFile(text, transcription.fileName);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    onDelete(transcription.id);
    setShowDeleteDialog(false);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t.common?.justNow || 'Just now';
    if (diffMins < 60) return `${diffMins}${t.common?.minAgo || 'm ago'}`;
    if (diffHours < 24) return `${diffHours}${t.common?.hourAgo || 'h ago'}`;
    if (diffDays < 7) return `${diffDays}${t.common?.dayAgo || 'd ago'}`;

    return date.toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-US', {
      month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <>
      <ConfirmDialog
        isOpen={showDeleteDialog}
        title={t.common?.delete || 'Delete'}
        message={t.libraryDetail?.confirmDelete || 'Are you sure you want to delete this transcription?'}
        confirmLabel={t.common?.delete || 'Delete'}
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />
      <Link href={`/${lang}/library/${transcription.id}`} className="block group">
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md border border-slate-200 transition-all duration-200 group-hover:border-blue-300">
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">{transcription.fileName}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{formatDate(transcription.timestamp)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={handleDownload} disabled={isLoadingFull} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50" title={t.common?.download || 'Download'}>
                  <Download className="w-4 h-4" />
                </button>
                <button onClick={handleDeleteClick} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title={t.common?.delete || 'Delete'}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <MetadataBadges metadata={transcription.metadata} />

            {transcription.metadata?.error && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                Error: {transcription.metadata.error}
              </div>
            )}
          </div>

          <div className="p-4">
            <div className="text-sm text-slate-600 leading-relaxed line-clamp-3">
              {transcription.preview.length > 150 ? `${transcription.preview.slice(0, 150)}...` : transcription.preview}
            </div>
            <div className="flex items-center justify-end mt-3">
              <div className="text-xs font-medium text-blue-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {t.common?.viewDetails || 'View details'} <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </>
  );
};
