'use client';

import { Play, Pause } from 'lucide-react';
import { formatTimestamp } from '@/lib/editor/speakerColors';

interface AudioPlayerCompactProps {
  audioUrl: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  onPlayPause: () => void;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPlaybackRateChange: (rate: number) => void;
}

export default function AudioPlayerCompact({
  audioUrl,
  isPlaying,
  currentTime,
  duration,
  playbackRate,
  onPlayPause,
  onSeek,
  onPlaybackRateChange,
}: AudioPlayerCompactProps) {
  return (
    <div className="bg-white border-b border-slate-200 px-4 py-2">
      <div className="flex items-center gap-3">
        <button
          onClick={onPlayPause}
          className="w-9 h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center transition-colors shadow-sm shrink-0"
          disabled={!audioUrl}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
        </button>

        <div className="flex-1 flex items-center gap-2">
          <span className="text-xs text-slate-600 font-medium w-10 text-right shrink-0">
            {formatTimestamp(currentTime)}
          </span>
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={onSeek}
            className="flex-1 h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer"
            disabled={!audioUrl}
          />
          <span className="text-xs text-slate-400 w-10 shrink-0">
            {formatTimestamp(duration)}
          </span>
        </div>

        <select
          value={playbackRate}
          onChange={(e) => onPlaybackRateChange(parseFloat(e.target.value))}
          className="text-xs font-medium bg-slate-100 text-slate-700 rounded px-1.5 py-1 border-0 cursor-pointer shrink-0"
          disabled={!audioUrl}
        >
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={1.5}>1.5x</option>
          <option value={2}>2x</option>
        </select>
      </div>
    </div>
  );
}
