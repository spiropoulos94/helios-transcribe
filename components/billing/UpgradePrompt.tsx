'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { localePath, type Locale } from '@/i18n/config';
import type { PlanId } from '@/lib/pricing/plans';

interface UpgradePromptProps {
  lang: Locale;
  requiredPlan?: PlanId | null;
  message?: string;
  className?: string;
}

const PLAN_LABEL: Record<PlanId, string> = {
  free: 'Free',
  pro: 'Pro',
  creator: 'Creator',
  newsroom: 'Newsroom',
};

/** Small inline lock + upgrade link shown where a feature is gated. */
export default function UpgradePrompt({
  lang,
  requiredPlan,
  message,
  className,
}: UpgradePromptProps) {
  const plan = requiredPlan ? PLAN_LABEL[requiredPlan] : null;
  const text =
    message ??
    (lang === 'el'
      ? plan
        ? `Διαθέσιμο στο πλάνο ${plan}`
        : 'Αναβαθμίστε το πλάνο σας'
      : plan
      ? `Available on the ${plan} plan`
      : 'Upgrade your plan');
  const linkLabel = lang === 'el' ? 'Αναβάθμιση' : 'Upgrade';

  return (
    <div
      className={
        className ??
        'flex items-center gap-2 rounded-lg border border-amber-300/40 bg-amber-50 px-3 py-2 text-sm text-amber-800'
      }
    >
      <Lock className="w-4 h-4 shrink-0" />
      <span className="flex-1">{text}</span>
      <Link
        href={localePath('/pricing', lang)}
        className="font-medium text-blue-600 hover:text-blue-700 underline underline-offset-2"
      >
        {linkLabel}
      </Link>
    </div>
  );
}
