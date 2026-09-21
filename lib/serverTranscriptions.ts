/**
 * Client-side wrappers around the server transcription API (`/api/transcriptions`).
 *
 * These are safe to call from anywhere: every function fails soft (returns a
 * neutral value instead of throwing) so the existing offline-first IndexedDB
 * flow keeps working for logged-out users or when the network/DB is down.
 *
 * The server persists transcriptions per authenticated user so they survive a
 * cache clear or a device switch — the first real use of the Prisma models.
 */

/** Payload sent to the server to back up a single transcription. */
export interface TranscriptionSyncPayload {
  /** Stable client id (the IndexedDB id) — also used as the server primary key. */
  id: string;
  fileName: string;
  text: string;
  provider?: string | null;
  model?: string | null;
  wordCount?: number | null;
  durationSeconds?: number | null;
  processingTimeMs?: number | null;
  /** Raw provider JSON, stored as a JSON string. */
  rawJson?: string | null;
  /** Editor state, stored as a JSON string. */
  editorState?: string | null;
  /** Client creation timestamp in ms (preserves original ordering). */
  createdAtMs?: number | null;
}

/** Lightweight server transcription for list views. */
export interface ServerTranscriptionListItem {
  id: string;
  fileName: string;
  provider: string | null;
  model: string | null;
  wordCount: number | null;
  durationSeconds: number | null;
  createdAt: string; // ISO string
}

/** Full server transcription record. */
export interface ServerTranscription extends ServerTranscriptionListItem {
  text: string;
  processingTimeMs: number | null;
  rawJson: string | null;
  editorState: string | null;
  updatedAt: string; // ISO string
}

/**
 * Back up a transcription to the current user's account.
 * Fire-and-forget friendly: never throws, returns `{ ok: false }` on any failure.
 */
export async function syncTranscription(
  payload: TranscriptionSyncPayload
): Promise<{ ok: boolean }> {
  try {
    const res = await fetch('/api/transcriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

/** Fetch the current user's server-side transcriptions (newest first). */
export async function fetchServerTranscriptions(): Promise<ServerTranscriptionListItem[]> {
  try {
    const res = await fetch('/api/transcriptions', { method: 'GET' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}

/** Fetch a single server-side transcription by id, or null. */
export async function fetchServerTranscription(
  id: string
): Promise<ServerTranscription | null> {
  try {
    const res = await fetch(`/api/transcriptions/${encodeURIComponent(id)}`, {
      method: 'GET',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.transcription ?? null;
  } catch {
    return null;
  }
}

/** Delete a server-side transcription by id. Returns whether it succeeded. */
export async function deleteServerTranscription(id: string): Promise<{ ok: boolean }> {
  try {
    const res = await fetch(`/api/transcriptions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}
