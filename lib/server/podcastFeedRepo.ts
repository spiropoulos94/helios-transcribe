/**
 * Server-only repository for RSS auto-import: podcast feeds and their episodes.
 */

import { prisma } from '@/lib/prisma';
import type { PodcastEpisode, PodcastFeed } from '@prisma/client';

export function createFeed(userId: string, url: string, title?: string): Promise<PodcastFeed> {
  return prisma.podcastFeed.upsert({
    where: { userId_url: { userId, url } },
    create: { userId, url, title: title ?? null },
    update: { active: true, title: title ?? undefined },
  });
}

export function getUserFeeds(userId: string): Promise<PodcastFeed[]> {
  return prisma.podcastFeed.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
}

export async function deleteFeed(userId: string, id: string): Promise<boolean> {
  const result = await prisma.podcastFeed.deleteMany({ where: { id, userId } });
  return result.count > 0;
}

/** All active feeds, for the polling worker. */
export function listActiveFeeds(): Promise<PodcastFeed[]> {
  return prisma.podcastFeed.findMany({ where: { active: true } });
}

/** Record a discovered episode (idempotent per feed+guid). Returns whether it's new. */
export async function recordEpisode(
  feedId: string,
  episode: {
    guid: string;
    title?: string | null;
    audioUrl: string;
    publishedAt?: Date | null;
    status?: string;
  }
): Promise<{ created: boolean; episode: PodcastEpisode }> {
  const existing = await prisma.podcastEpisode.findUnique({
    where: { feedId_guid: { feedId, guid: episode.guid } },
  });
  if (existing) return { created: false, episode: existing };
  const created = await prisma.podcastEpisode.create({
    data: {
      feedId,
      guid: episode.guid,
      title: episode.title ?? null,
      audioUrl: episode.audioUrl,
      publishedAt: episode.publishedAt ?? null,
      status: episode.status ?? 'pending',
    },
  });
  return { created: true, episode: created };
}

export async function updateFeedCursor(
  feedId: string,
  data: { lastPolledAt?: Date; lastPublishedAt?: Date | null }
): Promise<void> {
  await prisma.podcastFeed.update({ where: { id: feedId }, data });
}

export async function markEpisodeStatus(
  episodeId: string,
  status: string,
  transcriptionId?: string
): Promise<void> {
  await prisma.podcastEpisode.update({
    where: { id: episodeId },
    data: { status, transcriptionId: transcriptionId ?? undefined },
  });
}
