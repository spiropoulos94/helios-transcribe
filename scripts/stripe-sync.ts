/**
 * Idempotently create/update the Stripe products & prices that mirror our plan config,
 * then print the price ids to paste into the environment.
 *
 *   STRIPE_SECRET_KEY=sk_test_... npm run stripe:sync
 *
 * Amounts are derived from `lib/pricing/plans.ts` (never hardcoded here). Re-running is
 * safe: products are keyed by a deterministic id, and a price is only created when no
 * active price with the same interval/amount/currency already exists.
 */

import Stripe from 'stripe';
import { pricingPlans, type PlanId } from '@/lib/pricing/plans';
import {
  BILLABLE_PLANS,
  priceEnvKey,
  type BillablePlan,
  type BillingInterval,
} from '@/lib/billing/priceMapping';

const CURRENCY = 'eur';

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  console.error('✖ STRIPE_SECRET_KEY is required. Example:');
  console.error('  STRIPE_SECRET_KEY=sk_test_... npm run stripe:sync');
  process.exit(1);
}

const stripe = new Stripe(secretKey, { apiVersion: '2025-08-27.basil' });

function planConfig(plan: PlanId) {
  const cfg = pricingPlans.find((p) => p.id === plan);
  if (!cfg) throw new Error(`No plan config for "${plan}"`);
  return cfg;
}

/** Effective total charged per interval, in the smallest currency unit (cents). */
function amountCents(plan: BillablePlan, interval: BillingInterval): number {
  const cfg = planConfig(plan);
  // annualPrice is the effective monthly price when billed yearly → ×12 for the year.
  const euros = interval === 'year' ? cfg.annualPrice * 12 : cfg.monthlyPrice;
  return Math.round(euros * 100);
}

async function ensureProduct(plan: BillablePlan): Promise<string> {
  const id = `grecho_${plan}`;
  const cfg = planConfig(plan);
  const name = `Grecho ${cfg.name.en}`;
  const metadata = { grecho_plan: plan };
  try {
    await stripe.products.retrieve(id);
    await stripe.products.update(id, { name, metadata });
    console.log(`• product ${id} (updated)`);
  } catch {
    await stripe.products.create({ id, name, metadata });
    console.log(`• product ${id} (created)`);
  }
  return id;
}

async function ensurePrice(
  productId: string,
  plan: BillablePlan,
  interval: BillingInterval
): Promise<string> {
  const unit_amount = amountCents(plan, interval);
  const existing = await stripe.prices.list({ product: productId, active: true, limit: 100 });
  const match = existing.data.find(
    (pr) =>
      pr.currency === CURRENCY &&
      pr.unit_amount === unit_amount &&
      pr.recurring?.interval === interval
  );
  if (match) {
    console.log(`  ↳ ${interval}: ${match.id} (reused)`);
    return match.id;
  }
  const price = await stripe.prices.create({
    product: productId,
    currency: CURRENCY,
    unit_amount,
    recurring: { interval },
    metadata: { grecho_plan: plan, grecho_interval: interval },
  });
  console.log(`  ↳ ${interval}: ${price.id} (created, €${unit_amount / 100})`);
  return price.id;
}

async function main(): Promise<void> {
  const envLines: string[] = [];
  for (const plan of BILLABLE_PLANS) {
    const productId = await ensureProduct(plan);
    for (const interval of ['month', 'year'] as BillingInterval[]) {
      const priceId = await ensurePrice(productId, plan, interval);
      envLines.push(`${priceEnvKey(plan, interval)}=${priceId}`);
    }
  }
  console.log('\n# ─── Add these to your environment ───');
  console.log(envLines.join('\n'));
  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
