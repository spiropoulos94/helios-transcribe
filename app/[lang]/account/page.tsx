import { type Locale } from '@/i18n/config';
import AccountBillingClient from '@/components/billing/AccountBillingClient';

export default async function AccountPage({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;

  return (
    <div className="flex-1 bg-slate-950">
      <AccountBillingClient lang={lang} />
    </div>
  );
}
