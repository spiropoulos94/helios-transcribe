import { type Locale } from '@/i18n/config';
import PricingSection from '@/components/landing/PricingSection';

export default async function PricingPage({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;

  return (
    <div className="flex-1 bg-slate-950">
      <PricingSection lang={lang} />
    </div>
  );
}
