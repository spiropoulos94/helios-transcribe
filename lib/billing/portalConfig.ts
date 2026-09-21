/**
 * Programmatic Stripe Customer Portal configuration.
 *
 * Instead of hand-toggling the portal features in the Stripe Dashboard (which start at
 * "cancel only" and differ between test/live), we create a configuration from code and
 * pass it to each portal session. The result is consistent per environment and can't
 * drift. The config is looked-up-or-created once and memoized per process.
 *
 * Plan changes intentionally live on the pricing page (in-place, prorated — see the
 * checkout route), so the portal handles billing housekeeping: update card, invoices,
 * billing details, and cancel-at-period-end. Flip `subscription_update` on here if you'd
 * rather let customers switch plans inside the portal too.
 */

import { getStripe } from '@/lib/billing/stripe';

// Bump this when the desired feature set below changes, to force a fresh config.
const CONFIG_VERSION = 'grecho-portal-v1';

let cachedConfigId: string | null = null;

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
    const found = existing.data.find(
      (c) => c.metadata?.grecho_portal === CONFIG_VERSION
    );
    if (found) {
      cachedConfigId = found.id;
      return cachedConfigId;
    }

    const created = await stripe.billingPortal.configurations.create({
      metadata: { grecho_portal: CONFIG_VERSION },
      features: {
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        customer_update: {
          enabled: true,
          allowed_updates: ['email', 'address', 'name', 'phone', 'tax_id'],
        },
        // Access lasts until period end, matching our lifecycle (then the deleted webhook
        // drops the user to Free).
        subscription_cancel: { enabled: true, mode: 'at_period_end' },
      },
    });
    cachedConfigId = created.id;
    return cachedConfigId;
  } catch (error) {
    console.error('[Billing Portal] Failed to resolve portal configuration:', error);
    return undefined;
  }
}
