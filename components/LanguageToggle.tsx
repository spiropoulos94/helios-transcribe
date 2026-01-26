'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { type Locale } from '@/i18n/config';

export function LanguageToggle({ currentLang }: { currentLang: Locale }) {
  const pathname = usePathname();

  // Remove the current locale from pathname to get the base path
  const pathWithoutLocale = pathname.replace(/^\/(en|el)/, '') || '/';

  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
      <Link
        href={`/en${pathWithoutLocale}`}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          currentLang === 'en'
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        EN
      </Link>
      <Link
        href={`/el${pathWithoutLocale}`}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          currentLang === 'el'
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        ΕΛ
      </Link>
    </div>
  );
}
