'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, Edit2, X, Save } from 'lucide-react';
import { TranscriptionSegment } from '@/lib/ai/types';
import { SegmentApproval } from '@/lib/transcriptionStorage';
import { ColorScheme, formatTimestamp } from '@/lib/editor/speakerColors';

interface SegmentCardProps {
  segment: TranscriptionSegment;
  index: number;
  approval: SegmentApproval;
  isHighlighted: boolean;
  isPlaying: boolean;
  speakerColor: ColorScheme;
  onApprove: (index: number) => void;
  onUnapprove: (index: number) => void;
  onEdit: (index: number, newText: string) => void;
  onTimestampClick: (segment: TranscriptionSegment) => void;
  translations?: any;
}

export default function SegmentCard({
  segment,
  index,
  approval,
  isHighlighted,
  isPlaying,
  speakerColor,
  onApprove,
  onUnapprove,
  onEdit,
  onTimestampClick,
  translations: t,
}: SegmentCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(approval.editedText || segment.text);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to highlighted segment
  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isHighlighted]);

  // Auto-focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textAreaRef.current) {
      textAreaRef.current.focus();
      textAreaRef.current.select();
    }
  }, [isEditing]);

  const handleSaveEdit = () => {
    onEdit(index, editedText);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedText(approval.editedText || segment.text);
    setIsEditing(false);
  };

  const handleApproveToggle = () => {
    if (approval.approved) {
      onUnapprove(index);
    } else {
      onApprove(index);
    }
  };

  // Determine card styling based on state
  const getCardClasses = () => {
    const baseClasses = 'rounded-xl border-2 p-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4';

    if (isEditing) {
      return `${baseClasses} bg-yellow-50 border-yellow-400 shadow-md`;
    }

    if (approval.approved) {
      return `${baseClasses} bg-blue-50 border-blue-300 shadow-sm`;
    }

    if (isHighlighted && isPlaying) {
      return `${baseClasses} bg-white border-blue-400 shadow-lg playing-segment`;
    }

    return `${baseClasses} bg-white border-slate-200 hover:border-slate-300 hover:shadow-md`;
  };

  const displayText = approval.editedText || segment.text;
  const hasBeenEdited = approval.editedText !== undefined && approval.editedText !== segment.text;

  return (
    <div
      ref={cardRef}
      className={getCardClasses()}
      style={{
        animationDelay: `${index * 50}ms`,
      }}
    >
      {/* Header: Speaker, Timestamp, Approval Status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Speaker Badge */}
          <span
            className={`px-3 py-1 rounded-md text-sm font-medium ${speakerColor.bg} ${speakerColor.text} ${speakerColor.border} border`}
          >
            {segment.speaker}
          </span>

          {/* Timestamp (clickable) */}
          <button
            onClick={() => onTimestampClick(segment)}
            className="text-sm text-slate-500 hover:text-blue-600 transition-colors font-mono"
            title={t?.editor?.clickToJump || "Click to jump to this timestamp"}
          >
            {formatTimestamp(segment.startTime)} - {formatTimestamp(segment.endTime)}
          </button>

          {/* Edited Badge */}
          {hasBeenEdited && !isEditing && (
            <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-700 text-xs font-medium">
              {t?.editor?.edited || 'Edited'}
            </span>
          )}
        </div>

        {/* Approval Checkbox/Icon */}
        <button
          onClick={handleApproveToggle}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            approval.approved
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
          disabled={isEditing}
        >
          {approval.approved ? (
            <>
              <Check className="w-4 h-4" />
              <span>{t?.editor?.approved || 'Approved'}</span>
            </>
          ) : (
            <>
              <div className="w-4 h-4 border-2 border-slate-400 rounded" />
              <span>{t?.editor?.approve || 'Approve'}</span>
            </>
          )}
        </button>
      </div>

      {/* Content: Text or Textarea */}
      {isEditing ? (
        <div className="space-y-3">
          <textarea
            ref={textAreaRef}
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="w-full px-3 py-2 border border-yellow-300 rounded-lg text-slate-700 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400"
            rows={3}
            style={{ minHeight: '80px' }}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveEdit}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Save className="w-4 h-4" />
              {t?.editor?.save || t?.common?.save || 'Save'}
            </button>
            <button
              onClick={handleCancelEdit}
              className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium"
            >
              <X className="w-4 h-4" />
              {t?.editor?.cancel || t?.common?.cancel || 'Cancel'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{displayText}</p>

          {/* Edit Button */}
          {!approval.approved && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              {t?.editor?.edit || t?.common?.edit || 'Edit'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
