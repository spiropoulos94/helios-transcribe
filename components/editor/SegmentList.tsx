'use client';

import { TranscriptionSegment } from '@/lib/ai/types';
import { SegmentApproval } from '@/lib/transcriptionStorage';
import { getSpeakerColor } from '@/lib/editor/speakerColors';
import SegmentCard from './SegmentCard';

interface SegmentListProps {
  segments: TranscriptionSegment[];
  approvals: SegmentApproval[];
  highlightedSegmentIndex: number | null;
  isPlaying: boolean;
  onApprove: (index: number) => void;
  onUnapprove: (index: number) => void;
  onEdit: (index: number, newText: string) => void;
  onTimestampClick: (segment: TranscriptionSegment) => void;
  translations?: any;
}

export default function SegmentList({
  segments,
  approvals,
  highlightedSegmentIndex,
  isPlaying,
  onApprove,
  onUnapprove,
  onEdit,
  onTimestampClick,
  translations,
}: SegmentListProps) {
  return (
    <div className="space-y-4 custom-scrollbar" >
      {segments.map((segment, index) => {
        const approval = approvals[index] || {
          segmentIndex: index,
          approved: false,
        };
        const speakerColor = getSpeakerColor(segment.speaker, segments);

        return (
          <SegmentCard
            key={`segment-${index}`}
            segment={segment}
            index={index}
            approval={approval}
            isHighlighted={highlightedSegmentIndex === index}
            isPlaying={isPlaying}
            speakerColor={speakerColor}
            onApprove={onApprove}
            onUnapprove={onUnapprove}
            onEdit={onEdit}
            onTimestampClick={onTimestampClick}
            translations={translations}
          />
        );
      })}
    </div>
  );
}
