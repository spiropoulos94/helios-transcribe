'use client';

import { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { openBillingPortal } from '@/lib/billing/checkoutClient';

interface ManageSubscriptionButtonProps {
  label: string;
  className?: string;
}

/** Opens the Stripe Customer Portal (manage / switch / cancel). */
export default function ManageSubscriptionButton({
  label,
  className,
}: ManageSubscriptionButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setError(null);
    setBusy(true);
    const result = await openBillingPortal();
    if (result.error) {
      setError(result.error);
      setBusy(false);
    }
  };

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        onClick={onClick}
        disabled={busy}
        className={
          className ??
          'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-60'
        }
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
        <span>{label}</span>
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
