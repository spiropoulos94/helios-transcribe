/**
 * IndexedDB wrapper for storing and retrieving transcriptions
 * Replaces localStorage to avoid quota limits with large transcriptions
 */

import { StructuredTranscription } from './ai/types';

const DB_NAME = 'grecho-transcription-storage';
const DB_VERSION = 1;
const STORE_NAME = 'transcriptions';

/**
 * Segment approval status for editor workflow
 */
export interface SegmentApproval {
  segmentIndex: number;
  approved: boolean;
  editedText?: string;
  editedAt?: number;
}

/**
 * Speaker label mapping for the labeling workflow stage
 */
export interface SpeakerLabel {
  originalId: string; // "Speaker A", "Speaker B"
  customName: string; // "John Smith", "Dr. Jane Doe"
  labeledAt?: number; // Timestamp when labeled
}

/**
 * Transcription editor state for segment approval workflow
 */
export interface TranscriptionEditorState {
  approvals: SegmentApproval[];
  isDraft: boolean;
  finalizedAt?: number;
  audioFileId?: string;
  audioFileName?: string;
  audioDuration?: number;
  speakerLabels?: SpeakerLabel[];
}

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
    structuredData?: StructuredTranscription;
    rawJson?: string;
    editorState?: TranscriptionEditorState;
  };
}

/**
 * Lightweight transcription item for list views (excludes heavy data)
 */
export interface TranscriptionListItem {
  id: string;
  fileName: string;
  timestamp: number;
  provider?: string;
  preview: string; // First 200 chars of text
  metadata?: {
    wordCount?: number;
    model?: string;
    audioDurationSeconds?: number;
    processingTimeMs?: number;
    error?: string;
    pricing?: {
      model10min: string;
      model30min: string;
      model1hr: string;
      bestFor: string;
    };
  };
}

/**
 * Initialize IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB not available on server'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        // Create index on timestamp for sorting
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Generate unique ID for transcription
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Get all saved transcriptions from IndexedDB
 */
export async function getSavedTranscriptions(): Promise<SavedTranscription[]> {
  if (typeof window === 'undefined') return [];

  try {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        // Sort by timestamp descending (newest first)
        const results = request.result || [];
        results.sort((a, b) => b.timestamp - a.timestamp);
        resolve(results);
      };
      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('[TranscriptionStorage] Error reading transcriptions:', error);
    return [];
  }
}

/**
 * Get paginated list of transcriptions with lightweight metadata only
 * Uses cursor-based pagination for efficient large dataset handling
 */
export async function getTranscriptionList(
  cursor?: number,
  limit: number = 20
): Promise<{ items: TranscriptionListItem[]; nextCursor: number | null; total: number }> {
  if (typeof window === 'undefined') return { items: [], nextCursor: null, total: 0 };

  try {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');

      const items: TranscriptionListItem[] = [];

      // Get total count first
      const countRequest = store.count();
      let total = 0;

      countRequest.onsuccess = () => {
        total = countRequest.result;

        // Use cursor with descending order (newest first)
        const range = cursor ? IDBKeyRange.upperBound(cursor, true) : null;
        const cursorRequest = index.openCursor(range, 'prev');

        cursorRequest.onsuccess = (event) => {
          const cursorResult = (event.target as IDBRequest<IDBCursorWithValue>).result;

          if (cursorResult && items.length < limit) {
            const full = cursorResult.value as SavedTranscription;

            // Convert to lightweight list item
            items.push({
              id: full.id,
              fileName: full.fileName,
              timestamp: full.timestamp,
              provider: full.provider,
              preview: full.text.slice(0, 200),
              metadata: {
                wordCount: full.metadata?.wordCount,
                model: full.metadata?.model,
                audioDurationSeconds: full.metadata?.audioDurationSeconds,
                processingTimeMs: full.metadata?.processingTimeMs,
                error: full.metadata?.error,
                pricing: full.metadata?.pricing,
              },
            });
            cursorResult.continue();
          } else {
            const nextCursor = items.length === limit ? items[items.length - 1].timestamp : null;
            resolve({ items, nextCursor, total });
          }
        };

        cursorRequest.onerror = () => reject(cursorRequest.error);
      };

      countRequest.onerror = () => reject(countRequest.error);
      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('[TranscriptionStorage] Error fetching transcription list:', error);
    return { items: [], nextCursor: null, total: 0 };
  }
}

/**
 * Save a new transcription to IndexedDB
 */
export async function saveTranscription(
  text: string,
  fileName: string,
  provider?: string,
  metadata?: SavedTranscription['metadata']
): Promise<SavedTranscription> {
  const transcription: SavedTranscription = {
    id: generateId(),
    text,
    fileName,
    timestamp: Date.now(),
    provider,
    metadata,
  };

  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(transcription);

    request.onsuccess = () => {
      console.log('[TranscriptionStorage] Saved transcription:', transcription.id);
      resolve(transcription);
    };
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Delete a transcription by ID
 */
export async function deleteTranscription(id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      console.log('[TranscriptionStorage] Deleted transcription:', id);
      resolve();
    };
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get a single transcription by ID
 */
export async function getTranscriptionById(id: string): Promise<SavedTranscription | null> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Clear all transcriptions
 */
export async function clearAllTranscriptions(): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      console.log('[TranscriptionStorage] Cleared all transcriptions');
      resolve();
    };
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Save multiple transcriptions from multi-model processing
 */
export async function saveMultiModelTranscriptions(
  results: Array<{
    model: string;
    text: string;
    fileName: string;
    metadata: any;
    provider: string;
    success: boolean;
  }>
): Promise<SavedTranscription[]> {
  const uploadGroupId = generateId();
  const timestamp = Date.now();
  const savedTranscriptions: SavedTranscription[] = [];

  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

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
      store.put(transcription);
    }

    transaction.oncomplete = () => {
      console.log(`[TranscriptionStorage] Saved ${savedTranscriptions.length} transcriptions`);
      db.close();
      resolve(savedTranscriptions);
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

/**
 * Update transcription editor state
 */
export async function updateTranscriptionEditorState(
  id: string,
  editorState: TranscriptionEditorState
): Promise<void> {
  const transcription = await getTranscriptionById(id);
  if (!transcription) {
    console.warn('[TranscriptionStorage] Transcription not found:', id);
    return;
  }

  const updated: SavedTranscription = {
    ...transcription,
    metadata: {
      ...transcription.metadata,
      editorState,
    },
  };

  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(updated);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Migrate data from localStorage to IndexedDB (one-time migration)
 */
export async function migrateFromLocalStorage(): Promise<number> {
  if (typeof window === 'undefined') return 0;

  const LEGACY_STORAGE_KEY = 'grecho_transcriptions';

  try {
    const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacyData) return 0;

    const legacyTranscriptions: SavedTranscription[] = JSON.parse(legacyData);
    if (!Array.isArray(legacyTranscriptions) || legacyTranscriptions.length === 0) return 0;

    console.log(`[TranscriptionStorage] Migrating ${legacyTranscriptions.length} transcriptions from localStorage`);

    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      for (const transcription of legacyTranscriptions) {
        store.put(transcription);
      }

      transaction.oncomplete = () => {
        db.close();
        // Clear localStorage after successful migration
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        console.log(`[TranscriptionStorage] Migration complete, cleared localStorage`);
        resolve(legacyTranscriptions.length);
      };

      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error('[TranscriptionStorage] Migration failed:', error);
    return 0;
  }
}
