interface AboutSectionProps {
  translations: any;
}

export default function AboutSection({ translations: t }: AboutSectionProps) {
  return (
    <section className="bg-slate-950 py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl font-black text-white mb-6">{t.aboutSection.title}</h2>
        <p className="text-2xl text-slate-300 leading-relaxed">{t.aboutSection.description}</p>
      </div>
    </section>
  );
}
