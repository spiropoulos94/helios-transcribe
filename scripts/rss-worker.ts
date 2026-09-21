/**
 * RSS auto-import worker (Creator+). Polls active podcast feeds and enqueues new
 * episodes for transcription, within the feed owner's remaining monthly minutes.
 *
 * Runs as a one-shot process, intended for a Railway cron (e.g. every 15 min):
 *
 *   npm run worker:rss
 *
 * On a feed's first poll the existing backlog is recorded as `skipped` (seen, never
 * transcribed) so only episodes published *after* subscription get queued — no backfill.
 * Episodes are processed oldest-first and the cursor advances to the last one queued, so
 * nothing is dropped when a run has more new episodes than the per-run cap.
 *
 * Enqueue-only: because transcription input is a browser upload today, new episodes are
 * recorded with status `queued` and their audio URL. Wiring the queue to the actual
 * pipeline for server-originated audio lands once audio is server-side (docs/billing.md).
 */

import Parser from 'rss-parser';
import { prisma } from '@/lib/prisma';
import {
  listActiveFeeds,
  recordEpisode,
  updateFeedCursor,
} from '@/lib/server/podcastFeedRepo';
import { getEntitlements } from '@/lib/server/subscriptionRepo';
import { getUsageSnapshot } from '@/lib/server/usageRepo';

const MAX_EPISODES_PER_RUN = 10;
const parser = new Parser({ timeout: 15000 });

function episodeGuid(item: Parser.Item): string | null {
  return item.guid ?? item.link ?? item.enclosure?.url ?? null;
}

function episodeDate(item: Parser.Item): Date | null {
  const raw = item.isoDate ?? item.pubDate;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function pollFeed(feed: Awaited<ReturnType<typeof listActiveFeeds>>[number]): Promise<void> {
  // Respect the owner's plan: RSS is Creator+, and don't enqueue when out of minutes.
  const entitlements = await getEntitlements(feed.userId);
  if (!entitlements.features.rss) {
    console.log(`- feed ${feed.id}: owner lacks RSS entitlement, skipping`);
    return;
  }
  const usage = await getUsageSnapshot(feed.userId);
  if (usage.remainingMinutes !== null && usage.remainingMinutes <= 0) {
    console.log(`- feed ${feed.id}: owner out of minutes this period, skipping`);
    await updateFeedCursor(feed.id, { lastPolledAt: new Date() });
    return;
  }

  let parsed;
  try {
    parsed = await parser.parseURL(feed.url);
  } catch (err) {
    console.error(`- feed ${feed.id}: parse failed`, err);
    await updateFeedCursor(feed.id, { lastPolledAt: new Date() });
    return;
  }

  const isFirstPoll = feed.lastPublishedAt == null;
  const cursorMs = feed.lastPublishedAt ? feed.lastPublishedAt.getTime() : 0;
  let newCursorMs = cursorMs;
  let enqueued = 0;

  // Oldest-first: the cursor advances to the last episode we queue, so a backlog larger
  // than the per-run cap is drained across runs instead of being skipped.
  const items = [...parsed.items].sort(
    (a, b) => (episodeDate(a)?.getTime() ?? 0) - (episodeDate(b)?.getTime() ?? 0)
  );

  for (const item of items) {
    const guid = episodeGuid(item);
    const audioUrl = item.enclosure?.url;
    if (!guid || !audioUrl) continue;

    const published = episodeDate(item);
    const publishedMs = published?.getTime() ?? null;
    if (publishedMs !== null && publishedMs <= cursorMs) continue; // already past cursor

    if (isFirstPoll) {
      // First subscribe: snapshot the existing backlog as "seen" — never transcribe it.
      await recordEpisode(feed.id, {
        guid,
        title: item.title,
        audioUrl,
        publishedAt: published,
        status: 'skipped',
      });
      if (publishedMs !== null && publishedMs > newCursorMs) newCursorMs = publishedMs;
      continue;
    }

    if (enqueued >= MAX_EPISODES_PER_RUN) break; // resume from here on the next run
    const { created } = await recordEpisode(feed.id, {
      guid,
      title: item.title,
      audioUrl,
      publishedAt: published,
      status: 'queued',
    });
    if (created) {
      enqueued += 1;
      if (publishedMs !== null && publishedMs > newCursorMs) newCursorMs = publishedMs;
      console.log(`  ↳ queued: ${item.title ?? guid}`);
    }
  }

  // First poll of an undated feed → start the clock at "now" so future items count as new.
  if (isFirstPoll && newCursorMs === cursorMs) newCursorMs = Date.now();

  await updateFeedCursor(feed.id, {
    lastPolledAt: new Date(),
    lastPublishedAt: newCursorMs > cursorMs ? new Date(newCursorMs) : feed.lastPublishedAt,
  });
  console.log(
    `- feed ${feed.id} (${feed.url}): ${
      isFirstPoll ? 'first poll, backlog snapshotted' : `${enqueued} new episode(s) queued`
    }`
  );
}

async function main(): Promise<void> {
  const feeds = await listActiveFeeds();
  console.log(`[rss-worker] polling ${feeds.length} active feed(s)…`);
  for (const feed of feeds) {
    // Isolate each feed: a DB hiccup or bad feed must not abort the whole batch.
    try {
      await pollFeed(feed);
    } catch (err) {
      console.error(`- feed ${feed.id}: unexpected error, skipping`, err);
    }
  }
  console.log('[rss-worker] done');
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('[rss-worker] fatal', err);
  await prisma.$disconnect();
  process.exit(1);
});
