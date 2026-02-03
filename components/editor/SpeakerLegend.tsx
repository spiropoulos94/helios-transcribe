'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { TranscriptionSegment } from '@/lib/ai/types';
import { getAllSpeakersWithColors } from '@/lib/editor/speakerColors';
import { useTranslations } from '@/contexts/TranslationsContext';

interface SpeakerLegendProps {
  segments: TranscriptionSegment[];
}

const COLLAPSED_COUNT = 4;

export default function SpeakerLegend({ segments }: SpeakerLegendProps) {
  const { t } = useTranslations();
  const [isExpanded, setIsExpanded] = useState(false);
  const speakersWithColors = getAllSpeakersWithColors(segments);

  if (speakersWithColors.length === 0) {
    return null;
  }

  const shouldShowToggle = speakersWithColors.length > COLLAPSED_COUNT;
  const visibleSpeakers = isExpanded ? speakersWithColors : speakersWithColors.slice(0, COLLAPSED_COUNT);
  const hiddenCount = speakersWithColors.length - COLLAPSED_COUNT;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">
        {t.editor?.speakers || 'Speakers'} ({speakersWithColors.length})
      </h3>
      <div
        className="grid grid-cols-2 gap-x-4 gap-y-2 overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: isExpanded ? `${Math.ceil(speakersWithColors.length / 2) * 28}px` : `${Math.ceil(COLLAPSED_COUNT / 2) * 28}px`,
        }}
      >
        {visibleSpeakers.map(({ speaker, color }) => (
          <div key={speaker} className="flex items-center gap-2 min-w-0">
            <div
              className={`w-3 h-3 shrink-0 rounded-full ${color.bg} ${color.border} border-2`}
            />
            <span className="text-sm text-slate-700 truncate" title={speaker}>{speaker}</span>
          </div>
        ))}
      </div>
      {shouldShowToggle && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-3 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
          />
          {isExpanded
            ? (t.editor?.showLess || 'Show less')
            : (t.editor?.showMore || `Show ${hiddenCount} more`)}
        </button>
      )}
    </div>
  );
}
