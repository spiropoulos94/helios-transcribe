/**
 * Server-only data access for user transcriptions, usage records and plan.
 *
 * All operations are scoped to a userId. Never import this from client code —
 * it touches the Prisma client directly.
 */

import { prisma } from '@/lib/prisma';
import type {
  TranscriptionSyncPayload,
  ServerTranscriptionListItem,
  ServerTranscription,
} from '@/lib/serverTranscriptions';

/**
 * Create or update a transcription for a user.
 *
 * Uses the client id as the primary key so re-syncing the same transcription
 * updates it instead of duplicating. A UsageRecord is written only on the first
 * insert (so re-syncs don't double-count usage). Ownership is enforced: a row
 * that already exists under a different user is rejected.
 */
export async function saveTranscriptionForUser(
  userId: string,
  payload: TranscriptionSyncPayload
): Promise<{ created: boolean }> {
  const existing = await prisma.transcription.findUnique({
    where: { id: payload.id },
    select: { id: true, userId: true },
  });

  if (existing && existing.userId !== userId) {
    throw new OwnershipError();
  }

  const data = {
    fileName: payload.fileName,
    text: payload.text,
    provider: payload.provider ?? null,
    model: payload.model ?? null,
    wordCount: payload.wordCount ?? null,
    durationSeconds: payload.durationSeconds ?? null,
    processingTimeMs: payload.processingTimeMs ?? null,
    rawJson: payload.rawJson ?? null,
    editorState: payload.editorState ?? null,
  };

  if (existing) {
    await prisma.transcription.update({ where: { id: payload.id }, data });
    return { created: false };
  }

  // First insert: create the transcription and a usage record together.
  await prisma.$transaction([
    prisma.transcription.create({
      data: {
        id: payload.id,
        userId,
        ...data,
        ...(payload.createdAtMs ? { createdAt: new Date(payload.createdAtMs) } : {}),
      },
    }),
    prisma.usageRecord.create({
      data: {
        userId,
        durationSeconds: payload.durationSeconds ?? 0,
        provider: payload.provider ?? null,
      },
    }),
  ]);

  return { created: true };
}

/** List a user's transcriptions, newest first (lightweight fields). */
export async function listTranscriptionsForUser(
  userId: string
): Promise<ServerTranscriptionListItem[]> {
  const rows = await prisma.transcription.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      fileName: true,
      provider: true,
      model: true,
      wordCount: true,
      durationSeconds: true,
      createdAt: true,
    },
  });

  return rows.map((r) => ({
    id: r.id,
    fileName: r.fileName,
    provider: r.provider,
    model: r.model,
    wordCount: r.wordCount,
    durationSeconds: r.durationSeconds,
    createdAt: r.createdAt.toISOString(),
  }));
}

/** Fetch a single transcription owned by the user, or null. */
export async function getTranscriptionForUser(
  userId: string,
  id: string
): Promise<ServerTranscription | null> {
  const r = await prisma.transcription.findUnique({ where: { id } });
  if (!r || r.userId !== userId) return null;

  return {
    id: r.id,
    fileName: r.fileName,
    text: r.text,
    provider: r.provider,
    model: r.model,
    wordCount: r.wordCount,
    durationSeconds: r.durationSeconds,
    processingTimeMs: r.processingTimeMs,
    rawJson: r.rawJson,
    editorState: r.editorState,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

/** Delete a transcription owned by the user. Returns whether a row was removed. */
export async function deleteTranscriptionForUser(
  userId: string,
  id: string
): Promise<{ deleted: boolean }> {
  const r = await prisma.transcription.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!r || r.userId !== userId) return { deleted: false };

  await prisma.transcription.delete({ where: { id } });
  return { deleted: true };
}

/** Thrown when a user tries to write over another user's transcription. */
export class OwnershipError extends Error {
  constructor() {
    super('Transcription belongs to another user');
    this.name = 'OwnershipError';
  }
}
