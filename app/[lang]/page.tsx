import { type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import TranscribePage from '@/components/TranscribePage';

export default async function Home({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return <TranscribePage
    translations={{
      ...dict.transcribe,
      inputSection: dict.inputSection,
      common: dict.common
    }}
    lang={lang}
  />;
}
