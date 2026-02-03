'use client';

import { createContext, useContext, ReactNode } from 'react';
import { type Locale } from '@/i18n/config';

interface TranslationsContextValue {
  t: any;
  lang: Locale;
}

const TranslationsContext = createContext<TranslationsContextValue | null>(null);

interface TranslationsProviderProps {
  children: ReactNode;
  translations: any;
  lang: Locale;
}

export function TranslationsProvider({ children, translations, lang }: TranslationsProviderProps) {
  return (
    <TranslationsContext.Provider value={{ t: translations, lang }}>
      {children}
    </TranslationsContext.Provider>
  );
}

export function useTranslations() {
  const context = useContext(TranslationsContext);
  if (!context) {
    throw new Error('useTranslations must be used within a TranslationsProvider');
  }
  return context;
}
