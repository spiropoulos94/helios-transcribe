import { Mail, ArrowRight } from 'lucide-react';
import Logo from '@/components/Logo';

interface HeroSectionProps {
  translations: any;
}

export default function HeroSection({ translations: t }: HeroSectionProps) {
  return (
    <section className="relative min-h-[85vh] flex items-center overflow-hidden bg-linear-to-br from-slate-950 via-blue-950 to-slate-900">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-20">
        <div className="mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <Logo width={200} />
        </div>

        <h1 className="text-6xl md:text-8xl font-black text-white mb-8 tracking-tight leading-none animate-in fade-in slide-in-from-bottom-8 duration-700">
          {t.hero.title1}
          <br />
          <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-400 via-cyan-400 to-blue-500">
            {t.hero.title2}
          </span>
        </h1>

        <p className="text-2xl md:text-3xl text-slate-300 mb-8 max-w-3xl leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700">
          {t.hero.subtitle}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <a
            href="mailto:contact@grecho.gr"
            className="group inline-flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white text-lg font-semibold rounded-xl transition-all hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/50"
          >
            <Mail className="w-6 h-6" />
            {t.hero.cta}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </div>
    </section>
  );
}
