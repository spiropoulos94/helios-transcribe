import { getDictionary } from '@/i18n/dictionaries';
import { type Locale } from '@/i18n/config';
import HeroSection from '@/components/landing/HeroSection';
import WhoUsesSection from '@/components/landing/WhoUsesSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import OfficialUseSection from '@/components/landing/OfficialUseSection';
import SecuritySection from '@/components/landing/SecuritySection';
import CTASection from '@/components/landing/CTASection';
import AboutSection from '@/components/landing/AboutSection';
import LandingFooter from '@/components/landing/LandingFooter';

export default async function Home({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const t = dict.landing;

  return (
    <div className="flex-1 bg-slate-950">
      <HeroSection translations={t} />
      <WhoUsesSection translations={t} />
      <FeaturesSection translations={t} />
      <OfficialUseSection translations={t} />
      <SecuritySection translations={t} />
      <CTASection translations={t} />
      <AboutSection translations={t} />
      <LandingFooter translations={t} />
    </div>
  );
}
