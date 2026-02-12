'use client';

import { useState } from 'react';
import { Mail, ArrowRight } from 'lucide-react';
import ContactFormModal from './ContactFormModal';

interface CTASectionProps {
  translations: any;
}

export default function CTASection({ translations: t }: CTASectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
    <section className="relative bg-linear-to-br from-blue-600 via-blue-700 to-cyan-600 py-32 px-6 overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white rounded-full filter blur-3xl animate-pulse"></div>
      </div>

      <div className="relative max-w-4xl mx-auto text-center">
        <h2 className="text-5xl md:text-7xl font-black text-white mb-8 leading-tight">{t.ctaSection.title}</h2>
        <p className="text-2xl md:text-3xl text-blue-100 mb-12 leading-relaxed">{t.ctaSection.subtitle}</p>

        <button
          onClick={() => setIsModalOpen(true)}
          className="group inline-flex items-center gap-4 px-10 py-6 bg-white text-blue-600 text-xl font-bold rounded-2xl hover:bg-blue-50 transition-all hover:scale-105 hover:shadow-2xl"
        >
          <Mail className="w-7 h-7" />
          {t.ctaSection.cta || t.hero?.cta || 'Request Access'}
          <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
        </button>
      </div>
    </section>

    <ContactFormModal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      translations={t.contactForm || {}}
    />
    </>
  );
}
