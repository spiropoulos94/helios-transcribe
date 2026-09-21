'use client';

import Link from 'next/link';
import { Check, Sparkles } from 'lucide-react';
import { localePath, type Locale } from '@/i18n/config';
import { useTranslations } from '@/contexts/TranslationsContext';
import { useEntitlements } from '@/lib/hooks/useEntitlements';
import type { PlanId } from '@/lib/pricing/plans';
import ManageSubscriptionButton from './ManageSubscriptionButton';

const PLAN_LABEL: Record<PlanId, string> = {
  free: 'Free',
  pro: 'Pro',
  creator: 'Creator',
  newsroom: 'Newsroom',
};

interface AccountBillingClientProps {
  lang: Locale;
}

export default function AccountBillingClient({ lang }: AccountBillingClientProps) {
  const { t } = useTranslations();
  const { plan, entitlements, usage, loading } = useEntitlements();

  const tr = (key: string, fallback: string): string => t.billing?.[key] || fallback;
  const el = lang === 'el';

  const limit = usage?.limitMinutes ?? null;
  const used = usage?.usedMinutes ?? 0;
  const pct = limit && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const resetsDate = usage?.periodEnd
    ? new Date(usage.periodEnd).toLocaleDateString(el ? 'el-GR' : 'en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 text-white">
      <h1 className="text-3xl font-black mb-8">{tr('title', 'Billing & Plan')}</h1>

      {/* Current plan */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-sm text-slate-400">{tr('currentPlan', 'Current plan')}</div>
            <div className="text-2xl font-bold flex items-center gap-2">
              {PLAN_LABEL[plan]}
              {plan !== 'free' && <Sparkles className="w-5 h-5 text-blue-400" />}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {plan !== 'free' && (
              <ManageSubscriptionButton label={tr('manage', 'Manage subscription')} />
            )}
            <Link
              href={localePath('/pricing', lang)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              {plan === 'free' ? tr('choosePlan', 'Choose a plan') : tr('upgrade', 'Change plan')}
            </Link>
          </div>
        </div>
      </section>

      {/* Usage this period */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6">
        <div className="text-sm text-slate-400 mb-3">{tr('usageTitle', 'Usage this period')}</div>
        {loading ? (
          <div className="h-6 w-40 rounded bg-white/10 animate-pulse" />
        ) : limit === null ? (
          <div className="text-lg font-semibold">
            {Math.round(used)} min · {tr('unlimited', 'Unlimited')}
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-lg font-semibold">
                {Math.round(used)} / {limit} {el ? 'λεπτά' : 'min'}
              </span>
              {resetsDate && (
                <span className="text-xs text-slate-400">
                  {tr('resets', 'Resets')} {resetsDate}
                </span>
              )}
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full ${pct >= 100 ? 'bg-red-500' : 'bg-blue-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </>
        )}
      </section>

      {/* Feature summary */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="text-sm text-slate-400 mb-3">{tr('features', 'Your features')}</div>
        <ul className="grid sm:grid-cols-2 gap-2 text-sm">
          <FeatureRow ok label={el ? 'Exports' : 'Exports'} value={entitlements.features.allowedExports.join(', ')} />
          <FeatureRow ok={!entitlements.features.watermark} label={el ? 'Χωρίς watermark' : 'No watermark'} />
          <FeatureRow ok={entitlements.features.aiTools.length > 0} label={el ? 'AI εργαλεία' : 'AI tools'} value={String(entitlements.features.aiTools.length)} />
          <FeatureRow ok={entitlements.features.highlights} label={el ? 'Highlights & quotes' : 'Highlights & quotes'} />
          <FeatureRow ok={entitlements.features.rss} label={el ? 'RSS auto-import' : 'RSS auto-import'} />
          <FeatureRow ok={entitlements.features.priorityProcessing} label={el ? 'Προτεραιότητα' : 'Priority processing'} />
          <FeatureRow ok={entitlements.features.team} label={el ? 'Ομαδικό workspace' : 'Team workspace'} />
        </ul>
      </section>
    </div>
  );
}

function FeatureRow({ ok, label, value }: { ok: boolean; label: string; value?: string }) {
  return (
    <li className="flex items-center gap-2">
      <Check className={`w-4 h-4 shrink-0 ${ok ? 'text-emerald-400' : 'text-slate-600'}`} />
      <span className={ok ? 'text-slate-200' : 'text-slate-500 line-through'}>{label}</span>
      {value && <span className="text-slate-400">— {value}</span>}
    </li>
  );
}
