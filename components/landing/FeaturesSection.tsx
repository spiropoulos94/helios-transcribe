interface FeaturesSectionProps {
  translations: any;
}

const featureBadges = [
  'bg-linear-to-br from-blue-500 to-blue-600 shadow-blue-500/50',
  'bg-linear-to-br from-cyan-500 to-cyan-600 shadow-cyan-500/50',
  'bg-linear-to-br from-purple-500 to-purple-600 shadow-purple-500/50',
  'bg-linear-to-br from-indigo-500 to-indigo-600 shadow-indigo-500/50',
];

export default function FeaturesSection({ translations: t }: FeaturesSectionProps) {
  return (
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
          {t.featuresSection.features.map((feature: any, index: number) => (
            <div
              key={index}
              className="flex flex-col md:flex-row items-start gap-8 p-8 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:bg-white/10 transition-all"
            >
              <div className={`shrink-0 w-16 h-16 ${featureBadges[index]} rounded-xl flex items-center justify-center text-3xl font-black text-white shadow-lg`}>
                {index + 1}
              </div>
              <div>
                <h3 className="text-3xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-xl text-slate-300 leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
