import Logo from '@/components/Logo';

interface LandingFooterProps {
  translations: any;
}

export default function LandingFooter({ translations: t }: LandingFooterProps) {
  return (
    <footer className="bg-slate-950 border-t border-slate-800 py-12 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        <Logo width={140} />
        <p className="text-slate-400 text-lg">{t.footer.copyright}</p>
      </div>
    </footer>
  );
}
