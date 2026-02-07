'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TranscriptionSegment } from '@/lib/ai/types';
import { SegmentApproval } from '@/lib/transcriptionStorage';
import { ColorScheme } from '@/lib/editor/speakerColors';
import { SearchMatchEvent } from '@/lib/hooks/useSegmentSearch';
import SegmentCard from './SegmentCard';

interface SeekEvent {
  segmentIndex: number;
  id: number;
}

interface SegmentListProps {
  segments: TranscriptionSegment[];
  approvals: SegmentApproval[];
  speakerColorMap: Record<string, ColorScheme>;
  activeSegmentIndex: number | null;
  seekEvent: SeekEvent | null;
  currentSearchMatch: SearchMatchEvent | null;
  isPlaying: boolean;
  isEditRequested: boolean;
  onApprove: (index: number) => void;
  onUnapprove: (index: number) => void;
  onEdit: (index: number, newText: string) => void;
  onSegmentClick: (segment: TranscriptionSegment) => void;
  onEditRequestHandled: () => void;
  onSeekEventHandled: () => void;
}

export default function SegmentList({
  segments,
  approvals,
  speakerColorMap,
  activeSegmentIndex,
  seekEvent,
  currentSearchMatch,
  isPlaying,
  isEditRequested,
  onApprove,
  onUnapprove,
  onEdit,
  onSegmentClick,
  onEditRequestHandled,
  onSeekEventHandled,
}: SegmentListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: segments.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 172,
    overscan: 5,
  });

  // Scroll to segment with retry logic for large jumps (virtualizer needs time to measure distant segments)
  const scrollToSegment = useCallback((index: number) => {
    let attempts = 0;
    const maxAttempts = 15;

    const attemptScroll = () => {
      attempts++;
      virtualizer.scrollToIndex(index, {
        align: 'center',
        behavior: attempts === 1 ? 'smooth' : 'auto',
      });

      if (attempts >= maxAttempts) return;

      requestAnimationFrame(() => {
        setTimeout(() => {
          const isVisible = virtualizer.getVirtualItems().some(item => item.index === index);
          if (!isVisible) attemptScroll();
        }, 50);
      });
    };

    attemptScroll();
  }, [virtualizer]);

  // Scroll on explicit user actions (seek, click, keyboard navigation)
  useEffect(() => {
    if (seekEvent !== null) {
      scrollToSegment(seekEvent.segmentIndex);
      onSeekEventHandled();
    }
  }, [seekEvent?.id, scrollToSegment, onSeekEventHandled]);

  // Auto-scroll during playback
  useEffect(() => {
    if (activeSegmentIndex !== null) {
      scrollToSegment(activeSegmentIndex);
    }
  }, [activeSegmentIndex, scrollToSegment]);

  // Scroll to search match
  useEffect(() => {
    if (currentSearchMatch !== null) {
      scrollToSegment(currentSearchMatch.segmentIndex);
    }
  }, [currentSearchMatch?.id, scrollToSegment]);

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
                  isActive={activeSegmentIndex === index}
                  isPlaying={isPlaying}
                  isEditRequested={isEditRequested && activeSegmentIndex === index}
                  speakerColor={speakerColorMap[segment.speaker]}
                  searchMatch={currentSearchMatch?.segmentIndex === index ? currentSearchMatch : null}
                  onApprove={onApprove}
                  onUnapprove={onUnapprove}
                  onEdit={onEdit}
                  onSegmentClick={onSegmentClick}
                  onEditRequestHandled={onEditRequestHandled}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
