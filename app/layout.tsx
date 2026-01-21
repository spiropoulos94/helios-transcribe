import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'greek'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Helios Transcribe - YouTube to Greek',
  description: 'AI-Powered Greek Transcription using Gemini 2.5 Flash',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
