import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { getStripe } from '@/lib/billing/stripe';
import {
  getPriceId,
  isBillablePlan,
  isBillingInterval,
} from '@/lib/billing/priceMapping';
import { getSubscription, setStripeCustomerId } from '@/lib/server/subscriptionRepo';
import { appConfig } from '@/lib/config';

export const dynamic = 'force-dynamic';

interface CheckoutBody {
  plan?: string;
  interval?: string;
  seats?: number;
}

/**
 * POST /api/billing/checkout
 * Create a Stripe Checkout Session for a chosen plan + interval (+ seats for Newsroom).
 * Creates/reuses the Stripe customer and stores its id on the user's subscription.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.authorized) return authResult.response;

  const userId = authResult.session?.user?.id;
  const email = authResult.session?.user?.email ?? undefined;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: CheckoutBody;
  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { plan, interval } = body;
  if (!plan || !isBillablePlan(plan)) {
    return NextResponse.json({ error: 'Invalid or non-billable plan' }, { status: 400 });
  }
  if (!interval || !isBillingInterval(interval)) {
    return NextResponse.json({ error: 'Invalid interval' }, { status: 400 });
  }

  const priceId = getPriceId(plan, interval);
  if (!priceId) {
    return NextResponse.json(
      { error: `No Stripe price configured for ${plan}/${interval}` },
      { status: 500 }
    );
  }

  // Seats only apply to seat-based (Newsroom) plans; clamp to a sane range.
  const seats =
    plan === 'newsroom' ? Math.max(1, Math.min(500, Math.floor(body.seats ?? 1))) : 1;

  try {
    const stripe = getStripe();

    // Reuse an existing Stripe customer if we have one; otherwise create + persist it.
    const existing = await getSubscription(userId);
    let customerId = existing?.stripeCustomerId ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { userId },
      });
      customerId = customer.id;
      await setStripeCustomerId(userId, customerId);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: userId,
      line_items: [{ price: priceId, quantity: seats }],
      allow_promotion_codes: true,
      subscription_data: { metadata: { userId, plan } },
      success_url: `${appConfig.url}/account?checkout=success`,
      cancel_url: `${appConfig.url}/pricing?checkout=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[Billing Checkout] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to start checkout';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
