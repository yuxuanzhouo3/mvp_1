'use client';

// 禁用静态路径生成，因为聊天室ID是动态的
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';
import { useLanguage } from '@/components/language-provider';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { useRealtimeTyping } from '@/hooks/useRealtimeTyping';
import { usePresence } from '@/hooks/usePresence';
import { useToast } from '@/hooks/use-toast';
import { chatClient, Message, MessageType } from '@/lib/realtime/chat-client';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Send,
  ArrowLeft,
  MoreVertical,
  Image as ImageIcon,
  Smile,
  Phone,
  Video,
  X,
  Mic,
  Play,
  Pause,
  Square,
  Loader2,
  Trash2,
  LogOut,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmojiPicker } from '@/components/ui/emoji-picker';
import { uploadChatImage } from '@/lib/storage/upload-image';
import { uploadChatAudio, formatAudioDuration } from '@/lib/storage/upload-audio';
import { uploadChatVideo, formatVideoDuration } from '@/lib/storage/upload-video';

interface ChatUser {
  id: string;
  username: string;
  avatar_url: string | null;
  gender: string | null;
  last_active_at: string | null;
}

interface CurrentUserProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

/**
 * 聊天对话页面 - INTL 环境
 * 使用 Supabase Realtime 实现实时消息
 */
export default function ChatRoomPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const roomId = params.roomId as string;

  const [mounted, setMounted] = useState(false);
  const [chatUser, setChatUser] = useState<ChatUser | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<CurrentUserProfile | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 媒体相关状态
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const recordingDurationRef = useRef<number>(0); // 用于在onstop回调中获取最新录音时长

  // 使用 Realtime Hooks
  const {
    messages,
    loading: loadingMessages,
    error,
    hasMore,
    sendMessage,
    loadMore,
    recallMessage,
    isSending,
  } = useRealtimeMessages({ roomId });

  const {
    isOtherTyping,
    sendTyping,
    stopTyping,
  } = useRealtimeTyping({ roomId });

  // Track user presence in this chat room for push notification optimization
  usePresence({ roomId, enabled: mounted && !!user });

  // 加载聊天用户信息
  const loadChatUser = useCallback(async () => {
    if (!roomId) return;

    try {
      setLoadingUser(true);
      const rooms = await chatClient.getChatRooms(user?.id || '');
      const currentRoom = rooms.find(r => r.id === roomId);

      if (currentRoom) {
        setChatUser({
          id: currentRoom.other_user_id,
          username: currentRoom.other_user_username,
          avatar_url: currentRoom.other_user_avatar_url,
          gender: currentRoom.other_user_gender,
          last_active_at: currentRoom.other_user_last_active,
        });
      }
    } catch (err) {
      console.error('加载聊天用户失败:', err);
    } finally {
      setLoadingUser(false);
    }
  }, [roomId, user?.id]);

  // 加载当前用户 profile
  const loadCurrentUserProfile = useCallback(async () => {
    if (!user?.id) return;

    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.access_token) {
        const res = await fetch('/api/user/profile', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          cache: 'no-store'
        });

        if (res.ok) {
          const data = await res.json();
          setCurrentUserProfile({
            id: data.profile.id,
            full_name: data.profile.full_name,
            avatar_url: data.profile.avatar_url,
          });
        }
      }
    } catch (err) {
      console.error('加载当前用户资料失败:', err);
    }
  }, [user?.id]);

  // 滚动到底部
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: smooth ? 'smooth' : 'auto' 
    });
  }, []);

  // 发送消息
  const handleSend = async () => {
    const content = inputValue.trim();
    if (!content || isSending) return;

    try {
      stopTyping();
      setInputValue('');
      setReplyTo(null);
      
      await sendMessage(content, 'text', {}, replyTo?.id);
      
      // 发送后滚动到底部
      setTimeout(() => scrollToBottom(), 100);
    } catch (err) {
      console.error('发送失败:', err);
    }
  };

  // 处理输入
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    sendTyping();
  };

  // 处理按键
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 撤回消息
  const handleRecall = async (messageId: string) => {
    try {
      await recallMessage(messageId);
      setShowMenu(null);
    } catch (err) {
      console.error('撤回失败:', err);
    }
  };

  // 回复消息
  const handleReply = (message: Message) => {
    setReplyTo(message);
    setShowMenu(null);
    inputRef.current?.focus();
  };

  // 处理表情选择
  const handleEmojiSelect = (emoji: string) => {
    setInputValue(prev => prev + emoji);
    inputRef.current?.focus();
  };

  // 清空聊天记录
  const handleClearChat = async () => {
    if (!roomId || !user?.id) return;

    try {
      setIsDeleting(true);
      await chatClient.clearMessages(roomId, user.id);
      setShowClearDialog(false);
      setShowHeaderMenu(false);
      toast({
        title: language === 'zh' ? '聊天记录已清空' : 'Chat history cleared',
        description: language === 'zh' ? '所有消息已被删除' : 'All messages have been deleted',
      });
      // 刷新页面以更新消息列表
      window.location.reload();
    } catch (err) {
      console.error('清空聊天记录失败:', err);
      toast({
        title: language === 'zh' ? '操作失败' : 'Operation failed',
        description: language === 'zh' ? '清空聊天记录时出错' : 'Error clearing chat history',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // 删除对话
  const handleDeleteConversation = async () => {
    if (!roomId || !user?.id) return;

    try {
      setIsDeleting(true);
      await chatClient.deleteConversation(roomId, user.id);
      setShowDeleteDialog(false);
      setShowHeaderMenu(false);
      toast({
        title: language === 'zh' ? '对话已删除' : 'Conversation deleted',
        description: language === 'zh' ? '该对话已从列表中移除' : 'This conversation has been removed from your list',
      });
      // 返回消息列表页面
      router.push('/dashboard/messages');
    } catch (err) {
      console.error('删除对话失败:', err);
      toast({
        title: language === 'zh' ? '操作失败' : 'Operation failed',
        description: language === 'zh' ? '删除对话时出错' : 'Error deleting conversation',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // ========== 图片上传功能 ==========
  const handleImageSelect = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !roomId) return;

    try {
      setIsUploading(true);
      const result = await uploadChatImage({ roomId, file });

      if (result.success && result.imageUrl) {
        await sendMessage('', 'image', {
          image_url: result.imageUrl,
          thumbnail_url: result.thumbnailUrl,
          width: result.width,
          height: result.height,
        });
        setTimeout(() => scrollToBottom(), 100);
      } else {
        console.error('图片上传失败:', result.error);
        alert(result.error || (language === 'zh' ? '图片上传失败' : 'Failed to upload image'));
      }
    } catch (err) {
      console.error('图片上传异常:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // ========== 视频上传功能 ==========
  const handleVideoSelect = () => {
    videoInputRef.current?.click();
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !roomId) return;

    // 获取视频时长
    const getVideoDuration = (file: File): Promise<number> => {
      return new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          URL.revokeObjectURL(video.src);
          resolve(video.duration);
        };
        video.onerror = () => resolve(0);
        video.src = URL.createObjectURL(file);
      });
    };

    try {
      setIsUploading(true);
      const duration = await getVideoDuration(file);

      // 检查时长限制（15秒）
      if (duration > 15) {
        alert(language === 'zh' ? '视频时长不能超过15秒' : 'Video duration cannot exceed 15 seconds');
        return;
      }

      const result = await uploadChatVideo({
        roomId,
        videoBlob: file,
        duration,
      });

      if (result.success && result.videoUrl) {
        await sendMessage('', 'video', {
          video_url: result.videoUrl,
          thumbnail_url: result.thumbnailUrl,
          duration: result.duration,
          width: result.width,
          height: result.height,
        });
        setTimeout(() => scrollToBottom(), 100);
      } else {
        console.error('视频上传失败:', result.error);
        alert(result.error || (language === 'zh' ? '视频上传失败' : 'Failed to upload video'));
      }
    } catch (err) {
      console.error('视频上传异常:', err);
    } finally {
      setIsUploading(false);
      if (videoInputRef.current) {
        videoInputRef.current.value = '';
      }
    }
  };

  // ========== 语音录制功能 ==========
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });

      audioChunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;
      recordingDurationRef.current = 0; // 重置录音时长ref

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());

        // 使用 ref 获取最新的录音时长（避免闭包陷阱）
        const finalDuration = recordingDurationRef.current;

        if (audioChunksRef.current.length > 0 && finalDuration >= 1) {
          const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
          await handleAudioUpload(audioBlob, finalDuration);
        }

        setRecordingDuration(0);
        recordingDurationRef.current = 0;
      };

      mediaRecorder.start(100);
      setIsRecording(true);

      // 开始计时
      let duration = 0;
      recordingTimerRef.current = setInterval(() => {
        duration += 1;
        setRecordingDuration(duration);
        recordingDurationRef.current = duration; // 同步更新 ref

        // 最大60秒
        if (duration >= 60) {
          stopRecording();
        }
      }, 1000);

    } catch (err) {
      console.error('无法访问麦克风:', err);
      alert(language === 'zh' ? '无法访问麦克风，请检查权限设置' : 'Cannot access microphone, please check permissions');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      audioChunksRef.current = [];
      setIsRecording(false);
      setRecordingDuration(0);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const handleAudioUpload = async (audioBlob: Blob, duration: number) => {
    if (!roomId) return;

    try {
      setIsUploading(true);
      const result = await uploadChatAudio({ roomId, audioBlob, duration });

      if (result.success && result.audioUrl) {
        await sendMessage('', 'audio', {
          audio_url: result.audioUrl,
          duration: result.duration,
        });
        setTimeout(() => scrollToBottom(), 100);
      } else {
        console.error('语音上传失败:', result.error);
        alert(result.error || (language === 'zh' ? '语音上传失败' : 'Failed to upload voice message'));
      }
    } catch (err) {
      console.error('语音上传异常:', err);
    } finally {
      setIsUploading(false);
    }
  };

  // ========== 音频播放功能 ==========
  const toggleAudioPlay = (messageId: string, audioUrl: string) => {
    let audio = audioElementsRef.current.get(messageId);

    if (!audio) {
      audio = new Audio(audioUrl);
      audio.onended = () => setPlayingAudioId(null);
      audio.onerror = () => setPlayingAudioId(null);
      audioElementsRef.current.set(messageId, audio);
    }

    if (playingAudioId === messageId) {
      audio.pause();
      audio.currentTime = 0;
      setPlayingAudioId(null);
    } else {
      // 停止其他正在播放的音频
      audioElementsRef.current.forEach((a, id) => {
        if (id !== messageId) {
          a.pause();
          a.currentTime = 0;
        }
      });
      audio.play();
      setPlayingAudioId(messageId);
    }
  };

  // Get timezone based on deployment region
  const getTimezone = () => {
    const region = process.env.NEXT_PUBLIC_DEPLOYMENT_REGION;
    if (region === 'CN') {
      return 'Asia/Shanghai'; // Beijing time
    }
    return 'America/Los_Angeles'; // US Pacific time for INTL
  };

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const timezone = getTimezone();

    return date.toLocaleTimeString(language === 'zh' ? 'zh-CN' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
    });
  };

  // 格式化日期分组
  const formatDateGroup = (dateString: string) => {
    const date = new Date(dateString);
    const timezone = getTimezone();

    // Get current date in the target timezone
    const now = new Date();
    const nowInTz = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const dateInTz = new Date(date.toLocaleString('en-US', { timeZone: timezone }));

    // Compare dates (ignoring time)
    const nowDate = new Date(nowInTz.getFullYear(), nowInTz.getMonth(), nowInTz.getDate());
    const msgDate = new Date(dateInTz.getFullYear(), dateInTz.getMonth(), dateInTz.getDate());
    const diffDays = Math.floor((nowDate.getTime() - msgDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return language === 'zh' ? '今天' : 'Today';
    } else if (diffDays === 1) {
      return language === 'zh' ? '昨天' : 'Yesterday';
    } else {
      return date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: timezone,
      });
    }
  };

  // 检查是否可以撤回（2分钟内）
  const canRecall = (message: Message) => {
    if (message.sender_id !== user?.id) return false;
    if (message.deleted_at) return false;
    const sentTime = new Date(message.sent_at).getTime();
    const now = new Date().getTime();
    return now - sentTime < 2 * 60 * 1000;
  };

  // 按日期分组消息
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = '';

    messages.forEach(msg => {
      const msgDate = new Date(msg.sent_at).toDateString();
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msg.sent_at, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });

    return groups;
  };

  // 渲染消息内容
  const renderMessageContent = (message: Message) => {
    // 撤回的消息
    if (message.deleted_at) {
      return (
        <p className="text-sm text-gray-400 dark:text-gray-500 italic">
          {message.sender_id === user?.id 
            ? (language === 'zh' ? '你撤回了一条消息' : 'You recalled a message')
            : (language === 'zh' ? '对方撤回了一条消息' : 'Message recalled')
          }
        </p>
      );
    }

    switch (message.message_type) {
      case 'image':
        const imageUrl = (message.metadata as Record<string, string>)?.image_url;
        const thumbnailUrl = (message.metadata as Record<string, string>)?.thumbnail_url;
        return imageUrl ? (
          <div className="overflow-hidden rounded-xl cursor-pointer group/image">
            <img
              src={thumbnailUrl || imageUrl}
              alt="Image"
              className="max-w-xs max-h-64 object-cover transition-transform duration-300 group-hover/image:scale-105"
              onClick={() => window.open(imageUrl, '_blank')}
              loading="lazy"
            />
          </div>
        ) : null;

      case 'audio':
        const audioUrl = (message.metadata as Record<string, string>)?.audio_url;
        const audioDuration = (message.metadata as Record<string, number>)?.duration || 0;
        const isPlaying = playingAudioId === message.id;

        return audioUrl ? (
          <div
            className="flex items-center space-x-3 min-w-[160px] cursor-pointer group/audio"
            onClick={() => toggleAudioPlay(message.id, audioUrl)}
          >
            <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 ${
              message.sender_id === user?.id
                ? 'bg-white/20 group-hover/audio:bg-white/30'
                : 'bg-primary/10 group-hover/audio:bg-primary/20'
            }`}>
              {isPlaying ? (
                <Pause className={`h-5 w-5 ${message.sender_id === user?.id ? 'text-white' : 'text-primary'}`} />
              ) : (
                <Play className={`h-5 w-5 ml-0.5 ${message.sender_id === user?.id ? 'text-white' : 'text-primary'}`} />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-1">
                {[...Array(Math.min(Math.ceil(audioDuration / 5), 8))].map((_, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all ${
                      message.sender_id === user?.id
                        ? 'bg-white/50'
                        : 'bg-primary/40'
                    } ${isPlaying ? 'animate-pulse' : ''}`}
                    style={{ height: `${8 + Math.random() * 12}px` }}
                  />
                ))}
              </div>
              <span className={`text-xs mt-1 block ${
                message.sender_id === user?.id
                  ? 'text-white/70'
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                {formatAudioDuration(audioDuration)}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <div className="w-32 h-8 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
              <span className="text-sm text-gray-500">🎵 {language === 'zh' ? '语音消息' : 'Voice'}</span>
            </div>
          </div>
        );

      case 'video':
        const videoUrl = (message.metadata as Record<string, string>)?.video_url;
        const videoThumb = (message.metadata as Record<string, string>)?.thumbnail_url;
        const videoDuration = (message.metadata as Record<string, number>)?.duration || 0;
        return (
          <div className="relative max-w-xs cursor-pointer group/video overflow-hidden rounded-xl" onClick={() => videoUrl && window.open(videoUrl, '_blank')}>
            {videoThumb ? (
              <img src={videoThumb} alt="Video" className="max-h-48 object-cover transition-transform duration-300 group-hover/video:scale-105" />
            ) : (
              <div className="w-48 h-32 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700" />
            )}
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center transition-all duration-200 group-hover/video:bg-black/30">
              <div className="w-14 h-14 bg-primary/90 rounded-full flex items-center justify-center shadow-lg transition-transform duration-200 group-hover/video:scale-110">
                <Play className="h-7 w-7 text-white ml-1" />
              </div>
            </div>
            {videoDuration > 0 && (
              <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md font-medium">
                {formatVideoDuration(videoDuration)}
              </div>
            )}
          </div>
        );

      case 'location':
        return (
          <div className="flex items-center space-x-2">
            <div className="w-36 h-24 bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
              <span className="text-sm text-primary">📍 {language === 'zh' ? '位置' : 'Location'}</span>
            </div>
          </div>
        );

      default:
        return <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>;
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && user?.id && roomId) {
      loadChatUser();
      loadCurrentUserProfile();
    }
  }, [mounted, user?.id, roomId, loadChatUser, loadCurrentUserProfile]);

  // 新消息自动滚动
  useEffect(() => {
    if (messages.length > 0 && !loadingMessages) {
      scrollToBottom();
    }
  }, [messages.length, loadingMessages, scrollToBottom]);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showHeaderMenu) {
        setShowHeaderMenu(false);
      }
    };

    if (showHeaderMenu) {
      // 延迟添加监听器，避免立即触发
      const timer = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [showHeaderMenu]);

  // 处理滚动加载更多
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || !hasMore) return;

    if (container.scrollTop < 100) {
      loadMore();
    }
  }, [hasMore, loadMore]);

  if (!mounted) {
    return <div suppressHydrationWarning />;
  }

  if (loadingUser) {
    return (
      <div className="h-full bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
        {/* 头部骨架 */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
        {/* 消息区骨架 */}
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
              <Skeleton className="h-12 w-48 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
      {/* 聊天头部 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex-shrink-0 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* 返回按钮 - 所有设备都显示 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/messages')}
              className="hover:bg-primary/10 rounded-xl"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <Avatar className="w-11 h-11 ring-2 ring-offset-2 ring-primary/30 ring-offset-white dark:ring-offset-gray-800">
              <AvatarImage src={chatUser?.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-white font-semibold">
                {chatUser?.username?.charAt(0).toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>

            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white text-lg">
                {chatUser?.username || (language === 'zh' ? '未知用户' : 'Unknown')}
              </h2>
              <div className="flex items-center space-x-2">
                {chatUser?.last_active_at &&
                 new Date().getTime() - new Date(chatUser.last_active_at).getTime() < 5 * 60 * 1000 ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                      {language === 'zh' ? '在线' : 'Online'}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {language === 'zh' ? '离线' : 'Offline'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-primary hover:bg-primary/10 rounded-xl"
              onClick={() => toast({
                title: language === 'zh' ? '功能暂未开放' : 'Coming Soon',
                description: language === 'zh' ? '语音通话功能正在开发中，敬请期待！' : 'Voice call feature is under development. Stay tuned!',
              })}
            >
              <Phone className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-primary hover:bg-primary/10 rounded-xl"
              onClick={() => toast({
                title: language === 'zh' ? '功能暂未开放' : 'Coming Soon',
                description: language === 'zh' ? '视频通话功能正在开发中，敬请期待！' : 'Video call feature is under development. Stay tuned!',
              })}
            >
              <Video className="h-5 w-5" />
            </Button>
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-primary hover:bg-primary/10 rounded-xl"
                onClick={() => setShowHeaderMenu(!showHeaderMenu)}
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
              {/* 下拉菜单 */}
              {showHeaderMenu && (
                <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-30 overflow-hidden min-w-[160px]">
                  <button
                    onClick={() => {
                      setShowHeaderMenu(false);
                      setShowClearDialog(true);
                    }}
                    className="flex items-center w-full px-4 py-3 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Trash2 className="h-4 w-4 mr-3 text-gray-500" />
                    {language === 'zh' ? '清空聊天记录' : 'Clear Chat'}
                  </button>
                  <button
                    onClick={() => {
                      setShowHeaderMenu(false);
                      setShowDeleteDialog(true);
                    }}
                    className="flex items-center w-full px-4 py-3 text-sm text-left text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut className="h-4 w-4 mr-3" />
                    {language === 'zh' ? '删除对话' : 'Delete Conversation'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 消息区域 */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950"
        onScroll={handleScroll}
      >
        {/* 加载更多提示 */}
        {hasMore && (
          <div className="text-center py-2">
            <Button variant="ghost" size="sm" onClick={loadMore} className="text-primary hover:bg-primary/10">
              {language === 'zh' ? '加载更多' : 'Load more'}
            </Button>
          </div>
        )}

        {/* 消息列表 */}
        {groupMessagesByDate(messages).map((group, groupIndex) => (
          <div key={groupIndex}>
            {/* 日期分隔线 */}
            <div className="flex items-center justify-center my-6">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent" />
              <span className="px-4 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-full shadow-sm border border-gray-200 dark:border-gray-700">
                {formatDateGroup(group.date)}
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent" />
            </div>

            {/* 消息列表 */}
            {group.messages.map((message) => {
              const isOwn = message.sender_id === user?.id;

              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300`}
                >
                  <div className={`flex items-end space-x-3 max-w-[85%] lg:max-w-[70%] ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    {/* 头像 */}
                    <Avatar className={`h-9 w-9 flex-shrink-0 ring-2 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-900 ${isOwn ? 'ring-primary/50' : 'ring-gray-200 dark:ring-gray-700'}`}>
                      {isOwn ? (
                        <>
                          <AvatarImage src={currentUserProfile?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-primary to-primary/70 text-white">
                            {currentUserProfile?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?'}
                          </AvatarFallback>
                        </>
                      ) : (
                        <>
                          <AvatarImage src={chatUser?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-gray-400 to-gray-500 text-white">
                            {chatUser?.username?.charAt(0).toUpperCase() || '?'}
                          </AvatarFallback>
                        </>
                      )}
                    </Avatar>

                    <div className="relative group flex flex-col min-w-[120px]">
                      {/* 时间和用户名 - 显示在消息上方 */}
                      <div className={`text-xs mb-1.5 flex items-center gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <span className="font-medium text-gray-500 dark:text-gray-400">
                          {isOwn
                            ? (currentUserProfile?.full_name || (language === 'zh' ? '我' : 'Me'))
                            : (chatUser?.username || (language === 'zh' ? '对方' : 'User'))
                          }
                        </span>
                        <span className="text-gray-400 dark:text-gray-500">{formatTime(message.sent_at)}</span>
                      </div>

                      {/* 回复引用 */}
                      {message.reply_to_message_id && (
                        <div className={`text-xs mb-2 p-2.5 rounded-lg border-l-3 ${
                          isOwn
                            ? 'bg-primary/10 border-l-primary/50 dark:bg-primary/20'
                            : 'bg-gray-100 border-l-gray-400 dark:bg-gray-800 dark:border-l-gray-500'
                        }`}>
                          <span className="text-gray-500 dark:text-gray-400 font-medium">
                            {language === 'zh' ? '回复: ' : 'Reply: '}
                          </span>
                          <span className="text-gray-600 dark:text-gray-300 truncate">
                            {messages.find(m => m.id === message.reply_to_message_id)?.content?.slice(0, 20) || '...'}
                          </span>
                        </div>
                      )}

                      {/* 消息气泡和已读状态容器 */}
                      <div className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                        {/* 消息气泡 - 更宽的样式 */}
                        <div
                          className={`rounded-2xl px-5 py-3 shadow-sm transition-all duration-200 hover:shadow-md min-w-[100px] ${
                            isOwn
                              ? 'bg-gradient-to-br from-primary to-primary/85 text-white rounded-br-md'
                              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-bl-md'
                          }`}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setShowMenu(showMenu === message.id ? null : message.id);
                          }}
                        >
                          {renderMessageContent(message)}
                        </div>

                        {/* 已读状态 - 显示在气泡外侧的圆圈 */}
                        {isOwn && !message.deleted_at && (
                          <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                            message.is_read
                              ? 'bg-green-500'
                              : 'bg-gray-300 dark:bg-gray-600'
                          }`}>
                            <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* 消息菜单 */}
                      {showMenu === message.id && !message.deleted_at && (
                        <div className={`absolute ${isOwn ? 'right-0' : 'left-0'} top-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-20 overflow-hidden min-w-[100px]`}>
                          <button
                            onClick={() => handleReply(message)}
                            className="block w-full px-4 py-2.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            {language === 'zh' ? '回复' : 'Reply'}
                          </button>
                          {canRecall(message) && (
                            <button
                              onClick={() => handleRecall(message.id)}
                              className="block w-full px-4 py-2.5 text-sm text-left text-primary hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
                            >
                              {language === 'zh' ? '撤回' : 'Recall'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* 正在输入提示 */}
        {isOtherTyping && (
          <div className="flex justify-start mb-4">
            <div className="flex items-end space-x-3">
              <Avatar className="h-9 w-9 ring-2 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-900 ring-gray-200 dark:ring-gray-700">
                <AvatarImage src={chatUser?.avatar_url || undefined} />
                <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-gray-400 to-gray-500 text-white">
                  {chatUser?.username?.charAt(0).toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                <div className="flex space-x-1.5">
                  <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 回复预览 */}
      {replyTo && (
        <div className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between flex-shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {language === 'zh' ? '回复' : 'Replying to'} {replyTo.sender_id === user?.id ? (language === 'zh' ? '自己' : 'yourself') : chatUser?.username}
            </p>
            <p className="text-sm truncate">{replyTo.content}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setReplyTo(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* 输入区域 */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
        {/* 隐藏的文件输入 */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          className="hidden"
        />
        {/* 隐藏的视频输入 */}
        <input
          type="file"
          ref={videoInputRef}
          onChange={handleVideoUpload}
          accept="video/*"
          className="hidden"
        />

        {/* 录音状态UI */}
        {isRecording ? (
          <div className="flex items-center justify-between bg-primary/5 dark:bg-primary/10 rounded-2xl p-3">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
              <span className="text-primary font-semibold">
                {formatAudioDuration(recordingDuration)}
              </span>
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                {language === 'zh' ? '正在录音...' : 'Recording...'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={cancelRecording}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </Button>
              <Button
                size="sm"
                onClick={stopRecording}
                className="bg-primary hover:bg-primary/90 text-white rounded-xl"
              >
                <Square className="h-4 w-4 mr-1" />
                {language === 'zh' ? '发送' : 'Send'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-end space-x-2">
            {/* 图片按钮 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleImageSelect}
              disabled={isUploading}
              title={language === 'zh' ? '发送图片' : 'Send image'}
              className="text-gray-500 hover:text-primary hover:bg-primary/10 rounded-xl"
            >
              <ImageIcon className="h-5 w-5" />
            </Button>

            {/* 视频按钮 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleVideoSelect}
              disabled={isUploading}
              title={language === 'zh' ? '发送视频（最长15秒）' : 'Send video (max 15s)'}
              className="text-gray-500 hover:text-primary hover:bg-primary/10 rounded-xl"
            >
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                <Video className="h-5 w-5" />
              )}
            </Button>

            {/* 输入框 */}
            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={language === 'zh' ? '输入消息...' : 'Type a message...'}
                rows={1}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 resize-none transition-all duration-200"
                style={{ maxHeight: '120px' }}
                disabled={isUploading}
              />
            </div>

            {/* 表情按钮 */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`rounded-xl ${showEmojiPicker ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:text-primary hover:bg-primary/10'}`}
              >
                <Smile className="h-5 w-5" />
              </Button>
              <EmojiPicker
                isOpen={showEmojiPicker}
                onClose={() => setShowEmojiPicker(false)}
                onSelect={handleEmojiSelect}
                language={language as 'zh' | 'en'}
              />
            </div>

            {/* 发送或录音按钮 */}
            {inputValue.trim() ? (
              <Button
                onClick={handleSend}
                disabled={isSending || isUploading}
                size="sm"
                className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
              >
                <Send className="h-5 w-5" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={startRecording}
                disabled={isUploading}
                className="text-primary hover:text-primary hover:bg-primary/10 rounded-xl"
              >
                <Mic className="h-5 w-5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 清空聊天记录确认对话框 */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Trash2 className="h-5 w-5 mr-2 text-primary" />
              {language === 'zh' ? '清空聊天记录' : 'Clear Chat History'}
            </DialogTitle>
            <DialogDescription>
              {language === 'zh'
                ? '此操作将删除与该用户的所有聊天记录，且无法恢复。确定要继续吗？'
                : 'This will permanently delete all messages with this user. This action cannot be undone. Are you sure?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowClearDialog(false)}
              disabled={isDeleting}
            >
              {language === 'zh' ? '取消' : 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearChat}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {language === 'zh' ? '处理中...' : 'Processing...'}
                </>
              ) : (
                language === 'zh' ? '确认清空' : 'Clear All'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除对话确认对话框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <LogOut className="h-5 w-5 mr-2 text-red-500" />
              {language === 'zh' ? '删除对话' : 'Delete Conversation'}
            </DialogTitle>
            <DialogDescription>
              {language === 'zh'
                ? '此操作将从消息列表中移除该对话。如果对方再次发送消息，对话会重新出现。确定要继续吗？'
                : 'This will remove the conversation from your message list. If they send you a message, the conversation will reappear. Are you sure?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              {language === 'zh' ? '取消' : 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConversation}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {language === 'zh' ? '处理中...' : 'Processing...'}
                </>
              ) : (
                language === 'zh' ? '确认删除' : 'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

