import { type Locale } from '@/i18n/config';
import { pricingPlans } from '@/lib/pricing/plans';
import { Check } from 'lucide-react';

interface PricingSectionProps {
  lang: Locale;
}

export default function PricingSection({ lang }: PricingSectionProps) {
  const l = lang;

  const title = l === 'el' ? 'Απλό, ξεκάθαρο pricing' : 'Simple, transparent pricing';
  const subtitle =
    l === 'el'
      ? 'Ξεκινήστε δωρεάν. Αναβαθμίστε όταν το χρειαστείτε. Χωρίς κρυφές χρεώσεις.'
      : 'Start free. Upgrade when you need it. No hidden fees.';
  const perMonth = l === 'el' ? '/μήνα' : '/month';
  const billedAnnually = l === 'el' ? 'χρεώνεται ετησίως' : 'billed annually';
  const perSeat = l === 'el' ? 'ανά θέση' : 'per seat';

  return (
    <section className="relative bg-slate-950 py-24 px-6 overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full bg-linear-to-br from-blue-500 to-cyan-500"></div>
      </div>

      <div className="relative max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-black text-white mb-6">{title}</h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">{subtitle}</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pricingPlans.map((plan) => {
            const name = plan.name[l];
            const hours = plan.hoursLabel[l];
            const features = plan.features[l];
            const cta = plan.cta[l];

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
                  <span className="text-4xl font-black">
                    {plan.monthlyPrice === 0 ? '€0' : `€${plan.monthlyPrice}`}
                  </span>
                  <span className={`text-sm ${plan.highlighted ? 'text-slate-500' : 'text-slate-400'}`}>
                    {perMonth}
                  </span>
                </div>

                {plan.monthlyPrice > 0 && (
                  <div className={`text-xs mb-4 ${plan.highlighted ? 'text-slate-500' : 'text-slate-400'}`}>
                    €{plan.annualPrice}{perMonth} {billedAnnually}
                  </div>
                )}

                <div className={`text-sm font-medium mb-6 ${plan.highlighted ? 'text-blue-600' : 'text-blue-300'}`}>
                  {hours}
                  {plan.perSeat ? ` ${perSeat}` : ''}
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check
                        className={`w-4 h-4 mt-0.5 shrink-0 ${plan.highlighted ? 'text-blue-600' : 'text-emerald-400'}`}
                      />
                      <span className={plan.highlighted ? 'text-slate-700' : 'text-slate-300'}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-colors ${
                    plan.highlighted
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                  }`}
                >
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
