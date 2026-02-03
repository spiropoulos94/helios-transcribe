import { Sparkles } from 'lucide-react';

interface WhoUsesSectionProps {
  translations: any;
}

const cardColors = [
  { bg: 'bg-linear-to-br from-slate-50 to-blue-50', border: 'hover:border-blue-400', number: 'text-blue-100 group-hover:text-blue-200' },
  { bg: 'bg-linear-to-br from-slate-50 to-cyan-50', border: 'hover:border-cyan-400', number: 'text-cyan-100 group-hover:text-cyan-200' },
  { bg: 'bg-linear-to-br from-slate-50 to-purple-50', border: 'hover:border-purple-400', number: 'text-purple-100 group-hover:text-purple-200' },
  { bg: 'bg-linear-to-br from-slate-50 to-indigo-50', border: 'hover:border-indigo-400', number: 'text-indigo-100 group-hover:text-indigo-200' },
];

export default function WhoUsesSection({ translations: t }: WhoUsesSectionProps) {
  return (
    <section className="bg-white py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-8 h-8 text-blue-600" />
          <h2 className="text-sm font-bold text-blue-600 uppercase tracking-wider">{t.whoUsesSection.badge}</h2>
        </div>
        <h2 className="text-5xl md:text-6xl font-black text-slate-900 mb-16">{t.whoUsesSection.title}</h2>

        <div className="grid md:grid-cols-2 gap-8">
          {t.whoUsesSection.cards.map((card: any, index: number) => {
            const colors = cardColors[index];
            return (
              <div
                key={index}
                className={`group relative p-8 ${colors.bg} rounded-2xl border-2 border-slate-200 ${colors.border} transition-all hover:shadow-xl hover:-translate-y-1`}
              >
                <div className={`absolute top-8 right-8 text-7xl font-black ${colors.number} transition-colors`}>
                  {String(index + 1).padStart(2, '0')}
                </div>
                <h3 className="relative text-2xl font-bold text-slate-900 mb-3">{card.title}</h3>
                <p className="relative text-slate-600 text-lg">{card.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
