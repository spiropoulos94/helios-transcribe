'use client';

import { forwardRef, useEffect, useState, useCallback } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAudioLoader } from '@/lib/hooks/useAudioLoader';
import { useTranslations } from '@/contexts/TranslationsContext';
import AudioPlayerCompact from './AudioPlayerCompact';
import AudioPlayerFull from './AudioPlayerFull';

interface AudioPlayerProps {
  audioFileId?: string;
  onTimeUpdate?: (currentTime: number) => void;
  onReady?: (duration: number) => void;
  onPlayingChange?: (isPlaying: boolean) => void;
  compact?: boolean;
}

const AudioPlayer = forwardRef<HTMLAudioElement, AudioPlayerProps>(
  ({ audioFileId, onTimeUpdate, onReady, onPlayingChange, compact = false }, ref) => {
    const { t } = useTranslations();
    const { audioUrl, isLoading, error } = useAudioLoader(audioFileId);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [volume, setVolume] = useState(1);

    const handleTimeUpdate = useCallback(
      (e: React.SyntheticEvent<HTMLAudioElement>) => {
        const audio = e.currentTarget;
        setCurrentTime(audio.currentTime);
        onTimeUpdate?.(audio.currentTime);
      },
      [onTimeUpdate]
    );

    const handleLoadedMetadata = useCallback(
      (e: React.SyntheticEvent<HTMLAudioElement>) => {
        const audio = e.currentTarget;
        setDuration(audio.duration);
        onReady?.(audio.duration);
      },
      [onReady]
    );

    const handlePlayPause = () => {
      const audio = ref as React.RefObject<HTMLAudioElement>;
      if (!audio.current) return;
      isPlaying ? audio.current.pause() : audio.current.play();
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const audio = ref as React.RefObject<HTMLAudioElement>;
      if (!audio.current) return;
      const newTime = parseFloat(e.target.value);
      audio.current.currentTime = newTime;
      setCurrentTime(newTime);
    };

    const handlePlaybackRateChange = (rate: number) => {
      const audio = ref as React.RefObject<HTMLAudioElement>;
      if (!audio.current) return;
      audio.current.playbackRate = rate;
      setPlaybackRate(rate);
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const audio = ref as React.RefObject<HTMLAudioElement>;
      if (!audio.current) return;
      const newVolume = parseFloat(e.target.value);
      audio.current.volume = newVolume;
      setVolume(newVolume);
    };

    useEffect(() => {
      onPlayingChange?.(isPlaying);
    }, [isPlaying, onPlayingChange]);

    // Status renders
    if (!audioFileId) {
      return (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <AlertCircle className="w-4 h-4" />
            <p className="text-sm">{t.editor?.noAudioFile || 'No audio file available'}</p>
          </div>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <p className="text-sm">{t.editor?.loadingAudio || 'Loading audio...'}</p>
          </div>
        </div>
      );
    }

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

    const audioElement = audioUrl && (
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
    );

    if (compact) {
      return (
        <>
          {audioElement}
          <AudioPlayerCompact
            audioUrl={audioUrl}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            playbackRate={playbackRate}
            onPlayPause={handlePlayPause}
            onSeek={handleSeek}
            onPlaybackRateChange={handlePlaybackRateChange}
          />
        </>
      );
    }

    return (
      <>
        {audioElement}
        <AudioPlayerFull
          audioUrl={audioUrl}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          playbackRate={playbackRate}
          volume={volume}
          onPlayPause={handlePlayPause}
          onSeek={handleSeek}
          onPlaybackRateChange={handlePlaybackRateChange}
          onVolumeChange={handleVolumeChange}
        />
      </>
    );
  }
);

AudioPlayer.displayName = 'AudioPlayer';

export default AudioPlayer;
