'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, ScrollText, FileText, Trash2 } from 'lucide-react';
import { downloadInFormat, DownloadFormat } from '@/lib/export/downloadFormats';
import { useTranslations } from '@/contexts/TranslationsContext';
import {
  OfficialMinutesFormState,
  createInitialFormState,
  extractMetadataFromFormState,
  resolveSegmentsForExport,
  saveFormStateToStorage,
  loadFormStateFromStorage,
} from '@/lib/export/types';
import { getTranscriptionSummary, isTranscriptionTooLong } from '@/lib/export/formatTranscriptionForMinutes';
import { saveUserDefaults } from '@/lib/export/userDefaults';
import { TranscriptionSegment } from '@/lib/ai/types';
import { SegmentEdit, SpeakerLabel } from '@/lib/transcriptionStorage';
import { ConfirmDialog } from './export';
import { OfficialMinutesBasicInfo, OfficialMinutesAttendees, OfficialMinutesGenerate } from './export/official-minutes';

interface OfficialMinutesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  segments: TranscriptionSegment[];
  edits: SegmentEdit[];
  speakerLabels: SpeakerLabel[];
  getSpeakerDisplayName: (id: string) => string;
  fileName: string;
  transcriptionId: string;
}

export default function OfficialMinutesDialog({
  isOpen,
  onClose,
  segments,
  edits,
  speakerLabels,
  getSpeakerDisplayName,
  fileName,
  transcriptionId,
}: OfficialMinutesDialogProps) {
  const { t } = useTranslations();
  const [formState, setFormState] = useState<OfficialMinutesFormState>(() =>
    createInitialFormState(speakerLabels)
  );
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const updateField = <K extends keyof OfficialMinutesFormState>(
    field: K,
    value: OfficialMinutesFormState[K]
  ) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  const goToStep = (step: 1 | 2) => {
    updateField('currentStep', step);
  };

  const canGenerate = (): boolean => {
    if (formState.municipality.trim() === '' || formState.date.trim() === '') {
      return false;
    }
    if (formState.president.trim() === '' || formState.secretary.trim() === '') {
      return false;
    }
    return true;
  };

  const handleClearForm = () => {
    const initialState = createInitialFormState(speakerLabels);
    setFormState(prev => ({
      ...initialState,
      generatedMarkdown: prev.generatedMarkdown,
      currentStep: prev.generatedMarkdown ? prev.currentStep : 1,
    }));
    setShowClearConfirm(false);
  };

  useEffect(() => {
    if (isOpen) {
      const savedState = loadFormStateFromStorage(transcriptionId);
      if (savedState) {
        setFormState({
          ...savedState,
          currentStep: savedState.generatedMarkdown ? 2 : savedState.currentStep,
        });
      } else {
        setFormState(createInitialFormState(speakerLabels));
      }
    }
  }, [isOpen, speakerLabels, transcriptionId]);

  useEffect(() => {
    if (isOpen) {
      const hasAnyData =
        formState.municipality.trim() !== '' ||
        formState.sessionNumber.trim() !== '' ||
        formState.location.trim() !== '' ||
        formState.startTime.trim() !== '' ||
        formState.endTime.trim() !== '' ||
        formState.mayor.trim() !== '' ||
        formState.president.trim() !== '' ||
        formState.secretary.trim() !== '' ||
        formState.councilors.some(c => c.trim() !== '') ||
        formState.absentees.some(a => a.trim() !== '') ||
        formState.invitees.some(i => i.trim() !== '') ||
        formState.generatedMarkdown !== null;

      if (hasAnyData) {
        saveFormStateToStorage(formState, transcriptionId);
      }
    }
  }, [isOpen, formState, transcriptionId]);

  const handleClose = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    onClose();
  }, [onClose]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !formState.isGenerating) {
        handleClose();
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, handleClose, formState.isGenerating]);

  const handleGenerate = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    updateField('isGenerating', true);
    updateField('error', null);

    try {
      const resolvedSegments = resolveSegmentsForExport(segments, edits, getSpeakerDisplayName);
      const metadata = extractMetadataFromFormState(formState);

      const response = await fetch('/api/export/official-minutes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segments: resolvedSegments, metadata }),
        signal: abortController.signal,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate official minutes');
      }

      updateField('generatedMarkdown', result.markdown);
      saveUserDefaults({
        municipality: formState.municipality,
        location: formState.location,
        mayor: formState.mayor,
        president: formState.president,
        secretary: formState.secretary,
        lastSessionNumber: formState.sessionNumber,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      updateField('error', error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      updateField('isGenerating', false);
      abortControllerRef.current = null;
    }
  }, [segments, edits, getSpeakerDisplayName, formState]);

  const handleDownload = async (format: DownloadFormat) => {
    if (!formState.generatedMarkdown) return;
    const baseFilename = fileName.replace(/\.[^/.]+$/, '') + '_praktika';
    await downloadInFormat(formState.generatedMarkdown, baseFilename, format);
  };

  const handleRegenerateConfirm = useCallback(() => {
    setShowRegenerateConfirm(false);
    updateField('generatedMarkdown', null);
    updateField('error', null);
    handleGenerate();
  }, [handleGenerate]);

  const handleRegenerate = useCallback(() => {
    setShowRegenerateConfirm(true);
  }, []);

  const resolvedSegments = useMemo(
    () => resolveSegmentsForExport(segments, edits, getSpeakerDisplayName),
    [segments, edits, getSpeakerDisplayName]
  );
  const summary = useMemo(() => getTranscriptionSummary(resolvedSegments), [resolvedSegments]);
  const isTooLong = useMemo(() => isTranscriptionTooLong(resolvedSegments), [resolvedSegments]);

  const stepIcons = [
    <FileText key="1" className="w-4 h-4" />,
    <ScrollText key="2" className="w-4 h-4" />,
  ];

  const stepLabels = [
    t.editor?.sessionInfo || 'Session Info',
    t.editor?.generatePreview || 'Generate',
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !formState.isGenerating && handleClose()}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <ScrollText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {t.editor?.officialMinutesTitle || 'Export Official Minutes'}
              </h2>
              <p className="text-sm text-slate-500">
                {t.editor?.officialMinutesDesc || 'Generate formal municipal council minutes'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={formState.isGenerating}
              title={t.editor?.clearForm || 'Clear form'}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleClose}
              disabled={formState.isGenerating}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-center gap-8">
            {[1, 2].map((step) => (
              <div
                key={step}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  formState.currentStep === step
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-slate-400'
                }`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                  formState.currentStep === step
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}>
                  {step}
                </span>
                <span className="flex items-center gap-1.5">
                  {stepIcons[step - 1]}
                  <span className="text-sm font-medium">{stepLabels[step - 1]}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {formState.currentStep === 1 && (
            <div className="space-y-6">
              <OfficialMinutesBasicInfo formState={formState} updateField={updateField} t={t} />
              <div className="border-t border-slate-200" />
              <OfficialMinutesAttendees formState={formState} updateField={updateField} t={t} />
            </div>
          )}
          {formState.currentStep === 2 && (
            <OfficialMinutesGenerate
              formState={formState}
              summary={summary}
              isTooLong={isTooLong}
              canGenerate={canGenerate()}
              onGenerate={handleGenerate}
              onRegenerate={handleRegenerate}
              onDownload={handleDownload}
              onUpdateMarkdown={(markdown) => updateField('generatedMarkdown', markdown)}
              t={t}
            />
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <div className="text-sm text-slate-500">
            {t.editor?.step || 'Step'} {formState.currentStep} {t.editor?.of || 'of'} 2
          </div>
          <div className="flex items-center gap-2">
            {formState.currentStep > 1 && (
              <button
                onClick={() => goToStep((formState.currentStep - 1) as 1 | 2)}
                disabled={formState.isGenerating}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
                {t.editor?.previousStep || 'Previous'}
              </button>
            )}
            {formState.currentStep < 2 && (
              <button
                onClick={() => goToStep(2)}
                disabled={!canGenerate()}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t.editor?.nextStep || 'Next'}
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearForm}
        title={t.editor?.clearFormTitle || 'Clear Form?'}
        message={
          formState.generatedMarkdown
            ? (t.editor?.clearFormConfirmWithContent || 'This will clear all form data and the generated content. This action cannot be undone.')
            : (t.editor?.clearFormConfirm || 'This will clear all form data. This action cannot be undone.')
        }
        confirmLabel={t.editor?.clearFormButton || 'Clear'}
        cancelLabel={t.editor?.cancel || 'Cancel'}
        confirmColorScheme="red"
      />

      <ConfirmDialog
        isOpen={showRegenerateConfirm}
        onClose={() => setShowRegenerateConfirm(false)}
        onConfirm={handleRegenerateConfirm}
        title={t.editor?.regenerateTitle || 'Regenerate Minutes?'}
        message={t.editor?.regenerateConfirm || 'This will discard the current generated content and create new minutes. Any edits you made will be lost.'}
        confirmLabel={t.editor?.regenerate || 'Regenerate'}
        cancelLabel={t.editor?.cancel || 'Cancel'}
        confirmColorScheme="purple"
      />
    </div>
  );
}
