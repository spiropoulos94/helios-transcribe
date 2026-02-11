'use client';

import { Loader2 } from 'lucide-react';

interface GeneratingSpinnerProps {
  title: string;
  subtitle: string;
  colorScheme?: 'purple' | 'emerald';
}

export default function GeneratingSpinner({
  title,
  subtitle,
  colorScheme = 'purple',
}: GeneratingSpinnerProps) {
  const spinnerColor = colorScheme === 'purple' ? 'text-purple-600' : 'text-emerald-600';

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className={`w-12 h-12 ${spinnerColor} animate-spin mb-4`} />
      <h4 className="font-medium text-slate-900">{title}</h4>
      <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
    </div>
  );
}
