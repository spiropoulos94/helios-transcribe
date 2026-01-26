'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Library, Info } from 'lucide-react';
import Logo from './Logo';
import { LanguageToggle } from './LanguageToggle';
import { type Locale } from '@/i18n/config';

interface HeaderProps {
  lang: Locale;
  translations: any;
}

export const Header: React.FC<HeaderProps> = ({ lang, translations: t }) => {
  const pathname = usePathname();

  const navItems = [
    { href: `/${lang}`, label: t.transcribe, icon: Home },
    { href: `/${lang}/library`, label: t.library, icon: Library },
    { href: `/${lang}/landing`, label: t.about, icon: Info },
  ];

  return (
    <header className="w-full py-3 px-4 sm:px-8 border-b border-slate-200 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
        {/* Branding - Left */}
        <Link
          href={`/${lang}`}
          className="flex items-center gap-3 shrink-0 hover:opacity-90 transition-opacity"
        >
          <Logo width={125} />
        </Link>

        {/* Navigation - Center */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Language Toggle - Right */}
        <LanguageToggle currentLang={lang} />
      </div>
    </header>
  );
};
