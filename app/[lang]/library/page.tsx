import { type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import LibraryPageClient from '@/components/LibraryPageClient';

export default async function LibraryPage({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return <LibraryPageClient translations={{ ...dict.library, common: dict.common, libraryDetail: dict.libraryDetail }} lang={lang} />;
}
