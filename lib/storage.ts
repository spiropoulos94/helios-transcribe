/**
 * Saved transcription with metadata
 */
export interface SavedTranscription {
  id: string;
  text: string;
  fileName: string;
  timestamp: number;
  provider?: string;
  metadata?: {
    wordCount?: number;
    duration?: string;
    model?: string;
    processingTimeMs?: number;
    audioDurationSeconds?: number;
    uploadGroupId?: string;
    error?: string;
    pricing?: {
      model10min: string;
      model30min: string;
      model1hr: string;
      bestFor: string;
    };
  };
}

const STORAGE_KEY = 'helios_transcriptions';

/**
 * Get all saved transcriptions from localStorage
 */
export function getSavedTranscriptions(): SavedTranscription[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading transcriptions from localStorage:', error);
    return [];
  }
}

/**
 * Save a new transcription to localStorage
 */
export function saveTranscription(
  text: string,
  fileName: string,
  provider?: string,
  metadata?: SavedTranscription['metadata']
): SavedTranscription {
  const transcription: SavedTranscription = {
    id: generateId(),
    text,
    fileName,
    timestamp: Date.now(),
    provider,
    metadata,
  };

  const transcriptions = getSavedTranscriptions();
  transcriptions.unshift(transcription); // Add to beginning

  // Keep only last 50 transcriptions
  const trimmed = transcriptions.slice(0, 50);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Error saving transcription to localStorage:', error);
  }

  return transcription;
}

/**
 * Delete a transcription by ID
 */
export function deleteTranscription(id: string): void {
  const transcriptions = getSavedTranscriptions();
  const filtered = transcriptions.filter((t) => t.id !== id);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting transcription from localStorage:', error);
  }
}

/**
 * Get a single transcription by ID
 */
export function getTranscriptionById(id: string): SavedTranscription | null {
  const transcriptions = getSavedTranscriptions();
  return transcriptions.find((t) => t.id === id) || null;
}

/**
 * Clear all transcriptions
 */
export function clearAllTranscriptions(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing transcriptions from localStorage:', error);
  }
}

/**
 * Save multiple transcriptions from multi-model processing
 * Links them together with a shared uploadGroupId
 */
export function saveMultiModelTranscriptions(
  results: Array<{
    model: string;
    text: string;
    fileName: string;
    metadata: any;
    provider: string;
    success: boolean;
  }>
): SavedTranscription[] {
  const uploadGroupId = generateId();
  const timestamp = Date.now();
  const savedTranscriptions: SavedTranscription[] = [];

  // Get existing transcriptions
  const transcriptions = getSavedTranscriptions();

  // Create transcription for each result
  for (const result of results) {
    const transcription: SavedTranscription = {
      id: generateId(),
      text: result.text,
      fileName: result.fileName,
      timestamp,
      provider: result.provider,
      metadata: {
        ...result.metadata,
        uploadGroupId,
      },
    };

    savedTranscriptions.push(transcription);
    transcriptions.unshift(transcription);
  }

  // Keep only last 50 transcriptions
  const trimmed = transcriptions.slice(0, 50);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Error saving transcriptions to localStorage:', error);
  }

  return savedTranscriptions;
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
