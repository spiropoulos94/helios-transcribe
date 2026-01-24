export enum AppStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export interface TranscriptionResult {
  text: string;
  model?: string;
  fileName?: string;
  provider?: string;
  success?: boolean;
  metadata?: {
    duration?: string;
    wordCount?: number;
    processingTimeMs?: number;
    audioDurationSeconds?: number;
    error?: string;
    pricing?: {
      model10min: string;
      model30min: string;
      model1hr: string;
      bestFor: string;
    };
  };
}

export interface UploadConfig {
  file: File | null;
  youtubeUrl: string;
  mode: 'file' | 'url';
}
