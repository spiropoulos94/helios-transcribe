'use client';

import { TranscriptionSegment } from '@/lib/ai/types';
import { getAllSpeakersWithColors } from '@/lib/editor/speakerColors';

interface SpeakerLegendProps {
  segments: TranscriptionSegment[];
  translations?: any;
}

export default function SpeakerLegend({ segments, translations: t }: SpeakerLegendProps) {
  const speakersWithColors = getAllSpeakersWithColors(segments);

  if (speakersWithColors.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">{t?.editor?.speakers || 'Speakers'}</h3>
      <div className="space-y-2">
        {speakersWithColors.map(({ speaker, color }) => (
          <div key={speaker} className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${color.bg} ${color.border} border-2`}
            />
            <span className="text-sm text-slate-700">{speaker}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
