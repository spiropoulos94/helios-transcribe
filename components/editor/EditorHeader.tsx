'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Trash2, CheckCircle } from 'lucide-react';
import { SavedTranscription, deleteTranscription, TranscriptionEditorState } from '@/lib/transcriptionStorage';
import { type Locale } from '@/i18n/config';

interface EditorHeaderProps {
  transcription: SavedTranscription;
  editorState: TranscriptionEditorState;
  totalSegments: number;
  approvedCount: number;
  lang: Locale;
  translations: any;
  previousId: string | null;
  nextId: string | null;
  onFinalize: () => void;
  onExport: () => void;
}

export default function EditorHeader({
  transcription,
  editorState,
  totalSegments,
  approvedCount,
  lang,
  translations: t,
  previousId,
  nextId,
  onFinalize,
  onExport,
}: EditorHeaderProps) {
  const router = useRouter();

  const handleDelete = async () => {
    if (window.confirm(t.libraryDetail?.confirmDelete || 'Are you sure you want to delete this transcription?')) {
      await deleteTranscription(transcription.id);
      router.push(`/${lang}/library`);
    }
  };

  const progressPercentage = totalSegments > 0 ? (approvedCount / totalSegments) * 100 : 0;
  const allApproved = approvedCount === totalSegments && totalSegments > 0;

  return (
    <>
      {/* Main Header - Sticky below navbar */}
      <div className="bg-white border-b border-slate-200 sticky top-[66px] z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          {/* Row 1: Back Button + File Info + Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Link
                href={`/${lang}/library`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">{t.libraryDetail?.backToLibrary || 'Back to Library'}</span>
              </Link>

              <div className="text-sm text-slate-600 truncate">
                <span className="font-medium">{transcription.fileName}</span>
                {transcription.metadata?.model && (
                  <span className="ml-2 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                    {transcription.metadata.model}
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {allApproved && editorState.isDraft && (
                <button
                  onClick={onFinalize}
                  className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">{t.editor?.finalizeTranscription || 'Finalize'}</span>
                </button>
              )}

              <button
                onClick={onExport}
                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title={t.editor?.export || 'Export'}
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                onClick={handleDelete}
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title={t.libraryDetail?.delete || 'Delete'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Row 2: Status Badge + Progress */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Draft/Finalized Badge */}
            {editorState.isDraft ? (
              <span className="px-2.5 py-1 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-full text-xs font-bold uppercase tracking-wide">
                {t.editor?.draft || 'Draft'}
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-green-100 border border-green-300 text-green-800 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                {t.editor?.finalized || 'Finalized'}
              </span>
            )}

            {/* Progress Indicator */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="text-xs text-slate-600 shrink-0">
                <span className="font-bold text-blue-600 text-sm">{approvedCount}</span>
                <span className="text-slate-500"> / {totalSegments}</span>
                <span className="text-slate-500 ml-1 hidden sm:inline">{t.editor?.segmentsApproved || 'segments approved'}</span>
              </div>

              {/* Progress Bar */}
              <div className="h-2 flex-1 max-w-xs bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-500 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Previous/Next Navigation */}
      <div className="fixed bottom-6 left-0 right-0 z-30 pointer-events-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between">
          {/* Previous Button - Bottom Left */}
          {previousId ? (
            <Link
              href={`/${lang}/library/${previousId}`}
              className="pointer-events-auto inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-white bg-slate-700 hover:bg-slate-800 rounded-full transition-all shadow-lg hover:shadow-xl hover:scale-105"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>{t.libraryDetail?.previous || 'Previous'}</span>
            </Link>
          ) : (
            <div></div>
          )}

          {/* Next Button - Bottom Right */}
          {nextId ? (
            <Link
              href={`/${lang}/library/${nextId}`}
              className="pointer-events-auto inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-white bg-slate-700 hover:bg-slate-800 rounded-full transition-all shadow-lg hover:shadow-xl hover:scale-105"
            >
              <span>{t.libraryDetail?.next || 'Next'}</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <div></div>
          )}
        </div>
      </div>
    </>
  );
}
