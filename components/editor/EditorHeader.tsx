'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, Download, Trash2, CheckCircle, Keyboard, ChevronLeft, ChevronRight } from 'lucide-react';
import { SavedTranscription, deleteTranscription, TranscriptionEditorState } from '@/lib/transcriptionStorage';
import { useTranslations } from '@/contexts/TranslationsContext';
import KeyboardShortcutsModal from './KeyboardShortcutsModal';
import BulkApprovalMenu from './BulkApprovalMenu';

interface EditorHeaderProps {
  transcription: SavedTranscription;
  editorState: TranscriptionEditorState;
  totalSegments: number;
  approvedCount: number;
  onFinalize: () => void;
  onExport: () => void;
  onApproveAll: () => void;
  onUnapproveAll: () => void;
  onNextUnapproved: () => void;
  onPrevUnapproved: () => void;
  hasUnapproved: boolean;
}

export default function EditorHeader({
  transcription, editorState, totalSegments, approvedCount,
  onFinalize, onExport, onApproveAll, onUnapproveAll, onNextUnapproved, onPrevUnapproved, hasUnapproved,
}: EditorHeaderProps) {
  const { t, lang } = useTranslations();
  const router = useRouter();
  const [showShortcuts, setShowShortcuts] = useState(false);

  const handleDelete = async () => {
    if (window.confirm(t.libraryDetail?.confirmDelete || 'Are you sure you want to delete this transcription?')) {
      await deleteTranscription(transcription.id);
      router.push(`/${lang}/library`);
    }
  };

  const progressPercentage = totalSegments > 0 ? (approvedCount / totalSegments) * 100 : 0;
  const allApproved = approvedCount === totalSegments && totalSegments > 0;

  return (
    <div className="bg-white border-b border-slate-200 shrink-0">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-3">
        {/* Row 1: Back Button + File Info + Primary Actions */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 mb-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <Link href={`/${lang}/library`} className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors shrink-0">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{t.libraryDetail?.backToLibrary || 'Back to Library'}</span>
            </Link>

            <div className="text-sm text-slate-600 truncate min-w-0">
              <span className="font-medium truncate block sm:inline">{transcription.fileName}</span>
              {transcription.metadata?.model && (
                <span className="hidden sm:inline ml-2 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                  {transcription.metadata.model}
                </span>
              )}
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <div className="relative">
              <button onClick={() => setShowShortcuts(!showShortcuts)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title={t.editor?.keyboardShortcuts || 'Keyboard Shortcuts'}>
                <Keyboard className="w-4 h-4" />
              </button>
              <KeyboardShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
            </div>

            {allApproved && editorState.isDraft && (
              <button onClick={onFinalize} className="p-2 sm:px-3 sm:py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                <span className="hidden sm:inline">{t.editor?.finalizeTranscription || 'Finalize'}</span>
              </button>
            )}

            <button onClick={onExport} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title={t.editor?.export || 'Export'}>
              <Download className="w-4 h-4" />
            </button>

            <button onClick={handleDelete} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title={t.libraryDetail?.delete || 'Delete'}>
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Row 2: Status Badge + Progress */}
        <div className="flex items-center gap-2 sm:gap-3 mb-2">
          {editorState.isDraft ? (
            <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wide shrink-0">
              {t.editor?.draft || 'Draft'}
            </span>
          ) : (
            <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-green-100 border border-green-300 text-green-800 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wide flex items-center gap-1 shrink-0">
              <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              {t.editor?.finalized || 'Finalized'}
            </span>
          )}

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="text-xs text-slate-600 shrink-0">
              <span className="font-bold text-blue-600 text-sm">{approvedCount}</span>
              <span className="text-slate-500">/{totalSegments}</span>
              <span className="text-slate-500 ml-1 hidden sm:inline">{t.editor?.segmentsApproved || 'segments approved'}</span>
            </div>

            <div className="h-1.5 sm:h-2 flex-1 max-w-[100px] sm:max-w-xs bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }} />
            </div>
          </div>
        </div>

        {/* Row 3: Navigation + Bulk Actions (only when draft) */}
        {editorState.isDraft && (
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
            {/* Navigation Controls for Unapproved Segments */}
            {hasUnapproved ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">
                  {t.editor?.navigateUnapproved || 'Navigate:'}
                </span>
                <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
                  <button
                    onClick={onPrevUnapproved}
                    className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-white rounded-md transition-colors"
                    title={t.editor?.prevUnapproved || 'Previous unapproved (P)'}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-slate-500 px-1">
                    {t.editor?.unapproved || 'Unapproved'}
                  </span>
                  <button
                    onClick={onNextUnapproved}
                    className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-white rounded-md transition-colors"
                    title={t.editor?.nextUnapproved || 'Next unapproved (N)'}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-xs text-green-600 font-medium">
                {t.editor?.allApproved || 'All segments approved'}
              </div>
            )}

            {/* Bulk Approval Menu */}
            <BulkApprovalMenu
              totalSegments={totalSegments}
              approvedCount={approvedCount}
              onApproveAll={onApproveAll}
              onUnapproveAll={onUnapproveAll}
            />
          </div>
        )}
      </div>
    </div>
  );
}
