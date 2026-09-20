'use client';

import { useState, useEffect, memo } from 'react';
import { Edit2, Volume2, Star } from 'lucide-react';
import { TranscriptionSegment } from '@/lib/ai/types';
import { SegmentEdit } from '@/lib/transcriptionStorage';
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
  edit: SegmentEdit;
  isActive: boolean;
  isPlaying: boolean;
  isEditRequested: boolean;
  editingSegmentIndex: number | null;
  speakerColor: ColorScheme;
  searchMatch?: SearchMatchHighlight | null;
  isHighlighted?: boolean;
  onToggleHighlight?: () => void;
  onEdit?: (index: number, newText: string) => void;
  onSegmentClick: (segment: TranscriptionSegment) => void;
  onEditRequestHandled: () => void;
  onEditingChange: (index: number | null) => void;
  getSpeakerDisplayName?: (originalId: string) => string;
  onLabelSpeaker?: (originalId: string, customName: string) => void;
}

function SegmentCard({
  segment, index, edit, isActive, isPlaying, isEditRequested, editingSegmentIndex,
  speakerColor, searchMatch, isHighlighted, onToggleHighlight, onEdit, onSegmentClick,
  onEditRequestHandled, onEditingChange, getSpeakerDisplayName, onLabelSpeaker,
}: SegmentCardProps) {
  const { t } = useTranslations();
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(edit.editedText || segment.text);

  useEffect(() => {
    if (isEditRequested && isActive && !isEditing) {
      setIsEditing(true);
      onEditingChange(index);
      onEditRequestHandled();
    }
  }, [isEditRequested, isActive, isEditing, onEditRequestHandled, onEditingChange, index]);

  useEffect(() => {
    if (isEditing && editingSegmentIndex !== null && editingSegmentIndex !== index) {
      setEditedText(edit.editedText || segment.text);
      setIsEditing(false);
    }
  }, [editingSegmentIndex, index, isEditing, edit.editedText, segment.text]);

  const handleSaveEdit = () => {
    onEdit?.(index, editedText);
    setIsEditing(false);
    onEditingChange(null);
  };

  const handleCancelEdit = () => {
    setEditedText(edit.editedText || segment.text);
    setIsEditing(false);
    onEditingChange(null);
  };

  const isNowPlaying = isActive && isPlaying;

  const getCardClasses = () => {
    const base = 'rounded-xl border-2 p-3 sm:p-4 animate-in fade-in slide-in-from-bottom-4 cursor-pointer';
    const transition = 'transition-all duration-300';
    const accent = isHighlighted ? ' border-l-4 border-l-amber-400' : '';
    if (isEditing) return `${base} ${transition} bg-yellow-50 border-yellow-400 shadow-md${accent}`;
    if (isActive) {
      if (isPlaying) {
        return `${base} bg-blue-50 border-blue-400 shadow-lg${accent}`;
      }
      return `${base} ${transition} bg-blue-50 border-blue-300 shadow-md${accent}`;
    }
    if (isHighlighted) {
      return `${base} ${transition} bg-amber-50 border-amber-200 border-l-4 border-l-amber-400 hover:shadow-md`;
    }
    return `${base} ${transition} bg-white border-slate-200 hover:border-slate-300 hover:shadow-md`;
  };

  const displayText = edit.editedText || segment.text;
  const hasBeenEdited = edit.editedText !== undefined && edit.editedText !== segment.text;

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

  const handleCardClick = () => {
    if (isEditing) return;

    if (editingSegmentIndex !== null && editingSegmentIndex !== index) {
      onEditingChange(null);
    }

    onSegmentClick(segment);
  };

  return (
    <div className={`${getCardClasses()} relative`} onClick={handleCardClick}>
      {onToggleHighlight && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleHighlight();
          }}
          className={`absolute top-2 right-2 z-10 p-1.5 rounded-lg transition-colors ${
            isHighlighted
              ? 'text-amber-500 hover:bg-amber-100'
              : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'
          }`}
          title={
            isHighlighted
              ? t.editor?.unhighlight || 'Remove highlight'
              : t.editor?.highlight || 'Highlight'
          }
          aria-pressed={isHighlighted}
        >
          <Star className={`w-4 h-4 ${isHighlighted ? 'fill-amber-400' : ''}`} />
        </button>
      )}
      {isNowPlaying && (
        <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium shadow-md">
          <Volume2 className="w-3.5 h-3.5 animate-pulse" />
          <span>Now Playing</span>
        </div>
      )}
      <SegmentHeader
        segment={segment}
        speakerColor={speakerColor}
        hasBeenEdited={hasBeenEdited}
        isEditing={isEditing}
        onTimestampClick={() => onSegmentClick(segment)}
        getSpeakerDisplayName={getSpeakerDisplayName}
        onLabelSpeaker={onLabelSpeaker}
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
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
              onEditingChange(index);
            }}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {t.editor?.edit || t.common?.edit || 'Edit'}
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(SegmentCard);
