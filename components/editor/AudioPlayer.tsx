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
}

const AudioPlayer = forwardRef<HTMLAudioElement, AudioPlayerProps>(
  ({ audioFileId, onTimeUpdate, onReady, onPlayingChange, translations: t }, ref) => {
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
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 text-slate-500">
            <AlertCircle className="w-5 h-5" />
            <div>
              <p className="font-medium">{t?.editor?.noAudioFile || 'No audio file available'}</p>
              <p className="text-sm text-slate-400 mt-1">
                {t?.editor?.noAudioDescription || "This transcription doesn't have an associated audio file"}
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Loading state
    if (isLoading) {
      return (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 text-slate-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <p>{t?.editor?.loadingAudio || 'Loading audio...'}</p>
          </div>
        </div>
      );
    }

    // Error state
    if (error) {
      return (
        <div className="bg-white rounded-xl border border-red-200 p-6">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <div>
              <p className="font-medium">{t?.editor?.errorLoadingAudio || 'Error loading audio'}</p>
              <p className="text-sm text-red-500 mt-1">{error}</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        {/* Hidden audio element with custom controls */}
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

        {/* Play/Pause Button */}
        <div className="flex items-center justify-center">
          <button
            onClick={handlePlayPause}
            className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center transition-colors shadow-lg shadow-blue-600/20"
            disabled={!audioUrl}
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </button>
        </div>

        {/* Timeline / Seek Bar */}
        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer"
            disabled={!audioUrl}
          />
          <div className="flex justify-between text-sm text-slate-600">
            <span>{formatTimestamp(currentTime)}</span>
            <span>{formatTimestamp(duration)}</span>
          </div>
        </div>

        {/* Playback Speed Controls */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-600">{t?.editor?.speed || 'Speed'}</p>
          <div className="flex gap-2">
            {[0.5, 1, 1.5, 2].map((rate) => (
              <button
                key={rate}
                onClick={() => handlePlaybackRateChange(rate)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  playbackRate === rate
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                disabled={!audioUrl}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>

        {/* Volume Control */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-slate-600" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="flex-1 h-2 bg-slate-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer"
              disabled={!audioUrl}
            />
            <span className="text-xs text-slate-600 w-8">{Math.round(volume * 100)}%</span>
          </div>
        </div>
      </div>
    );
  }
);

AudioPlayer.displayName = 'AudioPlayer';

export default AudioPlayer;
