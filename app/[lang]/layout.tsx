import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { i18n, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
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
  const dict = await getDictionary(lang);

  return (
    <html lang={lang} className={inter.className}>
      <body className="bg-slate-50 text-slate-900 antialiased flex flex-col min-h-screen">
        <Header lang={lang} translations={dict.header} />
        <div className="flex-1 flex flex-col">
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
