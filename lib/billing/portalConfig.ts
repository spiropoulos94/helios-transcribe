/**
 * Programmatic Stripe Customer Portal configuration.
 *
 * Instead of hand-toggling the portal features in the Stripe Dashboard (which start at
 * "cancel only" and differ between test/live), we create a configuration from code and
 * pass it to each portal session. The result is consistent per environment and can't
 * drift. The config is looked-up-or-created once and memoized per process.
 *
 * The portal is the single place existing subscribers manage their subscription: switch
 * plan, update card, view invoices, update billing details, and cancel-at-period-end.
 * (New subscribers still go through Checkout; the checkout route sends existing
 * subscribers here.) Plan switches apply immediately with prorated credit — Stripe's
 * portal does not schedule downgrades for period end.
 */

import type Stripe from 'stripe';
import { getStripe } from '@/lib/billing/stripe';
import { allPriceSlots } from '@/lib/billing/priceMapping';

// Bump this when the desired feature set below changes, to force a fresh config.
const CONFIG_VERSION = 'grecho-portal-v2';

let cachedConfigId: string | null = null;

/** Group the configured price ids by their (deterministic) Stripe product id. */
function buildSwitchableProducts(): { product: string; prices: string[] }[] {
  const byProduct = new Map<string, string[]>();
  for (const slot of allPriceSlots()) {
    const priceId = process.env[slot.envKey];
    if (!priceId) continue;
    const product = `grecho_${slot.plan}`; // matches scripts/stripe-sync.ts
    byProduct.set(product, [...(byProduct.get(product) ?? []), priceId]);
  }
  return [...byProduct.entries()].map(([product, prices]) => ({ product, prices }));
}

/**
 * Returns the id of our portal configuration, creating it if needed. Returns undefined
 * on failure so the caller can fall back to the account's default portal config rather
 * than breaking "Manage subscription".
 */
export async function getPortalConfigurationId(): Promise<string | undefined> {
  if (cachedConfigId) return cachedConfigId;
  const stripe = getStripe();

  try {
    // Reuse a configuration we previously created (tagged via metadata).
    const existing = await stripe.billingPortal.configurations.list({ limit: 100 });
    const found = existing.data.find((c) => c.metadata?.grecho_portal === CONFIG_VERSION);
    if (found) {
      cachedConfigId = found.id;
      return cachedConfigId;
    }

    const features: Stripe.BillingPortal.ConfigurationCreateParams.Features = {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      customer_update: {
        enabled: true,
        allowed_updates: ['email', 'address', 'name', 'phone', 'tax_id'],
      },
      // Access lasts until period end, matching our lifecycle (then the deleted webhook
      // drops the user to Free).
      subscription_cancel: { enabled: true, mode: 'at_period_end' },
    };

    // Allow switching plans in the portal when prices are configured. Seat/quantity
    // changes stay off until the team feature ships (see the pricing page).
    const products = buildSwitchableProducts();
    if (products.length > 0) {
      features.subscription_update = {
        enabled: true,
        default_allowed_updates: ['price'],
        proration_behavior: 'create_prorations',
        products,
      };
    }

    const created = await stripe.billingPortal.configurations.create({
      metadata: { grecho_portal: CONFIG_VERSION },
      features,
    });
    cachedConfigId = created.id;
    return cachedConfigId;
  } catch (error) {
    console.error('[Billing Portal] Failed to resolve portal configuration:', error);
    return undefined;
  }
}
