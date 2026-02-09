import { useState, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
import { TranscriptionSegment } from '@/lib/ai/types';
import { SegmentApproval } from '@/lib/transcriptionStorage';
import { ColorScheme, formatTimestamp } from '@/lib/editor/speakerColors';
import { useTranslations } from '@/contexts/TranslationsContext';

interface SegmentHeaderProps {
  segment: TranscriptionSegment;
  approval: SegmentApproval;
  speakerColor: ColorScheme;
  hasBeenEdited: boolean;
  isEditing: boolean;
  onApproveToggle?: () => void;
  onTimestampClick: () => void;
  getSpeakerDisplayName?: (originalId: string) => string;
  onLabelSpeaker?: (originalId: string, customName: string) => void;
}

export default function SegmentHeader({
  segment,
  approval,
  speakerColor,
  hasBeenEdited,
  isEditing,
  onApproveToggle,
  onTimestampClick,
  getSpeakerDisplayName,
  onLabelSpeaker,
}: SegmentHeaderProps) {
  const { t } = useTranslations();
  const displayName = getSpeakerDisplayName ? getSpeakerDisplayName(segment.speaker) : segment.speaker;
  const [isEditingSpeaker, setIsEditingSpeaker] = useState(false);
  const [speakerInputValue, setSpeakerInputValue] = useState(displayName);
  const speakerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSpeakerInputValue(displayName);
  }, [displayName]);

  useEffect(() => {
    if (isEditingSpeaker && speakerInputRef.current) {
      speakerInputRef.current.focus();
      speakerInputRef.current.select();
    }
  }, [isEditingSpeaker]);

  const handleSpeakerSave = () => {
    const trimmed = speakerInputValue.trim();
    if (trimmed && trimmed !== segment.speaker) {
      onLabelSpeaker?.(segment.speaker, trimmed);
    } else if (!trimmed || trimmed === segment.speaker) {
      onLabelSpeaker?.(segment.speaker, '');
    }
    setIsEditingSpeaker(false);
  };

  const handleSpeakerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSpeakerSave();
    } else if (e.key === 'Escape') {
      setSpeakerInputValue(displayName);
      setIsEditingSpeaker(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3">
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        {isEditingSpeaker ? (
          <input
            ref={speakerInputRef}
            value={speakerInputValue}
            onChange={(e) => setSpeakerInputValue(e.target.value)}
            onBlur={handleSpeakerSave}
            onKeyDown={handleSpeakerKeyDown}
            onClick={(e) => e.stopPropagation()}
            className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-md text-xs sm:text-sm font-medium ${speakerColor.bg} ${speakerColor.border} border-2 outline-none min-w-[80px]`}
            placeholder={segment.speaker}
          />
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onLabelSpeaker) {
                setIsEditingSpeaker(true);
              }
            }}
            className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-md text-xs sm:text-sm font-medium ${speakerColor.bg} ${speakerColor.text} ${speakerColor.border} border ${onLabelSpeaker ? 'hover:ring-2 hover:ring-purple-200 cursor-pointer' : ''} transition-all`}
            title={onLabelSpeaker ? (t.editor?.clickToRenameSpeaker || 'Click to rename') : undefined}
            disabled={!onLabelSpeaker}
          >
            {displayName}
          </button>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onTimestampClick();
          }}
          className="text-xs sm:text-sm text-slate-500 hover:text-blue-600 transition-colors font-mono"
          title={t.editor?.clickToJump || "Click to jump to this timestamp"}
        >
          {formatTimestamp(segment.startTime)} - {formatTimestamp(segment.endTime)}
        </button>

        {hasBeenEdited && !isEditing && (
          <span className="px-1.5 sm:px-2 py-0.5 rounded-md bg-orange-100 text-orange-700 text-[10px] sm:text-xs font-medium">
            {t.editor?.edited || 'Edited'}
          </span>
        )}
      </div>

      {onApproveToggle && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onApproveToggle();
          }}
          className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors self-start sm:self-auto ${
            approval.approved
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
          disabled={isEditing}
        >
          {approval.approved ? (
            <>
              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{t.editor?.approved || 'Approved'}</span>
            </>
          ) : (
            <>
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-slate-400 rounded" />
              <span>{t.editor?.approve || 'Approve'}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
