interface SecuritySectionProps {
  translations: any;
}

const securityColors = ['hover:border-blue-400', 'hover:border-cyan-400', 'hover:border-purple-400'];
const emojis = ['🔒', '📋', '⚡'];

export default function SecuritySection({ translations: t }: SecuritySectionProps) {
  return (
    <section className="bg-white py-24 px-6">
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-5xl md:text-6xl font-black text-slate-900 mb-16">{t.securitySection.title}</h2>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {t.securitySection.cards.map((card: any, index: number) => (
            <div
              key={index}
              className={`p-8 bg-slate-50 rounded-2xl border-2 border-slate-200 ${securityColors[index]} transition-colors`}
            >
              <div className="text-5xl mb-4">{emojis[index]}</div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{card.title}</h3>
              <p className="text-slate-600">{card.description}</p>
            </div>
          ))}
        </div>

        <p className="text-sm text-slate-500">{t.securitySection.note}</p>
      </div>
    </section>
  );
}
