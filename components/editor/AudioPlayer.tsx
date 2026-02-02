'use client';

import { forwardRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, Volume2, Loader2, AlertCircle } from 'lucide-react';
import { getAudioFile } from '@/lib/audioStorage';
import { formatTimestamp } from '@/lib/editor/speakerColors';

interface AudioPlayerProps {
  audioFileId?: string;
  onTimeUpdate?: (currentTime: number) => void;
  onReady?: (duration: number) => void;
  onPlayingChange?: (isPlaying: boolean) => void;
  translations?: any;
  compact?: boolean;
}

const AudioPlayer = forwardRef<HTMLAudioElement, AudioPlayerProps>(
  ({ audioFileId, onTimeUpdate, onReady, onPlayingChange, translations: t, compact = false }, ref) => {
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [volume, setVolume] = useState(1);

    // Load audio from IndexedDB
    useEffect(() => {
      if (!audioFileId) {
        setIsLoading(false);
        return;
      }

      let objectUrl: string | null = null;

      const loadAudio = async () => {
        try {
          setIsLoading(true);
          setError(null);
          const blob = await getAudioFile(audioFileId);

          if (!blob) {
            setError('Audio file not found');
            setIsLoading(false);
            return;
          }

          objectUrl = URL.createObjectURL(blob);
          setAudioUrl(objectUrl);
          setIsLoading(false);
        } catch (err) {
          console.error('Error loading audio:', err);
          setError('Failed to load audio file');
          setIsLoading(false);
        }
      };

      loadAudio();

      // Cleanup object URL on unmount
      return () => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      };
    }, [audioFileId]);

    // Handle time update
    const handleTimeUpdate = useCallback(
      (e: React.SyntheticEvent<HTMLAudioElement>) => {
        const audio = e.currentTarget;
        setCurrentTime(audio.currentTime);
        onTimeUpdate?.(audio.currentTime);
      },
      [onTimeUpdate]
    );

    // Handle loaded metadata
    const handleLoadedMetadata = useCallback(
      (e: React.SyntheticEvent<HTMLAudioElement>) => {
        const audio = e.currentTarget;
        setDuration(audio.duration);
        onReady?.(audio.duration);
      },
      [onReady]
    );

    // Handle play/pause
    const handlePlayPause = () => {
      const audio = ref as React.RefObject<HTMLAudioElement>;
      if (!audio.current) return;

      if (isPlaying) {
        audio.current.pause();
      } else {
        audio.current.play();
      }
    };

    // Handle seek
    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const audio = ref as React.RefObject<HTMLAudioElement>;
      if (!audio.current) return;

      const newTime = parseFloat(e.target.value);
      audio.current.currentTime = newTime;
      setCurrentTime(newTime);
    };

    // Handle playback rate change
    const handlePlaybackRateChange = (rate: number) => {
      const audio = ref as React.RefObject<HTMLAudioElement>;
      if (!audio.current) return;

      audio.current.playbackRate = rate;
      setPlaybackRate(rate);
    };

    // Handle volume change
    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const audio = ref as React.RefObject<HTMLAudioElement>;
      if (!audio.current) return;

      const newVolume = parseFloat(e.target.value);
      audio.current.volume = newVolume;
      setVolume(newVolume);
    };

    // Update playing state
    useEffect(() => {
      onPlayingChange?.(isPlaying);
    }, [isPlaying, onPlayingChange]);

    // No audio file provided
    if (!audioFileId) {
      return (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <AlertCircle className="w-4 h-4" />
            <p className="text-sm">{t?.editor?.noAudioFile || 'No audio file available'}</p>
          </div>
        </div>
      );
    }

    // Loading state
    if (isLoading) {
      return (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <p className="text-sm">{t?.editor?.loadingAudio || 'Loading audio...'}</p>
          </div>
        </div>
      );
    }

    // Error state
    if (error) {
      return (
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <p className="text-sm">{error}</p>
          </div>
        </div>
      );
    }

    // Compact mode for mobile - single row with essential controls
    if (compact) {
      return (
        <div className="bg-white border-b border-slate-200 px-4 py-2">
          {/* Hidden audio element */}
          {audioUrl && (
            <audio
              ref={ref}
              src={audioUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          )}

          <div className="flex items-center gap-3">
            {/* Play/Pause Button */}
            <button
              onClick={handlePlayPause}
              className="w-9 h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center transition-colors shadow-sm shrink-0"
              disabled={!audioUrl}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
            </button>

            {/* Timeline */}
            <div className="flex-1 flex items-center gap-2">
              <span className="text-xs text-slate-600 font-medium w-10 text-right shrink-0">
                {formatTimestamp(currentTime)}
              </span>
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer"
                disabled={!audioUrl}
              />
              <span className="text-xs text-slate-400 w-10 shrink-0">
                {formatTimestamp(duration)}
              </span>
            </div>

            {/* Speed selector - compact dropdown style */}
            <select
              value={playbackRate}
              onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
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

    // Full mode for desktop
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        {/* Hidden audio element */}
        {audioUrl && (
          <audio
            ref={ref}
            src={audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
        )}

        {/* Main controls row: Play + Timeline */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePlayPause}
            className="w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center transition-colors shadow-md shadow-blue-600/20 shrink-0"
            disabled={!audioUrl}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <div className="flex-1 space-y-1">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer"
              disabled={!audioUrl}
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>{formatTimestamp(currentTime)}</span>
              <span>{formatTimestamp(duration)}</span>
            </div>
          </div>
        </div>

        {/* Secondary controls row: Speed + Volume */}
        <div className="flex items-center justify-between gap-4">
          {/* Playback Speed */}
          <div className="flex items-center gap-1.5">
            {[0.5, 1, 1.5, 2].map((rate) => (
              <button
                key={rate}
                onClick={() => handlePlaybackRateChange(rate)}
                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                  playbackRate === rate
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                disabled={!audioUrl}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2">
            <Volume2 className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="w-16 h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer"
              disabled={!audioUrl}
            />
          </div>
        </div>
      </div>
    );
  }
);

AudioPlayer.displayName = 'AudioPlayer';

export default AudioPlayer;
