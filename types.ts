export enum AppStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export interface TranscriptionResult {
  text: string;
  metadata?: {
    duration?: string;
    wordCount?: number;
  };
}

export interface UploadConfig {
  file: File | null;
  youtubeUrl: string;
  mode: 'file' | 'url';
}
