'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Library, Menu, X, LogIn, LogOut, FileAudio } from 'lucide-react';
import Logo from './Logo';
import { LanguageToggle } from './LanguageToggle';
import { useTranslations } from '@/contexts/TranslationsContext';
import { localePath } from '@/i18n/config';

export const Header: React.FC = () => {
  const { t, lang } = useTranslations();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAuthenticated = status === 'authenticated';

  const navItems = [
    { href: localePath('/transcribe', lang), label: t.header.transcribe, icon: FileAudio },
    { href: localePath('/library', lang), label: t.header.library, icon: Library },
  ];

  const handleSignOut = async () => {
    await signOut({ callbackUrl: localePath('/', lang) });
  };

  return (
    <header className="w-full py-3 px-4 sm:px-8 border-b border-slate-200 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 sm:gap-8">
        <Link href={localePath('/', lang)} className="flex items-center gap-3 shrink-0 hover:opacity-90 transition-opacity">
          <Logo width={125} />
        </Link>

        {isAuthenticated && (
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        )}

        <div className="flex items-center gap-2">
          <LanguageToggle currentLang={lang} />

          {status === 'loading' ? (
            <div className="hidden md:block w-24 h-10 rounded-lg bg-slate-100 animate-pulse" />
          ) : isAuthenticated ? (
            <button
              onClick={handleSignOut}
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>{t.auth?.logout || 'Sign Out'}</span>
            </button>
          ) : (
            <Link
              href={localePath('/login', lang)}
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <LogIn className="w-5 h-5" />
              <span>{t.auth?.login || 'Sign In'}</span>
            </Link>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <nav className="md:hidden mt-3 pt-3 border-t border-slate-200">
          <div className="flex flex-col gap-1">
            {isAuthenticated && navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {isAuthenticated ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleSignOut();
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>{t.auth?.logout || 'Sign Out'}</span>
              </button>
            ) : (
              <Link
                href={localePath('/login', lang)}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <LogIn className="w-5 h-5" />
                <span>{t.auth?.login || 'Sign In'}</span>
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
};
