/**
 * In-memory storage for async transcription results
 *
 * For production, replace this with a database or Redis cache
 */

export interface StoredTranscription {
  requestId: string;
  transcriptionId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

class TranscriptionStore {
  private store: Map<string, StoredTranscription> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  // Clean up old entries after 1 hour
  private readonly TTL_MS = 60 * 60 * 1000;

  constructor() {
    // Start cleanup task
    this.startCleanup();
  }

  /**
   * Create a new transcription entry
   */
  create(requestId: string, transcriptionId?: string): void {
    this.store.set(requestId, {
      requestId,
      transcriptionId,
      status: 'pending',
      createdAt: Date.now(),
    });
  }

  /**
   * Update transcription status
   */
  updateStatus(requestId: string, status: StoredTranscription['status']): void {
    const entry = this.store.get(requestId);
    if (entry) {
      entry.status = status;
      this.store.set(requestId, entry);
    }
  }

  /**
   * Store completed transcription result
   */
  complete(requestId: string, result: any): void {
    const entry = this.store.get(requestId);
    if (entry) {
      entry.status = 'completed';
      entry.result = result;
      entry.completedAt = Date.now();
      this.store.set(requestId, entry);
    } else {
      // Create new entry if it doesn't exist (webhook-first scenario)
      this.store.set(requestId, {
        requestId,
        status: 'completed',
        result,
        createdAt: Date.now(),
        completedAt: Date.now(),
      });
    }
  }

  /**
   * Store failed transcription
   */
  fail(requestId: string, error: string): void {
    const entry = this.store.get(requestId);
    if (entry) {
      entry.status = 'failed';
      entry.error = error;
      entry.completedAt = Date.now();
      this.store.set(requestId, entry);
    }
  }

  /**
   * Get transcription by request ID
   */
  get(requestId: string): StoredTranscription | undefined {
    return this.store.get(requestId);
  }

  /**
   * Check if transcription is complete
   */
  isComplete(requestId: string): boolean {
    const entry = this.store.get(requestId);
    return entry?.status === 'completed' || entry?.status === 'failed';
  }

  /**
   * Delete transcription entry
   */
  delete(requestId: string): void {
    this.store.delete(requestId);
  }

  /**
   * Start cleanup task to remove old entries
   */
  private startCleanup(): void {
    if (this.cleanupInterval) {
      return;
    }

    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const toDelete: string[] = [];

      for (const [requestId, entry] of this.store.entries()) {
        const age = now - entry.createdAt;
        if (age > this.TTL_MS) {
          toDelete.push(requestId);
        }
      }

      toDelete.forEach(id => this.store.delete(id));

      if (toDelete.length > 0) {
        console.log(`[TranscriptionStore] Cleaned up ${toDelete.length} old entries`);
      }
    }, 5 * 60 * 1000); // Run every 5 minutes
  }

  /**
   * Stop cleanup task
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get store size
   */
  size(): number {
    return this.store.size;
  }
}

// Singleton instance
export const transcriptionStore = new TranscriptionStore();
