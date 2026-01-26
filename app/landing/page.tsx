import { Mail, ArrowRight, Sparkles } from 'lucide-react';
import Logo from '@/components/Logo';

export default function LandingPage() {
  return (
    <div className="flex-1 bg-slate-950">
      {/* Hero - Full bleed with dramatic gradient */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
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
            Greek meetings.<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500">
              Transcribed perfectly.
            </span>
          </h1>

          <p className="text-2xl md:text-3xl text-slate-300 mb-8 max-w-3xl leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700">
            Professional transcription for institutions that demand accuracy, reliability, and clarity.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <a
              href="mailto:contact@grecho.gr"
              className="group inline-flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white text-lg font-semibold rounded-xl transition-all hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/50"
            >
              <Mail className="w-6 h-6" />
              Request Access
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
              Built For Institutions
            </h2>
          </div>
          <h2 className="text-5xl md:text-6xl font-black text-slate-900 mb-16">
            Who uses Grecho
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="group relative p-8 bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl border-2 border-slate-200 hover:border-blue-400 transition-all hover:shadow-xl hover:-translate-y-1">
              <div className="absolute top-8 right-8 text-7xl font-black text-blue-100 group-hover:text-blue-200 transition-colors">01</div>
              <h3 className="relative text-2xl font-bold text-slate-900 mb-3">
                Municipalities & Local Authorities
              </h3>
              <p className="relative text-slate-600 text-lg">
                Council meetings, public sessions, and official proceedings requiring accurate documentation.
              </p>
            </div>

            <div className="group relative p-8 bg-gradient-to-br from-slate-50 to-cyan-50 rounded-2xl border-2 border-slate-200 hover:border-cyan-400 transition-all hover:shadow-xl hover:-translate-y-1">
              <div className="absolute top-8 right-8 text-7xl font-black text-cyan-100 group-hover:text-cyan-200 transition-colors">02</div>
              <h3 className="relative text-2xl font-bold text-slate-900 mb-3">
                Universities & Research
              </h3>
              <p className="relative text-slate-600 text-lg">
                Academic discussions, research meetings, and institutional decisions that need clear records.
              </p>
            </div>

            <div className="group relative p-8 bg-gradient-to-br from-slate-50 to-purple-50 rounded-2xl border-2 border-slate-200 hover:border-purple-400 transition-all hover:shadow-xl hover:-translate-y-1">
              <div className="absolute top-8 right-8 text-7xl font-black text-purple-100 group-hover:text-purple-200 transition-colors">03</div>
              <h3 className="relative text-2xl font-bold text-slate-900 mb-3">
                Public Organizations
              </h3>
              <p className="relative text-slate-600 text-lg">
                Committee meetings, board sessions, and formal discussions requiring official transcripts.
              </p>
            </div>

            <div className="group relative p-8 bg-gradient-to-br from-slate-50 to-indigo-50 rounded-2xl border-2 border-slate-200 hover:border-indigo-400 transition-all hover:shadow-xl hover:-translate-y-1">
              <div className="absolute top-8 right-8 text-7xl font-black text-indigo-100 group-hover:text-indigo-200 transition-colors">04</div>
              <h3 className="relative text-2xl font-bold text-slate-900 mb-3">
                Professional Teams
              </h3>
              <p className="relative text-slate-600 text-lg">
                Legal, academic, and professional environments where precision and accountability matter.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What it does - Feature showcase */}
      <section className="relative bg-slate-950 py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500 to-cyan-500"></div>
        </div>

        <div className="relative max-w-5xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-black text-white mb-20 text-center">
            Powerful features for<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              professional transcription
            </span>
          </h2>

          <div className="space-y-16">
            <div className="flex flex-col md:flex-row items-start gap-8 p-8 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
              <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-3xl font-black text-white shadow-lg shadow-blue-500/50">
                1
              </div>
              <div>
                <h3 className="text-3xl font-bold text-white mb-3">
                  High-accuracy Greek transcription
                </h3>
                <p className="text-xl text-slate-300 leading-relaxed">
                  Optimized specifically for formal Greek speech patterns, multiple speakers, and extended meeting durations. Built to understand the nuances of professional discourse.
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-start gap-8 p-8 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
              <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center text-3xl font-black text-white shadow-lg shadow-cyan-500/50">
                2
              </div>
              <div>
                <h3 className="text-3xl font-bold text-white mb-3">
                  Speaker identification & timestamps
                </h3>
                <p className="text-xl text-slate-300 leading-relaxed">
                  Automatically identify and label different speakers. Navigate through hours of discussion with precise timestamps and clear attribution.
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-start gap-8 p-8 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
              <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-3xl font-black text-white shadow-lg shadow-purple-500/50">
                3
              </div>
              <div>
                <h3 className="text-3xl font-bold text-white mb-3">
                  Searchable meeting archives
                </h3>
                <p className="text-xl text-slate-300 leading-relaxed">
                  Find any decision, statement, or topic instantly across your entire meeting history. Transform audio archives into searchable knowledge bases.
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-start gap-8 p-8 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
              <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center text-3xl font-black text-white shadow-lg shadow-indigo-500/50">
                4
              </div>
              <div>
                <h3 className="text-3xl font-bold text-white mb-3">
                  Export official records
                </h3>
                <p className="text-xl text-slate-300 leading-relaxed">
                  Download transcripts in formats ready for archiving, compliance reporting, and official documentation. Seamlessly integrate with your existing workflows.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Official use - Split design */}
      <section className="bg-gradient-to-br from-slate-50 to-blue-50 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-5xl md:text-6xl font-black text-slate-900 mb-8 leading-tight">
                Built for environments where accuracy matters
              </h2>
              <p className="text-2xl text-slate-600 leading-relaxed mb-8">
                Grecho isn't a generic transcription tool.<br/>
                It's engineered for official use.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4 p-6 bg-white rounded-xl shadow-lg border-l-4 border-blue-600 hover:shadow-xl transition-shadow">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-xl text-slate-700">
                  Suitable for council meetings and formal sessions
                </p>
              </div>
              <div className="flex items-start gap-4 p-6 bg-white rounded-xl shadow-lg border-l-4 border-cyan-600 hover:shadow-xl transition-shadow">
                <div className="w-2 h-2 bg-cyan-600 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-xl text-slate-700">
                  Supports long-form discussions and structured debates
                </p>
              </div>
              <div className="flex items-start gap-4 p-6 bg-white rounded-xl shadow-lg border-l-4 border-purple-600 hover:shadow-xl transition-shadow">
                <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-xl text-slate-700">
                  Designed with institutional workflows in mind
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Data & reliability - Minimal cards */}
      <section className="bg-white py-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-black text-slate-900 mb-16">
            Secure & reliable
          </h2>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="p-8 bg-slate-50 rounded-2xl border-2 border-slate-200 hover:border-blue-400 transition-colors">
              <div className="text-5xl mb-4">🔒</div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                Secure processing
              </h3>
              <p className="text-slate-600">
                Your audio files are processed with enterprise-grade security
              </p>
            </div>

            <div className="p-8 bg-slate-50 rounded-2xl border-2 border-slate-200 hover:border-cyan-400 transition-colors">
              <div className="text-5xl mb-4">📋</div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                Clear practices
              </h3>
              <p className="text-slate-600">
                Transparent data handling and compliance-ready workflows
              </p>
            </div>

            <div className="p-8 bg-slate-50 rounded-2xl border-2 border-slate-200 hover:border-purple-400 transition-colors">
              <div className="text-5xl mb-4">⚡</div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                Reliable performance
              </h3>
              <p className="text-slate-600">
                Consistent results for scheduled and repeated use
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-500">
            Additional compliance and deployment options available upon request
          </p>
        </div>
      </section>

      {/* CTA - Bold and centered */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600 py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white rounded-full filter blur-3xl animate-pulse"></div>
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="text-5xl md:text-7xl font-black text-white mb-8 leading-tight">
            Ready for a pilot?
          </h2>
          <p className="text-2xl md:text-3xl text-blue-100 mb-12 leading-relaxed">
            Grecho is available through direct onboarding and pilot programs for institutions and professional teams.
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
            Made in Greece, for Greek
          </h2>
          <p className="text-2xl text-slate-300 leading-relaxed">
            Grecho is developed in Greece with deep understanding of the Greek language and the specific needs of public and professional organizations.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <Logo width={140} />
          <p className="text-slate-400 text-lg">
            © 2025 Grecho — Professional Greek transcription
          </p>
        </div>
      </footer>
    </div>
  );
}
