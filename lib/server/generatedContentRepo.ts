/**
 * Server-only repository for AI-generated content. Every query is scoped to a
 * userId so a user can only ever read or mutate their own rows.
 */

import { prisma } from '@/lib/prisma';
import type { GeneratedContentItem, GeneratedContentType } from '@/lib/generatedContent';

interface GeneratedContentRow {
  id: string;
  transcriptionId: string;
  type: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Map a Prisma row to the API/client shape (Date fields as ISO strings). */
function toItem(row: GeneratedContentRow): GeneratedContentItem {
  return {
    id: row.id,
    transcriptionId: row.transcriptionId,
    type: row.type as GeneratedContentType,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Create or update the single row for (userId, transcriptionId, type). */
export async function upsertGenerated(
  userId: string,
  input: { transcriptionId: string; type: GeneratedContentType; content: string }
): Promise<GeneratedContentItem> {
  const row = await prisma.generatedContent.upsert({
    where: {
      userId_transcriptionId_type: {
        userId,
        transcriptionId: input.transcriptionId,
        type: input.type,
      },
    },
    create: {
      userId,
      transcriptionId: input.transcriptionId,
      type: input.type,
      content: input.content,
    },
    update: {
      content: input.content,
    },
  });
  return toItem(row);
}

/** List all rows for a transcription owned by the user (newest first). */
export async function listForTranscription(
  userId: string,
  transcriptionId: string
): Promise<GeneratedContentItem[]> {
  const rows = await prisma.generatedContent.findMany({
    where: { userId, transcriptionId },
    orderBy: { updatedAt: 'desc' },
  });
  return rows.map(toItem);
}

/** Get a single row for (userId, transcriptionId, type), or null. */
export async function getOne(
  userId: string,
  transcriptionId: string,
  type: GeneratedContentType
): Promise<GeneratedContentItem | null> {
  const row = await prisma.generatedContent.findUnique({
    where: {
      userId_transcriptionId_type: { userId, transcriptionId, type },
    },
  });
  return row ? toItem(row) : null;
}

/**
 * Delete a row by id, but only if it belongs to the user.
 * Returns true when a row was deleted, false when nothing matched.
 */
export async function deleteForUser(userId: string, id: string): Promise<boolean> {
  const result = await prisma.generatedContent.deleteMany({
    where: { id, userId },
  });
  return result.count > 0;
}
