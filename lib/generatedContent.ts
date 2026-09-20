/**
 * Client-safe helpers for the server-persisted AI-generated content store.
 *
 * Every call is fail-soft: network/auth errors never throw, so logged-out or
 * offline users keep working (the editor falls back to its localStorage cache).
 */

import type { AiToolType } from '@/lib/ai/journalistPrompts';

export type GeneratedContentType = AiToolType;

export interface GeneratedContentItem {
  id: string;
  transcriptionId: string;
  type: GeneratedContentType;
  content: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Persist (upsert) a generated output for the current user. Fire-and-forget.
 */
export async function saveGeneratedContent(input: {
  transcriptionId: string;
  type: GeneratedContentType;
  content: string;
}): Promise<{ ok: boolean }> {
  try {
    const response = await fetch('/api/generated', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return { ok: response.ok };
  } catch {
    return { ok: false };
  }
}

/**
 * List all saved generated outputs for a transcription.
 */
export async function listGeneratedContent(
  transcriptionId: string
): Promise<GeneratedContentItem[]> {
  try {
    const response = await fetch(
      `/api/generated?transcriptionId=${encodeURIComponent(transcriptionId)}`
    );
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data?.items) ? (data.items as GeneratedContentItem[]) : [];
  } catch {
    return [];
  }
}

/**
 * Get a single saved output for a transcription + tool type, or null.
 */
export async function getGeneratedContent(
  transcriptionId: string,
  type: GeneratedContentType
): Promise<GeneratedContentItem | null> {
  const items = await listGeneratedContent(transcriptionId);
  return items.find((item) => item.type === type) ?? null;
}

/**
 * Delete a saved output by id.
 */
export async function deleteGeneratedContent(id: string): Promise<{ ok: boolean }> {
  try {
    const response = await fetch(`/api/generated/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return { ok: response.ok };
  } catch {
    return { ok: false };
  }
}
