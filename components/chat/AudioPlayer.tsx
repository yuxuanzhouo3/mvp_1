'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';

interface AudioPlayerProps {
  src: string;
  duration?: number;
  isOwn?: boolean;
  className?: string;
}

/**
 * 音频播放器组件
 * 用于在消息中播放语音消息
 */
export function AudioPlayer({
  src,
  duration = 0,
  isOwn = false,
  className = '',
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [actualDuration, setActualDuration] = useState(duration);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);

  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const { language } = useLanguage();
  const t = useTranslations(language);

  // 格式化时间
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 播放/暂停
  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  // 切换播放速度
  const togglePlaybackRate = () => {
    if (!audioRef.current) return;

    const rates = [1, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    
    audioRef.current.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  // 点击进度条跳转
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressRef.current) return;

    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * actualDuration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // 音频事件处理
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setActualDuration(audio.duration || duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      setError(t.audioPlayer.audioLoadError);
      setIsLoading(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  // 计算进度百分比
  const progressPercentage = actualDuration > 0 
    ? (currentTime / actualDuration) * 100 
    : 0;

  if (error) {
    return (
      <div className={cn(
        'flex items-center space-x-2 p-2 rounded-lg text-sm',
        isOwn ? 'text-blue-200' : 'text-gray-500',
        className
      )}>
        <span>⚠️ {error}</span>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex items-center space-x-2 min-w-[160px]',
      className
    )}>
      {/* 隐藏的音频元素 */}
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />

      {/* 播放按钮 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={togglePlay}
        disabled={isLoading}
        className={cn(
          'p-1.5 rounded-full',
          isOwn 
            ? 'text-white hover:bg-blue-500/30' 
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        )}
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : isPlaying ? (
          <Pause className="h-5 w-5" />
        ) : (
          <Play className="h-5 w-5" />
        )}
      </Button>

      {/* 波形/进度条 */}
      <div className="flex-1 flex flex-col space-y-1">
        <div
          ref={progressRef}
          onClick={handleProgressClick}
          className={cn(
            'relative h-6 flex items-center space-x-0.5 cursor-pointer',
          )}
        >
          {/* 波形条 */}
          {[...Array(20)].map((_, i) => {
            const isActive = (i / 20) * 100 <= progressPercentage;
            // 生成伪随机高度
            const height = 4 + Math.sin(i * 0.8) * 8 + Math.cos(i * 1.2) * 4;
            
            return (
              <div
                key={i}
                className={cn(
                  'w-1 rounded-full transition-all duration-100',
                  isOwn
                    ? isActive ? 'bg-white' : 'bg-white/40'
                    : isActive ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                )}
                style={{ height: `${height}px` }}
              />
            );
          })}
        </div>

        {/* 时间显示 */}
        <div className={cn(
          'flex items-center justify-between text-xs',
          isOwn ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
        )}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(actualDuration)}</span>
        </div>
      </div>

      {/* 倍速按钮 */}
      {isPlaying && (
        <Button
          variant="ghost"
          size="sm"
          onClick={togglePlaybackRate}
          className={cn(
            'text-xs px-1.5 py-0.5 h-auto',
            isOwn 
              ? 'text-blue-100 hover:bg-blue-500/30' 
              : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'
          )}
        >
          {playbackRate}x
        </Button>
      )}
    </div>
  );
}

export default AudioPlayer;

