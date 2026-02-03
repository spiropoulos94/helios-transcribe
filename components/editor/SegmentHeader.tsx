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
  onApproveToggle: () => void;
  onTimestampClick: () => void;
}

export default function SegmentHeader({
  segment,
  approval,
  speakerColor,
  hasBeenEdited,
  isEditing,
  onApproveToggle,
  onTimestampClick,
}: SegmentHeaderProps) {
  const { t } = useTranslations();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3">
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-md text-xs sm:text-sm font-medium ${speakerColor.bg} ${speakerColor.text} ${speakerColor.border} border`}>
          {segment.speaker}
        </span>

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

      <button
        onClick={onApproveToggle}
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
    </div>
  );
}
