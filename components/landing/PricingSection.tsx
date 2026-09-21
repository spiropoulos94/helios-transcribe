'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Check, Loader2 } from 'lucide-react';
import { localePath, type Locale } from '@/i18n/config';
import { pricingPlans, type PlanId } from '@/lib/pricing/plans';
import { isBillablePlan, type BillingInterval } from '@/lib/billing/priceMapping';
import { startCheckout } from '@/lib/billing/checkoutClient';

interface PricingSectionProps {
  lang: Locale;
}

export default function PricingSection({ lang }: PricingSectionProps) {
  const l = lang;
  const router = useRouter();
  const { status } = useSession();
  const [interval, setInterval] = useState<BillingInterval>('month');
  const [busy, setBusy] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const title = l === 'el' ? 'Απλό, ξεκάθαρο pricing' : 'Simple, transparent pricing';
  const subtitle =
    l === 'el'
      ? 'Ξεκινήστε δωρεάν. Αναβαθμίστε όταν το χρειαστείτε. Χωρίς κρυφές χρεώσεις.'
      : 'Start free. Upgrade when you need it. No hidden fees.';
  const perMonth = l === 'el' ? '/μήνα' : '/month';
  const billedAnnually = l === 'el' ? 'χρεώνεται ετησίως' : 'billed annually';
  const monthlyLabel = l === 'el' ? 'Μηνιαία' : 'Monthly';
  const annualLabel = l === 'el' ? 'Ετήσια' : 'Annual';
  const saveLabel = l === 'el' ? 'Οικονομία' : 'Save';

  const handleCta = async (plan: PlanId) => {
    setError(null);

    // Free tier → start using the product (or sign up first).
    if (!isBillablePlan(plan)) {
      router.push(
        status === 'authenticated'
          ? localePath('/transcribe', lang)
          : localePath('/register', lang)
      );
      return;
    }

    // Paid tiers require an account before checkout.
    if (status !== 'authenticated') {
      router.push(localePath('/login', lang));
      return;
    }

    setBusy(plan);
    // Seats are a coming-soon (team) concern; default Newsroom to 1 seat for now.
    const result = await startCheckout(plan, interval);
    if (result.error) {
      setError(result.error);
      setBusy(null);
    }
    // On success the browser is redirected to Stripe.
  };

  return (
    <section className="relative bg-slate-950 py-24 px-6 overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full bg-linear-to-br from-blue-500 to-cyan-500"></div>
      </div>

      <div className="relative max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-5xl md:text-6xl font-black text-white mb-6">{title}</h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">{subtitle}</p>
        </div>

        {/* Billing interval toggle */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white/10 border border-white/10">
            <button
              type="button"
              onClick={() => setInterval('month')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                interval === 'month' ? 'bg-white text-slate-900' : 'text-slate-300 hover:text-white'
              }`}
            >
              {monthlyLabel}
            </button>
            <button
              type="button"
              onClick={() => setInterval('year')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                interval === 'year' ? 'bg-white text-slate-900' : 'text-slate-300 hover:text-white'
              }`}
            >
              {annualLabel}
              <span className="ml-1 text-emerald-400">{saveLabel} ~22%</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-8 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 text-center">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pricingPlans.map((plan) => {
            const name = plan.name[l];
            const features = plan.features[l];
            const cta = plan.cta[l];
            const isPaid = plan.monthlyPrice > 0;
            const shownPrice =
              interval === 'year' && isPaid ? plan.annualPrice : plan.monthlyPrice;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col p-8 rounded-2xl border ${
                  plan.highlighted
                    ? 'bg-white text-slate-900 border-blue-400 shadow-2xl shadow-blue-500/30'
                    : 'bg-white/5 text-white border-white/10'
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-bold text-white bg-blue-600 rounded-full">
                    {l === 'el' ? 'Δημοφιλές' : 'Popular'}
                  </span>
                )}

                <h3 className="text-2xl font-bold mb-2">{name}</h3>

                <div className="mb-1">
                  <span className="text-4xl font-black">€{shownPrice}</span>
                  <span className={`text-sm ${plan.highlighted ? 'text-slate-500' : 'text-slate-400'}`}>
                    {perMonth}
                    {plan.perSeat ? ` / ${l === 'el' ? 'θέση' : 'seat'}` : ''}
                  </span>
                </div>

                {isPaid && interval === 'year' && (
                  <div className={`text-xs mb-4 ${plan.highlighted ? 'text-slate-500' : 'text-slate-400'}`}>
                    {billedAnnually} (€{plan.annualPrice * 12}
                    {plan.perSeat ? ` / ${l === 'el' ? 'θέση' : 'seat'}` : ''}/{l === 'el' ? 'έτος' : 'yr'})
                  </div>
                )}
                {isPaid && interval === 'month' && (
                  <div className={`text-xs mb-4 ${plan.highlighted ? 'text-slate-500' : 'text-slate-400'}`}>
                    €{plan.annualPrice}{perMonth} {billedAnnually}
                  </div>
                )}
                {!isPaid && <div className="text-xs mb-4">&nbsp;</div>}

                <div className={`text-sm font-medium mb-6 ${plan.highlighted ? 'text-blue-600' : 'text-blue-300'}`}>
                  {plan.hoursLabel[l]}
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {features.map((feature) => {
                    // A line ending in ":" is an "Everything in X, plus:" group header,
                    // not a checkmarked feature.
                    if (feature.endsWith(':')) {
                      return (
                        <li
                          key={feature}
                          className={`text-xs font-semibold uppercase tracking-wide pt-1 ${
                            plan.highlighted ? 'text-slate-500' : 'text-slate-400'
                          }`}
                        >
                          {feature}
                        </li>
                      );
                    }
                    return (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check
                          className={`w-4 h-4 mt-0.5 shrink-0 ${plan.highlighted ? 'text-blue-600' : 'text-emerald-400'}`}
                        />
                        <span className={plan.highlighted ? 'text-slate-700' : 'text-slate-300'}>
                          {feature}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <button
                  onClick={() => handleCta(plan.id)}
                  disabled={busy === plan.id}
                  className={`w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60 ${
                    plan.highlighted
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                  }`}
                >
                  {busy === plan.id && <Loader2 className="w-4 h-4 animate-spin" />}
                  {cta}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
