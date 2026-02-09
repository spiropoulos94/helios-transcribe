'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Volume2, VolumeX, X } from 'lucide-react';
import { TranscriptionSegment } from '@/lib/ai/types';
import { getAllSpeakersWithColors, ColorScheme } from '@/lib/editor/speakerColors';
import { useTranslations } from '@/contexts/TranslationsContext';

interface SpeakerLegendProps {
  segments: TranscriptionSegment[];
  getSpeakerDisplayName: (originalId: string) => string;
  onLabelSpeaker: (originalId: string, customName: string) => void;
  onPlaySpeakerSample?: (speakerId: string) => void;
  onStopSample?: () => void;
  isPlayingSample?: boolean;
  currentPlayingSpeaker?: string | null;
}

const COLLAPSED_COUNT = 4;

interface SpeakerItemProps {
  speakerId: string;
  color: ColorScheme;
  displayName: string;
  isRenamed: boolean;
  onRename: (newName: string) => void;
  onClear: () => void;
  onPlaySample?: () => void;
  onStopSample?: () => void;
  isPlaying?: boolean;
}

function SpeakerItem({
  speakerId,
  color,
  displayName,
  isRenamed,
  onRename,
  onClear,
  onPlaySample,
  onStopSample,
  isPlaying,
}: SpeakerItemProps) {
  const { t } = useTranslations();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(displayName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(displayName);
  }, [displayName]);

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== speakerId) {
      onRename(trimmed);
    } else if (!trimmed || trimmed === speakerId) {
      onClear();
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(displayName);
      setIsEditing(false);
    }
  };

  return (
    <div className="flex items-center gap-2 min-w-0 group py-1">
      {/* Color indicator with optional play button */}
      <div className="relative shrink-0">
        <div
          className={`w-4 h-4 rounded-full ${color.bg} ${color.border} border-2`}
        />
        {onPlaySample && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              isPlaying ? onStopSample?.() : onPlaySample();
            }}
            className="absolute -inset-1 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-white/90 rounded-full transition-opacity"
            title={isPlaying ? t.editor?.stopSample || 'Stop' : t.editor?.playSample || 'Play'}
          >
            {isPlaying ? (
              <VolumeX className="w-3 h-3 text-slate-600" />
            ) : (
              <Volume2 className="w-3 h-3 text-slate-600" />
            )}
          </button>
        )}
      </div>

      {/* Name - editable */}
      {isEditing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-0 text-sm px-1.5 py-0.5 border border-purple-300 rounded focus:ring-1 focus:ring-purple-200 focus:border-purple-400 outline-none"
          placeholder={speakerId}
        />
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className="flex-1 min-w-0 text-left text-sm text-slate-700 hover:text-purple-600 truncate transition-colors"
          title={t.editor?.clickToRenameSpeaker || 'Click to rename'}
        >
          {displayName}
        </button>
      )}

      {/* Clear button (only if renamed) */}
      {isRenamed && !isEditing && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="shrink-0 p-0.5 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 rounded transition-all"
          title={t.editor?.clearLabel || 'Clear'}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

export default function SpeakerLegend({
  segments,
  getSpeakerDisplayName,
  onLabelSpeaker,
  onPlaySpeakerSample,
  onStopSample,
  isPlayingSample,
  currentPlayingSpeaker,
}: SpeakerLegendProps) {
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
      <div className="space-y-0.5">
        {visibleSpeakers.map(({ speaker, color }) => {
          const displayName = getSpeakerDisplayName(speaker);
          const isRenamed = displayName !== speaker;

          return (
            <SpeakerItem
              key={speaker}
              speakerId={speaker}
              color={color}
              displayName={displayName}
              isRenamed={isRenamed}
              onRename={(newName) => onLabelSpeaker(speaker, newName)}
              onClear={() => onLabelSpeaker(speaker, '')}
              onPlaySample={onPlaySpeakerSample ? () => onPlaySpeakerSample(speaker) : undefined}
              onStopSample={onStopSample}
              isPlaying={isPlayingSample && currentPlayingSpeaker === speaker}
            />
          );
        })}
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
