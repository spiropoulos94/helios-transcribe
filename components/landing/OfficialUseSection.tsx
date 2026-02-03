interface OfficialUseSectionProps {
  translations: any;
}

const colors = [
  { border: 'border-blue-600', dot: 'bg-blue-600' },
  { border: 'border-cyan-600', dot: 'bg-cyan-600' },
  { border: 'border-purple-600', dot: 'bg-purple-600' },
];

export default function OfficialUseSection({ translations: t }: OfficialUseSectionProps) {
  return (
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
            {t.officialUseSection.points.map((point: string, index: number) => (
              <div
                key={index}
                className={`flex items-start gap-4 p-6 bg-white rounded-xl shadow-lg border-l-4 ${colors[index].border} hover:shadow-xl transition-shadow`}
              >
                <div className={`w-2 h-2 ${colors[index].dot} rounded-full mt-2 shrink-0`}></div>
                <p className="text-xl text-slate-700">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
