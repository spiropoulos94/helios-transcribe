/**
 * Shared types for export dialog components
 */

import { DownloadFormat } from '@/lib/export/downloadFormats';
import { getTranscriptionSummary } from '@/lib/export/formatTranscriptionForMinutes';

/**
 * Common translations type used across export dialogs
 */
export type ExportTranslations = Record<string, Record<string, string> | undefined>;

/**
 * Props for generate/preview step components
 */
export interface GenerateStepBaseProps {
  summary: ReturnType<typeof getTranscriptionSummary>;
  isTooLong: boolean;
  canGenerate: boolean;
  onGenerate: () => void;
  onRegenerate: () => void;
  onDownload: (format: DownloadFormat) => void;
  onUpdateMarkdown: (markdown: string) => void;
  t: ExportTranslations;
  fileName: string;
}

/**
 * Common state for generation steps
 */
export interface GenerationState {
  isGenerating: boolean;
  generatedMarkdown: string | null;
  error: string | null;
}
