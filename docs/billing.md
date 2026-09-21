# Billing, Plans & Entitlements

This document is the design + operations reference for Grecho's plan-based billing
and feature gating. It covers the entitlements engine, the Stripe integration, the
server-side enforcement points, the subscription lifecycle (upgrade / downgrade /
cancel), and the limits that cannot be fully enforced yet because transcript/audio
storage is still browser-only.

---

## 1. Principles

1. **Code is the source of truth for entitlements.** `lib/billing/entitlements.ts`
   maps every plan to its limits and features. Stripe products/prices are *mirrored*
   from this config (see `scripts/stripe-sync.ts`), never the other way around.
2. **Enforcement is server-side, at the point of value creation.** The client is for
   UX only (hiding buttons, showing upgrade prompts). Every gate is re-checked in the
   API route that actually does the work.
3. **Nothing about a price/amount is hardcoded in logic.** Amounts come from
   `lib/pricing/plans.ts`; Stripe price IDs come from env vars.
4. **Webhooks are idempotent and order-independent.** Every event is de-duplicated by
   Stripe event id, and subscription state is always recomputed from the event payload
   rather than mutated incrementally.
5. **Never delete user data on downgrade.** Over-limit content becomes read-only /
   locked, never removed.

---

## 2. Plans → limits & features

Source of truth: `lib/billing/entitlements.ts`. Tiers are inclusive of lower tiers.

| Capability            | Free            | Pro           | Creator        | Newsroom            |
|-----------------------|-----------------|---------------|----------------|---------------------|
| Transcription minutes/mo | 30           | 300 (5 h)     | 1800 (30 h)    | 1800 (30 h) / seat  |
| Saved files           | 1               | ∞             | ∞              | ∞                   |
| Watermark on exports  | **yes**         | no            | no             | no                  |
| Exports               | txt only        | txt/docx/pdf + srt/vtt | + all    | + all               |
| Subtitles (srt/vtt)   | –               | ✔             | ✔              | ✔                   |
| Highlights & quotes   | –               | ✔             | ✔              | ✔                   |
| AI summary            | –               | ✔             | ✔              | ✔                   |
| AI article draft      | –               | ✔             | ✔              | ✔                   |
| Official minutes / press release | –    | ✔             | ✔              | ✔                   |
| Show notes & chapters | –               | –             | ✔              | ✔                   |
| Clip suggestions      | –               | –             | ✔              | ✔                   |
| RSS auto-import       | –               | –             | ✔              | ✔                   |
| Priority processing   | –               | –             | ✔              | ✔                   |
| Team workspace/seats  | –               | –             | –              | ✔                   |
| Speaker ID            | basic           | basic         | basic          | basic               |

Prices (from `lib/pricing/plans.ts`): Free €0 · Pro €9/mo (€7 annual) · Creator €19/mo
(€15 annual) · Newsroom €19/seat/mo (€15 annual). "Annual" numbers are the effective
monthly price when billed yearly; the yearly Stripe price = monthly × 12.

---

## 3. Entitlements engine

- `PlanId = 'free' | 'pro' | 'creator' | 'newsroom'` (`lib/pricing/plans.ts`).
- `entitlementsForPlan(plan)` — pure function, `plan → Entitlements`. Safe on both
  client and server (no imports of prisma/stripe).
- `getEntitlements(userId)` (`lib/server/subscriptionRepo.ts`) — reads the user's active
  `Subscription`, resolves the effective plan (see §6), defaults to Free, returns
  `entitlementsForPlan(plan)`.
- `GET /api/billing/entitlements` — returns `{ plan, entitlements, usage }` for the
  signed-in user. Backs the `useEntitlements()` client hook. **UI only.**

`Entitlements` shape:

```ts
{
  plan: PlanId;
  limits: {
    monthlyMinutes: number | null;   // null = unlimited
    savedFiles: number | null;
    teamSeats: number | null;        // null = n/a (non-team plans)
  };
  features: {
    watermark: boolean;
    allowedExports: ('txt' | 'docx' | 'pdf' | 'srt' | 'vtt')[];
    aiTools: AiToolType[];           // summary/article/show-notes/clips
    highlights: boolean;
    rss: boolean;
    priorityProcessing: boolean;
    team: boolean;
  };
}
```

---

## 4. Data model changes (`prisma/schema.prisma`)

No migration files — the project uses `prisma db push`. After merging, run
`npx prisma db push` against **both** the dev and prod Neon databases.

- **`Subscription`** (extended): add `interval String?` (`month`/`year`),
  `stripePriceId String?`, `seats Int @default(1)`, `cancelAtPeriodEnd Boolean @default(false)`.
- **`ProcessedStripeEvent`** (new): `id` = Stripe event id (`@id`), `type`, `createdAt`.
  Webhook idempotency ledger.
- **`PodcastFeed`** (new): owner (`userId`), `url`, `title?`, `active`, `lastPolledAt?`,
  `lastPublishedAt?` (cursor), timestamps. `@@unique([userId, url])`.
- **`PodcastEpisode`** (new): `feedId`, `guid`, `title?`, `audioUrl`, `publishedAt?`,
  `status` (`pending`/`queued`/`done`/`failed`), `transcriptionId?`. `@@unique([feedId, guid])`.
- **`Workspace`** (new): `name`, `ownerId`, Stripe ids, `seats`, timestamps.
- **`Membership`** (new): `workspaceId`, `userId`, `role` (`owner`/`admin`/`member`).
  `@@unique([workspaceId, userId])`.
- **`WorkspaceInvite`** (new): `workspaceId`, `email`, `role`, `token`, `acceptedAt?`.
  `@@unique([workspaceId, email])`.

`plan`/`status`/`role`/`interval` stay loose `String`s (matching the existing schema
style, which uses no Prisma enums); the allowed values live in TypeScript.

---

## 5. Enforcement points (server-side)

| Where | Guard | Failure |
|-------|-------|---------|
| `POST /api/transcribe` | quota check **before** processing; records actual minutes **after** | `402` with `{ error, plan, requiredPlan? }` |
| `POST /api/ai/generate` | `summary`/`article` → Pro+; `show-notes`/`clips` → Creator+ | `403` |
| `POST /api/export/official-minutes` | Pro+ (AI generation) | `403` |
| `POST /api/export/press-release` | Pro+ (AI generation) | `403` |
| `POST /api/billing/checkout` | authed; validates plan+interval against price map | `400/401` |
| `POST /api/billing/portal` | authed; must have a Stripe customer | `400/401` |
| RSS worker | enqueues episodes only within the owner's remaining monthly minutes | skips + logs |

Client-only surfaces (subtitles, highlights/quotes export, watermark) are gated in the
UI **and** flagged below — they can only be *fully* enforced once export/signing moves
server-side (see §7).

### Usage metering & billing period

- `UsageRecord` gets one row per completed transcription (`durationSeconds`, `costUsd?`,
  `provider?`).
- **Current-period usage** = sum of `durationSeconds` where `createdAt >= periodStart`.
  - Paid plans: `periodStart/periodEnd` from the `Subscription` (Stripe billing period).
  - Free / no subscription: calendar-month window (UTC, 1st → next 1st).
- Usage resets naturally when the period rolls over — nothing to cron.
- The transcribe route rejects up-front when remaining ≤ 0, and also when the
  client-declared duration would exceed the remainder. The **authoritative** minutes are
  recorded post-transcription from the returned segments (max `endTime`), so a client that
  under-declares still gets metered and is blocked on the *next* request. A precise
  pre-check requires a server-side probe (ffprobe) — deferred; see §7.

---

## 6. Lifecycle: upgrade / downgrade / cancel

State is derived from Stripe and stored on `Subscription`. The **effective plan** used by
`getEntitlements` is:

- `status` active/trialing → `plan` from the current price.
- `cancelAtPeriodEnd` → keep `plan` until `currentPeriodEnd`, then Free (the
  `customer.subscription.deleted` webhook flips it).
- `status` past_due/unpaid → keep the paid plan through the grace period Stripe allows;
  `canceled`/absent → Free.

| Transition | Money | Access | Mechanism |
|-----------|-------|--------|-----------|
| Upgrade (e.g. Pro→Creator) | immediate, prorated | new tier immediately | update subscription item, `proration_behavior=create_prorations` |
| Downgrade (Creator→Pro) | at period end | keeps higher tier until period end | Stripe **subscription schedule** phase change at period end; entitlements recompute on webhook |
| Cancel | none | keeps plan until period end, then Free | `cancel_at_period_end=true`; `deleted` webhook → Free |
| Newsroom seat + | prorated | immediately | update item `quantity` |
| Newsroom seat − | at period end (or immediate w/ proration via portal) | must remove members down to seat count | update `quantity`; app enforces membership ≤ seats |

### Downgrade behavior matrix (over-limit handling)

Never destructive. On the webhook that lowers the plan:

| Situation after downgrade | Behavior |
|---------------------------|----------|
| Minutes already used > new limit | Existing transcripts stay viewable/exportable. **New** transcription blocked until next period reset. No retroactive charge/lock. |
| Saved files > new limit (Free = 1) | Excess files marked **read-only/locked** (oldest kept editable first). No deletion. *Browser-storage caveat — see §7.* |
| Gated feature previously used (e.g. AI article) | Already-generated content stays viewable/exportable; **new** gated actions blocked with an upgrade prompt. |
| Newsroom → lower, members > seats | Members stay until the owner removes them / seats are increased; billing quantity is what Stripe charges. UI prompts the owner to resolve. |

---

## 7. Browser-only storage caveats (must-read)

Transcripts and audio currently live in the **browser (IndexedDB)** —
`lib/transcriptionStorage.ts`, `lib/audioStorage.ts` (both flagged TEMPORARY). Server
persistence is on the `feat/server-persistence` branch. Consequences for billing:

| Limit / feature | Can enforce now? | Interim approach |
|-----------------|------------------|------------------|
| Minutes/month | **Yes** (server) | `UsageRecord` written at the transcribe route; authoritative. |
| AI tools, official minutes, press release | **Yes** (server) | gated in the API routes. |
| "1 saved file" (Free) | **No, not server-side** | Server has no transcript rows to count. Enforced in the library UI (lock all but the newest saved file for Free) + documented. True enforcement lands with server-side transcript storage. |
| Watermark on txt/pdf/docx | **Partial** | Applied client-side in `lib/export/watermark.ts` (Free gets a footer banner). A determined user can bypass client code; true enforcement needs server-side export/signing. |
| Subtitles / highlights export gating | **Partial** | Gated in the editor UI; same server-signing caveat. |
| Workspace-scoped transcripts (Newsroom) | **No** | Workspace/membership/roles/seat-billing are implemented server-side; *scoping transcript content* to a workspace requires server-side transcript storage. `GeneratedContent` (already server-side) is the migration template. |

The honest summary: **money, minutes and AI generation are truly enforced today.**
File-count and export watermark/gating are best-effort client checks until storage and
exports move to the server.

---

## 8. Stripe setup & local testing

Environment (see `.env.example`):

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
# price IDs printed by scripts/stripe-sync.ts:
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_ANNUAL=price_...
STRIPE_PRICE_CREATOR_MONTHLY=price_...
STRIPE_PRICE_CREATOR_ANNUAL=price_...
STRIPE_PRICE_NEWSROOM_MONTHLY=price_...
STRIPE_PRICE_NEWSROOM_ANNUAL=price_...
```

1. **Create products/prices** (idempotent — safe to re-run):
   ```bash
   STRIPE_SECRET_KEY=sk_test_... npm run stripe:sync
   ```
   It prints the price IDs; paste them into your env.
2. **Forward webhooks** in test mode:
   ```bash
   stripe listen --forward-to localhost:3000/api/billing/webhook
   ```
   Copy the `whsec_...` it prints into `STRIPE_WEBHOOK_SECRET`.
3. **Trigger events** while testing:
   ```bash
   stripe trigger checkout.session.completed
   stripe trigger customer.subscription.updated
   stripe trigger invoice.payment_failed
   ```
4. Use test card `4242 4242 4242 4242` at checkout.

Handled events: `checkout.session.completed`,
`customer.subscription.created/updated/deleted`, `invoice.paid`,
`invoice.payment_failed`.

---

## 9. RSS auto-import worker (Railway)

`scripts/rss-worker.ts` polls active `PodcastFeed` rows, parses each feed
(`rss-parser`), and enqueues transcription of new episodes **within the owner's
remaining monthly minutes** (Creator+ only). It is a one-shot process meant to run as a
**Railway cron** (not a Vercel cron):

```bash
npm run worker:rss
```

Railway → the service's *Cron Schedule* (e.g. `*/15 * * * *`) with start command
`npm run worker:rss`. The worker is idempotent per `(feedId, guid)` and advances each
feed's `lastPublishedAt` cursor.

> Enqueue-only: because transcription input is a browser upload today, the worker records
> episodes as `queued` and fetches audio by URL. Wiring the queue to the actual
> transcription pipeline for server-originated audio is the remaining step once audio is
> server-side.

---

## 10. Tests

`vitest`. Pure logic is isolated so it can be unit-tested without a DB or network:

- `lib/billing/__tests__/entitlements.test.ts` — plan → entitlements, inclusivity.
- `lib/billing/__tests__/usage.test.ts` — period bounds + usage math + quota decisions.
- `lib/billing/__tests__/webhook-handlers.test.ts` — idempotency, out-of-order events,
  price → plan mapping.

```bash
npm test
```
