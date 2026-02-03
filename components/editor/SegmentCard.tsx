'use client';

import { useState, useEffect, memo } from 'react';
import { Edit2 } from 'lucide-react';
import { TranscriptionSegment } from '@/lib/ai/types';
import { SegmentApproval } from '@/lib/transcriptionStorage';
import { ColorScheme } from '@/lib/editor/speakerColors';
import { useTranslations } from '@/contexts/TranslationsContext';
import SegmentHeader from './SegmentHeader';
import SegmentEditForm from './SegmentEditForm';

interface SegmentCardProps {
  segment: TranscriptionSegment;
  index: number;
  approval: SegmentApproval;
  isHighlighted: boolean;
  isSelected: boolean;
  isPlaying: boolean;
  isEditRequested: boolean;
  speakerColor: ColorScheme;
  onApprove: (index: number) => void;
  onUnapprove: (index: number) => void;
  onEdit: (index: number, newText: string) => void;
  onTimestampClick: (segment: TranscriptionSegment) => void;
  onSelect: (index: number | null) => void;
  onEditRequestHandled: () => void;
}

function SegmentCard({
  segment, index, approval, isHighlighted, isSelected, isPlaying, isEditRequested,
  speakerColor, onApprove, onUnapprove, onEdit, onTimestampClick, onSelect, onEditRequestHandled,
}: SegmentCardProps) {
  const { t } = useTranslations();
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(approval.editedText || segment.text);

  useEffect(() => {
    if (isEditRequested && isSelected && !approval.approved && !isEditing) {
      setIsEditing(true);
      onEditRequestHandled();
    }
  }, [isEditRequested, isSelected, approval.approved, isEditing, onEditRequestHandled]);

  const handleSaveEdit = () => {
    onEdit(index, editedText);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedText(approval.editedText || segment.text);
    setIsEditing(false);
  };

  const handleApproveToggle = () => {
    approval.approved ? onUnapprove(index) : onApprove(index);
  };

  const getCardClasses = () => {
    const base = 'rounded-xl border-2 p-3 sm:p-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 cursor-pointer';
    if (isEditing) return `${base} bg-yellow-50 border-yellow-400 shadow-md`;
    if (isSelected) return `${base} bg-violet-100 border-violet-500 shadow-lg ring-2 ring-violet-300`;
    if (approval.approved) return `${base} bg-emerald-50 border-emerald-200 shadow-sm`;
    if (isHighlighted && isPlaying) return `${base} bg-white border-blue-400 shadow-lg playing-segment`;
    return `${base} bg-white border-slate-200 hover:border-slate-300 hover:shadow-md`;
  };

  const displayText = approval.editedText || segment.text;
  const hasBeenEdited = approval.editedText !== undefined && approval.editedText !== segment.text;

  return (
    <div className={getCardClasses()} onClick={() => onSelect(index)}>
      <SegmentHeader
        segment={segment}
        approval={approval}
        speakerColor={speakerColor}
        hasBeenEdited={hasBeenEdited}
        isEditing={isEditing}
        onApproveToggle={handleApproveToggle}
        onTimestampClick={() => onTimestampClick(segment)}
      />

      {isEditing ? (
        <SegmentEditForm
          editedText={editedText}
          onTextChange={setEditedText}
          onSave={handleSaveEdit}
          onCancel={handleCancelEdit}
        />
      ) : (
        <div className="space-y-2 sm:space-y-3">
          <p className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-wrap">{displayText}</p>
          {!approval.approved && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {t.editor?.edit || t.common?.edit || 'Edit'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(SegmentCard);
