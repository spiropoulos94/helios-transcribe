import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { getStripe } from '@/lib/billing/stripe';
import { getPortalConfigurationId } from '@/lib/billing/portalConfig';
import { getSubscription } from '@/lib/server/subscriptionRepo';
import { appConfig } from '@/lib/config';

export const dynamic = 'force-dynamic';

/**
 * POST /api/billing/portal
 * Create a Stripe Customer Portal session so the user can manage / switch / cancel.
 */
export async function POST() {
  const authResult = await requireAuth();
  if (!authResult.authorized) return authResult.response;

  const userId = authResult.session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const subscription = await getSubscription(userId);
  if (!subscription?.stripeCustomerId) {
    return NextResponse.json(
      { error: 'No billing account yet. Subscribe to a plan first.' },
      { status: 400 }
    );
  }

  try {
    const stripe = getStripe();
    const configuration = await getPortalConfigurationId();
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${appConfig.url}/account`,
      // Fall back to the account default config when ours can't be resolved.
      ...(configuration ? { configuration } : {}),
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[Billing Portal] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to open billing portal';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
