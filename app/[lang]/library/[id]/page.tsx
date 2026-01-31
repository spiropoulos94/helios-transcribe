import { type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import LibraryDetailClient from '@/components/LibraryDetailClient';

export default async function LibraryDetailPage({
  params,
}: {
  params: Promise<{ lang: Locale; id: string }>;
}) {
  const { lang, id } = await params;
  const dict = await getDictionary(lang);

  return <LibraryDetailClient translations={dict} lang={lang} id={id} />;
}
