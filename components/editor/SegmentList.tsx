'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TranscriptionSegment } from '@/lib/ai/types';
import { SegmentEdit } from '@/lib/transcriptionStorage';
import { ColorScheme } from '@/lib/editor/speakerColors';
import { SearchMatchEvent } from '@/lib/hooks/useSegmentSearch';
import SegmentCard from './SegmentCard';

interface SeekEvent {
  segmentIndex: number;
  id: number;
}

interface SegmentListProps {
  segments: TranscriptionSegment[];
  edits: SegmentEdit[];
  speakerColorMap: Record<string, ColorScheme>;
  activeSegmentIndex: number | null;
  seekEvent: SeekEvent | null;
  currentSearchMatch: SearchMatchEvent | null;
  isPlaying: boolean;
  isEditRequested: boolean;
  editingSegmentIndex: number | null;
  highlightedIndices: Set<number>;
  onToggleHighlight: (index: number) => void;
  onEdit: (index: number, newText: string) => void;
  onSegmentClick: (segment: TranscriptionSegment) => void;
  onEditRequestHandled: () => void;
  onSeekEventHandled: () => void;
  onEditingChange: (index: number | null) => void;
  getSpeakerDisplayName?: (originalId: string) => string;
  onLabelSpeaker?: (originalId: string, customName: string) => void;
}

export default function SegmentList({
  segments,
  edits,
  speakerColorMap,
  activeSegmentIndex,
  seekEvent,
  currentSearchMatch,
  isPlaying,
  isEditRequested,
  editingSegmentIndex,
  highlightedIndices,
  onToggleHighlight,
  onEdit,
  onSegmentClick,
  onEditRequestHandled,
  onSeekEventHandled,
  onEditingChange,
  getSpeakerDisplayName,
  onLabelSpeaker,
}: SegmentListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: segments.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 172,
    overscan: 5,
  });

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

  useEffect(() => {
    if (seekEvent !== null) {
      scrollToSegment(seekEvent.segmentIndex);
      onSeekEventHandled();
    }
  }, [seekEvent?.id, scrollToSegment, onSeekEventHandled]);

  useEffect(() => {
    if (activeSegmentIndex !== null && editingSegmentIndex === null) {
      scrollToSegment(activeSegmentIndex);
    }
  }, [activeSegmentIndex, scrollToSegment, editingSegmentIndex]);

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
          const edit = edits.find((e) => e.segmentIndex === index) || {
            segmentIndex: index,
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
                  edit={edit}
                  isActive={activeSegmentIndex === index}
                  isPlaying={isPlaying}
                  isEditRequested={isEditRequested && activeSegmentIndex === index}
                  editingSegmentIndex={editingSegmentIndex}
                  speakerColor={speakerColorMap[segment.speaker]}
                  searchMatch={currentSearchMatch?.segmentIndex === index ? currentSearchMatch : null}
                  isHighlighted={highlightedIndices.has(index)}
                  onToggleHighlight={() => onToggleHighlight(index)}
                  onEdit={onEdit}
                  onSegmentClick={onSegmentClick}
                  onEditRequestHandled={onEditRequestHandled}
                  onEditingChange={onEditingChange}
                  getSpeakerDisplayName={getSpeakerDisplayName}
                  onLabelSpeaker={onLabelSpeaker}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
