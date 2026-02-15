import { formatDuration, formatProcessingTime } from '@/lib/utils/format';
import { calculateTranscriptionCost } from '@/lib/pricing/calculator';

interface TranscriptionMetadata {
  model?: string;
  audioDurationSeconds?: number;
  wordCount?: number;
  processingTimeMs?: number;
  pricing?: any;
  error?: string;
}

interface MetadataBadgesProps {
  metadata?: TranscriptionMetadata;
}

export default function MetadataBadges({ metadata }: MetadataBadgesProps) {
  if (!metadata) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {metadata.audioDurationSeconds && (
        <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs">
          🎵 {formatDuration(metadata.audioDurationSeconds)}
        </span>
      )}
      {metadata.wordCount && (
        <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs">
          {metadata.wordCount} words
        </span>
      )}
      {metadata.processingTimeMs && (
        <span className="inline-flex items-center px-2 py-1 rounded-md bg-green-50 text-green-700 text-xs">
          ⚡ {formatProcessingTime(metadata.processingTimeMs)}
        </span>
      )}
      {metadata.audioDurationSeconds && metadata.pricing && (
        <>
          <span className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-semibold">
            💰 ${calculateTranscriptionCost(metadata.audioDurationSeconds, metadata.pricing)}
          </span>
          <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs">
            {metadata.pricing.model1hr}/hr
          </span>
        </>
      )}
    </div>
  );
}
