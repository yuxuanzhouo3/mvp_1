'use client';

import { useState, useEffect, useRef } from 'react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { uploadChatAudio, formatAudioDuration } from '@/lib/storage/upload-audio';
import { Button } from '@/components/ui/button';
import { Mic, Square, Send, X, Pause, Play, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceRecorderProps {
  roomId: string;
  onSend: (audioUrl: string, duration: number) => Promise<void>;
  onCancel?: () => void;
  className?: string;
  language?: 'zh' | 'en';
}

export function VoiceRecorder({
  roomId,
  onSend,
  onCancel,
  className = '',
  language = 'zh',
}: VoiceRecorderProps) {
  const [isSending, setIsSending] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);

  const {
    isRecording,
    isPaused,
    duration,
    audioBlob,
    audioUrl,
    error,
    waveformData,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    hasPermission,
    requestPermission,
  } = useAudioRecorder({ maxDuration: 60 });

  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const t = {
    zh: {
      holdToRecord: '按住录音',
      recording: '录音中...',
      tapToSend: '点击发送',
      cancel: '取消',
      send: '发送',
      noPermission: '请允许麦克风权限',
      uploadFailed: '上传失败',
      maxDuration: '最长60秒',
    },
    en: {
      holdToRecord: 'Hold to record',
      recording: 'Recording...',
      tapToSend: 'Tap to send',
      cancel: 'Cancel',
      send: 'Send',
      noPermission: 'Please allow microphone access',
      uploadFailed: 'Upload failed',
      maxDuration: 'Max 60 seconds',
    },
  }[language];

  // 处理发送
  const handleSend = async () => {
    if (!audioBlob || isSending) return;

    try {
      setIsSending(true);

      const result = await uploadChatAudio({
        roomId,
        audioBlob,
        duration,
      });

      if (result.success && result.audioUrl) {
        await onSend(result.audioUrl, result.duration || duration);
        handleCancel();
      } else {
        console.error('上传失败:', result.error);
      }
    } catch (err) {
      console.error('发送语音失败:', err);
    } finally {
      setIsSending(false);
    }
  };

  // 处理取消
  const handleCancel = () => {
    cancelRecording();
    setShowRecorder(false);
    setIsPlaying(false);
    onCancel?.();
  };

  // 处理开始录制按钮点击
  const handleStartClick = async () => {
    if (hasPermission === false) {
      const granted = await requestPermission();
      if (!granted) return;
    }
    setShowRecorder(true);
    await startRecording();
  };

  // 播放/暂停预览
  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // 监听音频播放结束
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => setIsPlaying(false);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  // 如果没有显示录制器，显示录制按钮
  if (!showRecorder) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleStartClick}
        className={cn('text-gray-500 hover:text-gray-700', className)}
        title={t.holdToRecord}
      >
        <Mic className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <div className={cn(
      'flex items-center space-x-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg',
      className
    )}>
      {/* 隐藏的音频元素用于预览 */}
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} className="hidden" />
      )}

      {/* 录制中状态 */}
      {isRecording && !audioBlob && (
        <>
          {/* 取消按钮 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="text-gray-500"
          >
            <X className="h-5 w-5" />
          </Button>

          {/* 波形可视化 */}
          <div className="flex-1 flex items-center justify-center space-x-0.5 h-8">
            {waveformData.map((value, index) => (
              <div
                key={index}
                className="w-1 bg-red-500 rounded-full transition-all duration-75"
                style={{
                  height: `${Math.max(4, value * 28)}px`,
                  opacity: isPaused ? 0.5 : 1,
                }}
              />
            ))}
            {waveformData.length === 0 && (
              <div className="flex items-center space-x-1">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 h-2 bg-red-300 rounded-full"
                  />
                ))}
              </div>
            )}
          </div>

          {/* 时长显示 */}
          <div className="text-sm font-mono text-red-500 min-w-[48px] text-center">
            {formatAudioDuration(duration)}
          </div>

          {/* 暂停/继续按钮 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={isPaused ? resumeRecording : pauseRecording}
            className="text-gray-500"
          >
            {isPaused ? (
              <Play className="h-5 w-5" />
            ) : (
              <Pause className="h-5 w-5" />
            )}
          </Button>

          {/* 停止录制按钮 */}
          <Button
            variant="default"
            size="sm"
            onClick={stopRecording}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            <Square className="h-4 w-4" />
          </Button>
        </>
      )}

      {/* 录制完成状态 */}
      {audioBlob && (
        <>
          {/* 删除按钮 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="text-red-500"
          >
            <Trash2 className="h-5 w-5" />
          </Button>

          {/* 播放/暂停按钮 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={togglePlayback}
            className="text-gray-500"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </Button>

          {/* 时长显示 */}
          <div className="flex-1 text-sm text-gray-600 dark:text-gray-400">
            {formatAudioDuration(duration)}
          </div>

          {/* 发送按钮 */}
          <Button
            variant="default"
            size="sm"
            onClick={handleSend}
            disabled={isSending}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            {isSending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-red-100 text-red-600 text-sm rounded">
          {error}
        </div>
      )}
    </div>
  );
}

export default VoiceRecorder;

