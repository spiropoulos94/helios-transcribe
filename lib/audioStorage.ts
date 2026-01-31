/**
 * IndexedDB wrapper for storing and retrieving audio files
 * Provides persistent storage for audio files associated with transcriptions
 */

const DB_NAME = 'helios-audio-storage';
const DB_VERSION = 1;
const STORE_NAME = 'audio-files';

/**
 * Audio file metadata
 */
export interface AudioFileInfo {
  id: string;
  size: number;
  mimeType: string;
  fileName?: string;
  createdAt: number;
}

/**
 * Initialize IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Generate unique ID for audio file
 */
function generateId(): string {
  return `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Save audio file to IndexedDB
 * @param blob - Audio file as Blob
 * @param id - Optional custom ID (generates one if not provided)
 * @param fileName - Optional original filename
 * @returns Promise resolving to the audio file ID
 */
export async function saveAudioFile(
  blob: Blob,
  id?: string,
  fileName?: string
): Promise<string> {
  const db = await openDB();
  const audioId = id || generateId();

  const audioData = {
    id: audioId,
    blob,
    size: blob.size,
    mimeType: blob.type,
    fileName,
    createdAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(audioData);

    request.onsuccess = () => resolve(audioId);
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get audio file from IndexedDB
 * @param id - Audio file ID
 * @returns Promise resolving to Blob or null if not found
 */
export async function getAudioFile(id: string): Promise<Blob | null> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? result.blob : null);
    };
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Delete audio file from IndexedDB
 * @param id - Audio file ID
 * @returns Promise resolving when deletion is complete
 */
export async function deleteAudioFile(id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}


/**
 * Clear all audio files from IndexedDB
 * @returns Promise resolving when all files are deleted
 */
export async function clearAllAudioFiles(): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Check if audio file exists
 * @param id - Audio file ID
 * @returns Promise resolving to boolean
 */
export async function audioFileExists(id: string): Promise<boolean> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result !== undefined);
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
  });
}
