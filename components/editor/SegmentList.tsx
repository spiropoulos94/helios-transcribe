'use client';

import { useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TranscriptionSegment } from '@/lib/ai/types';
import { SegmentApproval } from '@/lib/transcriptionStorage';
import { ColorScheme } from '@/lib/editor/speakerColors';
import SegmentCard from './SegmentCard';

interface SegmentListProps {
  segments: TranscriptionSegment[];
  approvals: SegmentApproval[];
  speakerColorMap: Record<string, ColorScheme>;
  highlightedSegmentIndex: number | null;
  selectedSegmentIndex: number | null;
  isPlaying: boolean;
  isEditRequested: boolean;
  onApprove: (index: number) => void;
  onUnapprove: (index: number) => void;
  onEdit: (index: number, newText: string) => void;
  onTimestampClick: (segment: TranscriptionSegment) => void;
  onSelect: (index: number | null) => void;
  onEditRequestHandled: () => void;
  translations?: any;
}

export default function SegmentList({
  segments,
  approvals,
  speakerColorMap,
  highlightedSegmentIndex,
  selectedSegmentIndex,
  isPlaying,
  isEditRequested,
  onApprove,
  onUnapprove,
  onEdit,
  onTimestampClick,
  onSelect,
  onEditRequestHandled,
  translations,
}: SegmentListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: segments.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 172, // Estimated height per segment card (160px card + 12px padding)
    overscan: 5, // Render 5 extra items above/below viewport
  });

  // Scroll to highlighted segment when it changes (during playback)
  useEffect(() => {
    if (highlightedSegmentIndex !== null && isPlaying) {
      virtualizer.scrollToIndex(highlightedSegmentIndex, {
        align: 'center',
        behavior: 'smooth',
      });
    }
  }, [highlightedSegmentIndex, isPlaying, virtualizer]);

  // Scroll to selected segment when it changes (keyboard navigation)
  useEffect(() => {
    if (selectedSegmentIndex !== null) {
      virtualizer.scrollToIndex(selectedSegmentIndex, {
        align: 'center',
        behavior: 'smooth',
      });
    }
  }, [selectedSegmentIndex, virtualizer]);

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className="h-full overflow-auto custom-scrollbar"
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualRow) => {
          const index = virtualRow.index;
          const segment = segments[index];
          const approval = approvals[index] || {
            segmentIndex: index,
            approved: false,
          };

          return (
            <div
              key={virtualRow.key}
              data-index={index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div style={{ paddingBottom: '12px' }}>
                <SegmentCard
                  segment={segment}
                  index={index}
                  approval={approval}
                  isHighlighted={highlightedSegmentIndex === index}
                  isSelected={selectedSegmentIndex === index}
                  isPlaying={isPlaying}
                  isEditRequested={isEditRequested && selectedSegmentIndex === index}
                  speakerColor={speakerColorMap[segment.speaker]}
                  onApprove={onApprove}
                  onUnapprove={onUnapprove}
                  onEdit={onEdit}
                  onTimestampClick={onTimestampClick}
                  onSelect={onSelect}
                  onEditRequestHandled={onEditRequestHandled}
                  translations={translations}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
