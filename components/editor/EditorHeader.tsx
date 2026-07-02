'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, Trash2, Keyboard } from 'lucide-react';
import { SavedTranscription, deleteTranscription, TranscriptionEditorState } from '@/lib/transcriptionStorage';
import { useTranslations } from '@/contexts/TranslationsContext';
import { localePath } from '@/i18n/config';
import KeyboardShortcutsModal from './KeyboardShortcutsModal';
import ExportMenu from './ExportMenu';
import ConfirmDialog from '@/components/ConfirmDialog';

interface EditorHeaderProps {
  transcription: SavedTranscription;
  editorState: TranscriptionEditorState;
  labeledCount: number;
  totalSpeakers: number;
  onExportPlainText: () => void;
  onExportOfficialMinutes: () => void;
  onExportPressRelease: () => void;
}

function formatRelativeTime(timestamp: number | undefined, t: ReturnType<typeof useTranslations>['t']): string | null {
  if (!timestamp) return null;
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return t.common?.justNow || 'Just now';
  if (minutes < 60) return `${minutes}${t.common?.minAgo || 'm ago'}`;
  if (hours < 24) return `${hours}${t.common?.hourAgo || 'h ago'}`;
  return `${days}${t.common?.dayAgo || 'd ago'}`;
}

export default function EditorHeader({
  transcription, editorState, labeledCount, totalSpeakers,
  onExportPlainText, onExportOfficialMinutes, onExportPressRelease,
}: EditorHeaderProps) {
  const { t, lang } = useTranslations();
  const router = useRouter();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const confirmDelete = async () => {
    await deleteTranscription(transcription.id);
    router.push(localePath('/library', lang));
  };

  const lastEditedLabel = formatRelativeTime(editorState.lastEditedAt, t);

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
      <div className="bg-white border-b border-slate-200 shrink-0">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-3">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <Link href={localePath('/library', lang)} className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors shrink-0">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{t.libraryDetail?.backToLibrary || 'Back to Library'}</span>
            </Link>

            <div className="flex items-center gap-2 sm:gap-3 text-sm text-slate-600 min-w-0">
              <span className="font-medium truncate">{transcription.fileName}</span>
              {lastEditedLabel && (
                <span className="text-xs text-slate-400 hidden sm:inline shrink-0">
                  · {t.editor?.lastEdited || 'Edited'} {lastEditedLabel}
                </span>
              )}
              {totalSpeakers > 0 && (
                <span className="text-xs text-slate-500 hidden md:inline shrink-0">
                  · <span className="font-medium text-purple-600">{labeledCount}</span>/{totalSpeakers} {t.editor?.speakers || 'speakers'}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <div className="relative">
              <button onClick={() => setShowShortcuts(!showShortcuts)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title={t.editor?.keyboardShortcuts || 'Keyboard Shortcuts'}>
                <Keyboard className="w-4 h-4" />
              </button>
              <KeyboardShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
            </div>

            <ExportMenu
              onExportPlainText={onExportPlainText}
              onExportOfficialMinutes={onExportOfficialMinutes}
              onExportPressRelease={onExportPressRelease}
            />

            <button onClick={() => setShowDeleteDialog(true)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title={t.libraryDetail?.delete || 'Delete'}>
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
