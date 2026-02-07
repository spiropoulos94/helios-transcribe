'use client';

import { useState, useEffect, memo } from 'react';
import { Edit2, Volume2 } from 'lucide-react';
import { TranscriptionSegment } from '@/lib/ai/types';
import { SegmentApproval } from '@/lib/transcriptionStorage';
import { ColorScheme } from '@/lib/editor/speakerColors';
import { useTranslations } from '@/contexts/TranslationsContext';
import SegmentHeader from './SegmentHeader';
import SegmentEditForm from './SegmentEditForm';

interface SearchMatchHighlight {
  matchStart: number;
  matchEnd: number;
}

interface SegmentCardProps {
  segment: TranscriptionSegment;
  index: number;
  approval: SegmentApproval;
  isActive: boolean;
  isPlaying: boolean;
  isEditRequested: boolean;
  speakerColor: ColorScheme;
  searchMatch?: SearchMatchHighlight | null;
  onApprove: (index: number) => void;
  onUnapprove: (index: number) => void;
  onEdit: (index: number, newText: string) => void;
  onSegmentClick: (segment: TranscriptionSegment) => void;
  onEditRequestHandled: () => void;
}

function SegmentCard({
  segment, index, approval, isActive, isPlaying, isEditRequested,
  speakerColor, searchMatch, onApprove, onUnapprove, onEdit, onSegmentClick, onEditRequestHandled,
}: SegmentCardProps) {
  const { t } = useTranslations();
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(approval.editedText || segment.text);

  useEffect(() => {
    if (isEditRequested && isActive && !approval.approved && !isEditing) {
      setIsEditing(true);
      onEditRequestHandled();
    }
  }, [isEditRequested, isActive, approval.approved, isEditing, onEditRequestHandled]);

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

  const isNowPlaying = isActive && isPlaying;

  const getCardClasses = () => {
    const base = 'rounded-xl border-2 p-3 sm:p-4 animate-in fade-in slide-in-from-bottom-4 cursor-pointer';
    const transition = 'transition-all duration-300';
    if (isEditing) return `${base} ${transition} bg-yellow-50 border-yellow-400 shadow-md`;
    if (approval.approved) return `${base} ${transition} bg-emerald-50 border-emerald-200 shadow-sm`;
    // Active segment: blue styling (playing or not)
    if (isActive) {
      if (isPlaying) {
        return `${base} bg-blue-50 border-blue-400 shadow-lg`;
      }
      return `${base} ${transition} bg-blue-50 border-blue-300 shadow-md`;
    }
    return `${base} ${transition} bg-white border-slate-200 hover:border-slate-300 hover:shadow-md`;
  };

  const displayText = approval.editedText || segment.text;
  const hasBeenEdited = approval.editedText !== undefined && approval.editedText !== segment.text;

  // Render text with optional search match highlighting
  const renderHighlightedText = () => {
    if (!searchMatch) {
      return displayText;
    }

    const { matchStart, matchEnd } = searchMatch;
    const before = displayText.slice(0, matchStart);
    const match = displayText.slice(matchStart, matchEnd);
    const after = displayText.slice(matchEnd);

    return (
      <>
        {before}
        <mark className="bg-yellow-300 text-slate-900 px-0.5 rounded">{match}</mark>
        {after}
      </>
    );
  };

  return (
    <div className={`${getCardClasses()} relative`} onClick={() => onSegmentClick(segment)}>
      {/* Now Playing indicator */}
      {isNowPlaying && (
        <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium shadow-md">
          <Volume2 className="w-3.5 h-3.5 animate-pulse" />
          <span>Now Playing</span>
        </div>
      )}
      <SegmentHeader
        segment={segment}
        approval={approval}
        speakerColor={speakerColor}
        hasBeenEdited={hasBeenEdited}
        isEditing={isEditing}
        onApproveToggle={handleApproveToggle}
        onTimestampClick={() => onSegmentClick(segment)}
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
          <p className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-wrap">{renderHighlightedText()}</p>
          {!approval.approved && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
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
