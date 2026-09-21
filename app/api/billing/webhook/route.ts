import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/billing/stripe';
import { stripeConfig } from '@/lib/config';
import { markEventProcessed, releaseEvent } from '@/lib/server/processedEventRepo';
import {
  applySubscriptionState,
  setStripeCustomerId,
} from '@/lib/server/subscriptionRepo';
import {
  subscriptionStateFromStripe,
  deletedSubscriptionState,
} from '@/lib/billing/webhookHandlers';

// Raw body is required for signature verification — do not let the framework parse it.
export const dynamic = 'force-dynamic';

/** Normalize a Stripe expandable ref (string id | object | null) to an id. */
function asId(ref: string | { id: string } | null | undefined): string | null {
  if (!ref) return null;
  return typeof ref === 'string' ? ref : ref.id;
}

/** Fetch a subscription with its price expanded so we can map it to a plan. */
async function retrieveSubscription(id: string): Promise<Stripe.Subscription> {
  const stripe = getStripe();
  return stripe.subscriptions.retrieve(id, { expand: ['items.data.price'] });
}

async function handleEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== 'subscription') return;

      const userId = session.client_reference_id ?? undefined;
      const customerId = asId(session.customer);
      // Make sure the customer is linked to the user's row before we apply state.
      if (userId && customerId) {
        await setStripeCustomerId(userId, customerId);
      }
      const subId = asId(session.subscription);
      if (!subId) return;
      const sub = await retrieveSubscription(subId);
      await applySubscriptionState(subscriptionStateFromStripe(sub, event.created));
      return;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      await applySubscriptionState(subscriptionStateFromStripe(sub, event.created));
      return;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await applySubscriptionState(deletedSubscriptionState(sub, event.created));
      return;
    }

    case 'invoice.paid':
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = asId(invoice.parent?.subscription_details?.subscription);
      if (!subId) return; // one-off invoice, not subscription-related
      const sub = await retrieveSubscription(subId);
      await applySubscriptionState(subscriptionStateFromStripe(sub, event.created));
      return;
    }

    default:
      // Unhandled event types are acknowledged and ignored.
      return;
  }
}

/**
 * POST /api/billing/webhook
 * Verifies the Stripe signature, de-duplicates by event id, and syncs subscription
 * state. Handlers are idempotent and order-independent (see the out-of-order guard in
 * `applySubscriptionState`).
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }
  if (!stripeConfig.webhookSecret) {
    console.error('[Billing Webhook] STRIPE_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      payload,
      signature,
      stripeConfig.webhookSecret
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid signature';
    console.error('[Billing Webhook] Signature verification failed:', message);
    // 400 → Stripe will not retry a genuinely invalid signature.
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Idempotency: atomically claim the event id; a duplicate delivery is skipped.
  const isFirst = await markEventProcessed(event.id, event.type);
  if (!isFirst) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    await handleEvent(event);
  } catch (error) {
    // Release the claim and surface a 500 so Stripe retries. Idempotency + the
    // out-of-order guard make retries safe.
    await releaseEvent(event.id);
    console.error(`[Billing Webhook] Failed handling ${event.type}:`, error);
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
