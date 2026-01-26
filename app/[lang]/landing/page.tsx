import { Mail, ArrowRight, Sparkles } from 'lucide-react';
import Logo from '@/components/Logo';
import { getDictionary } from '@/i18n/dictionaries';
import { type Locale } from '@/i18n/config';

export default async function LandingPage({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const t = dict.landing;

  // Color classes that Tailwind can detect at build time
  const cardColors = [
    {
      bg: 'bg-linear-to-br from-slate-50 to-blue-50',
      border: 'hover:border-blue-400',
      number: 'text-blue-100 group-hover:text-blue-200',
    },
    {
      bg: 'bg-linear-to-br from-slate-50 to-cyan-50',
      border: 'hover:border-cyan-400',
      number: 'text-cyan-100 group-hover:text-cyan-200',
    },
    {
      bg: 'bg-linear-to-br from-slate-50 to-purple-50',
      border: 'hover:border-purple-400',
      number: 'text-purple-100 group-hover:text-purple-200',
    },
    {
      bg: 'bg-linear-to-br from-slate-50 to-indigo-50',
      border: 'hover:border-indigo-400',
      number: 'text-indigo-100 group-hover:text-indigo-200',
    },
  ];

  const featureBadges = [
    'bg-linear-to-br from-blue-500 to-blue-600 shadow-blue-500/50',
    'bg-linear-to-br from-cyan-500 to-cyan-600 shadow-cyan-500/50',
    'bg-linear-to-br from-purple-500 to-purple-600 shadow-purple-500/50',
    'bg-linear-to-br from-indigo-500 to-indigo-600 shadow-indigo-500/50',
  ];

  const officialUseColors = [
    { border: 'border-blue-600', dot: 'bg-blue-600' },
    { border: 'border-cyan-600', dot: 'bg-cyan-600' },
    { border: 'border-purple-600', dot: 'bg-purple-600' },
  ];

  const securityColors = [
    'hover:border-blue-400',
    'hover:border-cyan-400',
    'hover:border-purple-400',
  ];

  return (
    <div className="flex-1 bg-slate-950">
      {/* Hero - Full bleed with dramatic gradient */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden bg-linear-to-br from-slate-950 via-blue-950 to-slate-900">
        {/* Animated background elements */}
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

      {/* Who it's for - Bold cards */}
      <section className="bg-white py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-8 h-8 text-blue-600" />
            <h2 className="text-sm font-bold text-blue-600 uppercase tracking-wider">
              {t.whoUsesSection.badge}
            </h2>
          </div>
          <h2 className="text-5xl md:text-6xl font-black text-slate-900 mb-16">
            {t.whoUsesSection.title}
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {t.whoUsesSection.cards.map((card, index) => {
              const colors = cardColors[index];

              return (
                <div
                  key={index}
                  className={`group relative p-8 ${colors.bg} rounded-2xl border-2 border-slate-200 ${colors.border} transition-all hover:shadow-xl hover:-translate-y-1`}
                >
                  <div
                    className={`absolute top-8 right-8 text-7xl font-black ${colors.number} transition-colors`}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <h3 className="relative text-2xl font-bold text-slate-900 mb-3">
                    {card.title}
                  </h3>
                  <p className="relative text-slate-600 text-lg">
                    {card.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* What it does - Feature showcase */}
      <section className="relative bg-slate-950 py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-linear-to-br from-blue-500 to-cyan-500"></div>
        </div>

        <div className="relative max-w-5xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-black text-white mb-20 text-center">
            {t.featuresSection.title1}
            <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-cyan-400">
              {t.featuresSection.title2}
            </span>
          </h2>

          <div className="space-y-16">
            {t.featuresSection.features.map((feature, index) => (
              <div
                key={index}
                className="flex flex-col md:flex-row items-start gap-8 p-8 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:bg-white/10 transition-all"
              >
                <div
                  className={`shrink-0 w-16 h-16 ${featureBadges[index]} rounded-xl flex items-center justify-center text-3xl font-black text-white shadow-lg`}
                >
                  {index + 1}
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-xl text-slate-300 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Official use - Split design */}
      <section className="bg-linear-to-br from-slate-50 to-blue-50 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-5xl md:text-6xl font-black text-slate-900 mb-8 leading-tight">
                {t.officialUseSection.title}
              </h2>
              <p className="text-2xl text-slate-600 leading-relaxed mb-8">
                {t.officialUseSection.subtitle1}
                <br />
                {t.officialUseSection.subtitle2}
              </p>
            </div>

            <div className="space-y-6">
              {t.officialUseSection.points.map((point, index) => {
                const colors = officialUseColors[index];

                return (
                  <div
                    key={index}
                    className={`flex items-start gap-4 p-6 bg-white rounded-xl shadow-lg border-l-4 ${colors.border} hover:shadow-xl transition-shadow`}
                  >
                    <div
                      className={`w-2 h-2 ${colors.dot} rounded-full mt-2 shrink-0`}
                    ></div>
                    <p className="text-xl text-slate-700">{point}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Data & reliability - Minimal cards */}
      <section className="bg-white py-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-black text-slate-900 mb-16">
            {t.securitySection.title}
          </h2>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {t.securitySection.cards.map((card, index) => {
              const emojis = ['🔒', '📋', '⚡'];

              return (
                <div
                  key={index}
                  className={`p-8 bg-slate-50 rounded-2xl border-2 border-slate-200 ${securityColors[index]} transition-colors`}
                >
                  <div className="text-5xl mb-4">{emojis[index]}</div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    {card.title}
                  </h3>
                  <p className="text-slate-600">{card.description}</p>
                </div>
              );
            })}
          </div>

          <p className="text-sm text-slate-500">{t.securitySection.note}</p>
        </div>
      </section>

      {/* CTA - Bold and centered */}
      <section className="relative bg-linear-to-br from-blue-600 via-blue-700 to-cyan-600 py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white rounded-full filter blur-3xl animate-pulse"></div>
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="text-5xl md:text-7xl font-black text-white mb-8 leading-tight">
            {t.ctaSection.title}
          </h2>
          <p className="text-2xl md:text-3xl text-blue-100 mb-12 leading-relaxed">
            {t.ctaSection.subtitle}
          </p>

          <a
            href="mailto:contact@grecho.gr"
            className="group inline-flex items-center gap-4 px-10 py-6 bg-white text-blue-600 text-xl font-bold rounded-2xl hover:bg-blue-50 transition-all hover:scale-105 hover:shadow-2xl"
          >
            <Mail className="w-7 h-7" />
            contact@grecho.gr
            <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
          </a>
        </div>
      </section>

      {/* About - Clean */}
      <section className="bg-slate-950 py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-black text-white mb-6">
            {t.aboutSection.title}
          </h2>
          <p className="text-2xl text-slate-300 leading-relaxed">
            {t.aboutSection.description}
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <Logo width={140} />
          <p className="text-slate-400 text-lg">{t.footer.copyright}</p>
        </div>
      </footer>
    </div>
  );
}
