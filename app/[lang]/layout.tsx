import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { Header } from '@/components/Header';
import { Providers } from '@/components/Providers';
import { i18n, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { TranslationsProvider } from '@/contexts/TranslationsContext';
import { auth } from '@/auth';
import '../globals.css';

const inter = Inter({
  subsets: ['latin', 'greek'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'GrechoAI - YouTube to Greek',
  description: 'AI-Powered Greek Transcription using Gemini 2.5 Flash',
};

export async function generateStaticParams() {
  return i18n.locales.map((locale) => ({ lang: locale }));
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params as { lang: Locale };
  const [dict, session] = await Promise.all([getDictionary(lang), auth()]);

  return (
    <html lang={lang} className={inter.className}>
      <body className="bg-slate-50 text-slate-900 antialiased flex flex-col min-h-screen">
        <Providers session={session}>
          <TranslationsProvider translations={dict} lang={lang}>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#1e293b',
                color: '#f8fafc',
                borderRadius: '12px',
                padding: '12px 16px',
              },
              success: {
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#f8fafc',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#f8fafc',
                },
              },
            }}
          />
          <Header />
          <div className="flex-1 flex flex-col">
            {children}
          </div>
        </TranslationsProvider>
        </Providers>
      </body>
    </html>
  );
}
