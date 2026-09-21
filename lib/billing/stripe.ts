/**
 * Server-side Stripe client. Import only from server code (route handlers, scripts,
 * workers). Lazily instantiated so importing this module never throws at build time
 * when the key is absent — it only throws when a route actually needs it.
 */

import Stripe from 'stripe';

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  client = new Stripe(key, {
    apiVersion: '2025-08-27.basil',
    typescript: true,
    appInfo: { name: 'grecho-transcribe' },
  });
  return client;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
