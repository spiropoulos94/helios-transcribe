'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { type Locale } from '@/i18n/config';

export function LanguageToggle({ currentLang }: { currentLang: Locale }) {
  const pathname = usePathname();

  // Remove the current locale from pathname to get the base path
  const pathWithoutLocale = pathname.replace(/^\/(en|el)/, '') || '/';

  // Greek (default) has no prefix, English has /en prefix
  const greekHref = pathWithoutLocale;
  const englishHref = `/en${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`;

  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
      <Link
        href={greekHref}
        className={`px-2.5 py-1.5 text-lg rounded-md transition-colors ${
          currentLang === 'el'
            ? 'bg-white shadow-sm'
            : 'opacity-60 hover:opacity-100'
        }`}
        title="Ελληνικά"
      >
        🇬🇷
      </Link>
      <Link
        href={englishHref}
        className={`px-2.5 py-1.5 text-lg rounded-md transition-colors ${
          currentLang === 'en'
            ? 'bg-white shadow-sm'
            : 'opacity-60 hover:opacity-100'
        }`}
        title="English"
      >
        🇬🇧
      </Link>
    </div>
  );
}
