import { type Locale } from '@/i18n/config';
import LibraryDetailClient from '@/components/LibraryDetailClient';

export default async function LibraryDetailPage({
  params,
}: {
  params: Promise<{ lang: Locale; id: string }>;
}) {
  const { id } = await params;

  return <LibraryDetailClient id={id} />;
}
