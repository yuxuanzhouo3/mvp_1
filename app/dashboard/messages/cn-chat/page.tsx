'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/app/providers/AuthProvider';
import { useLanguage } from '@/components/language-provider';
import { getChatService } from '@/lib/services/chat';
import { isChinaDeployment } from '@/lib/config/deployment.config';
import type { ChatRoomWithUser, ChatMessage, IChatService } from '@/lib/services/chat/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  MessageSquare,
  Search,
  Send,
  ArrowLeft,
  MoreVertical,
  Image as ImageIcon,
  Smile,
  Phone,
  Video,
  Mic,
  Play,
  Pause,
  Square,
  Loader2,
  FileText,
  X,
  User,
  Pin,
  SearchIcon,
  Bot,
} from 'lucide-react';
import { EmojiPicker } from '@/components/ui/emoji-picker';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AIAssistant } from '@/components/ai';
import { useToast } from '@/hooks/use-toast';
import { useTencentASR } from '@/hooks/useTencentASR';
import type { CallKitRef } from 'easemob-chat-uikit';

const EasemobCallKit = dynamic(() => import('@/components/easemob-callkit'), {
  ssr: false,
});

type CallUiStatus = 'idle' | 'calling' | 'ringing' | 'connected' | 'disconnected';

function tryParseCloudbaseFilePathFromUrl(input?: string | null): string | null {
  if (!input) return null;
  try {
    const url = new URL(input);
    const host = url.hostname || '';
    if (!host.includes('tcb.qcloud.la')) return null;
    const pathname = url.pathname || '';
    const trimmed = pathname.replace(/^\/+/, '');
    return trimmed || null;
  } catch {
    return null;
  }
}

function normalizeVoiceText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function mergeVoiceInput(baseText: string, nextText: string): string {
  const base = baseText.trim();
  const next = normalizeVoiceText(nextText);
  if (!next) return base;
  if (!base) return next;
  if (base.endsWith(next)) return base;

  const maxOverlap = Math.min(base.length, next.length);
  for (let overlap = maxOverlap; overlap > 0; overlap -= 1) {
    if (base.slice(-overlap) === next.slice(0, overlap)) {
      return `${base}${next.slice(overlap)}`;
    }
  }

  const hasCjk = /[\u4e00-\u9fff]/.test(base + next);
  return hasCjk ? `${base}${next}` : `${base} ${next}`;
}

export default function CnChatPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const isCnDeployment = isChinaDeployment();

  // State
  const [mounted, setMounted] = useState(false);
  const [rooms, setRooms] = useState<ChatRoomWithUser[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoomWithUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [resolvedVideoUrls, setResolvedVideoUrls] = useState<Record<string, string>>({});
  const [videoLoadFailures, setVideoLoadFailures] = useState<Record<string, boolean>>({});
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isRealtimeVoiceInputActive, setIsRealtimeVoiceInputActive] = useState(false);
  const [interimVoiceText, setInterimVoiceText] = useState('');
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [showMobileList, setShowMobileList] = useState(true);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showSearchMessages, setShowSearchMessages] = useState(false);
  const [searchMessageQuery, setSearchMessageQuery] = useState('');
  const [pinnedRoomIds, setPinnedRoomIds] = useState<Set<string>>(new Set());
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [aiAssistantMessage, setAiAssistantMessage] = useState<{ id: string; content: string } | null>(null);
  const [callConfigError, setCallConfigError] = useState<string | null>(null);
  const [callKitReady, setCallKitReady] = useState(false);
  const [callStatus, setCallStatus] = useState<CallUiStatus>('idle');

  // Refs
  const chatServiceRef = useRef<IChatService | null>(null);
  const callKitRef = useRef<CallKitRef>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingDurationRef = useRef<number>(0);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const videoRefreshInFlightRef = useRef<Set<string>>(new Set());
  const inputValueRef = useRef('');
  const voiceCommittedInputRef = useRef('');

  const prevUserIdRef = useRef<string | null>(null);
  const prevCallUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const current = user?.id || null;
    if (prevUserIdRef.current !== current) {
      prevUserIdRef.current = current;
      setResolvedVideoUrls({});
      setVideoLoadFailures({});
    }
  }, [user?.id]);

  useEffect(() => {
    const current = user?.id || null;
    if (prevCallUserIdRef.current !== current) {
      prevCallUserIdRef.current = current;
      setCallConfigError(null);
      setCallKitReady(false);
      setCallStatus('idle');
    }
  }, [user?.id]);

  useEffect(() => {
    inputValueRef.current = inputValue;
  }, [inputValue]);

  useEffect(() => {
    if (!isRealtimeVoiceInputActive) {
      voiceCommittedInputRef.current = inputValue;
      if (interimVoiceText) setInterimVoiceText('');
    }
  }, [inputValue, isRealtimeVoiceInputActive, interimVoiceText]);

  const handleViewProfile = useCallback(() => {
    if (!selectedRoom) return;
    setShowUserProfile(true);
  }, [selectedRoom]);

  const applyPresenceToRooms = useCallback(
    (roomList: ChatRoomWithUser[], presence: Record<string, boolean>) => {
      if (!presence || Object.keys(presence).length === 0) return roomList;
      return roomList.map((room) => {
        const userId = room.otherUser?.id;
        if (!userId || typeof presence[userId] !== 'boolean') return room;
        if (room.otherUser?.isOnline === presence[userId]) return room;
        return {
          ...room,
          otherUser: {
            ...room.otherUser,
            isOnline: presence[userId],
          },
        };
      });
    },
    []
  );

  const updateRoomPresence = useCallback((userId: string, isOnline: boolean) => {
    setRooms((prev) =>
      prev.map((room) => {
        if (room.otherUser?.id !== userId) return room;
        if (room.otherUser?.isOnline === isOnline) return room;
        return {
          ...room,
          otherUser: {
            ...room.otherUser,
            isOnline,
          },
        };
      })
    );
    setSelectedRoom((prev) => {
      if (!prev || prev.otherUser?.id !== userId) return prev;
      if (prev.otherUser?.isOnline === isOnline) return prev;
      return {
        ...prev,
        otherUser: {
          ...prev.otherUser,
          isOnline,
        },
      };
    });
  }, []);

  const refreshVideoUrl = useCallback(async (message: ChatMessage) => {
    if (!user?.id) return false;
    if (!message?.id) return false;
    if (videoRefreshInFlightRef.current.has(message.id)) return false;

    const fileId = (message.metadata as any)?.cloudbaseFileId as string | undefined;
    const filePath =
      ((message.metadata as any)?.cloudbasePath as string | undefined) ||
      tryParseCloudbaseFilePathFromUrl((message.metadata as any)?.videoUrl as string | undefined);

    if (!fileId && !filePath) return false;

    videoRefreshInFlightRef.current.add(message.id);
    try {
      const params = new URLSearchParams();
      if (fileId) params.set('fileId', fileId);
      if (filePath) params.set('filePath', filePath);

      const response = await fetch(`/api/chat/cloudbase-file-url?${params.toString()}`, {
        cache: 'no-store',
      });
      if (!response.ok) return false;
      const data = await response.json();
      if (data?.success && data?.url) {
        setResolvedVideoUrls((prev) => ({ ...prev, [message.id]: data.url }));
        setVideoLoadFailures((prev) => {
          if (!prev[message.id]) return prev;
          const next = { ...prev };
          delete next[message.id];
          return next;
        });
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      videoRefreshInFlightRef.current.delete(message.id);
    }
  }, [user?.id]);

  // Init chat service
  const initChatService = useCallback(async () => {
    if (!user?.id) return;

    try {
      const service = getChatService();
      chatServiceRef.current = service;

      const result = await service.initialize(user.id);
      if (!result.success) {
        console.error('Chat service init failed:', result.error);
        return;
      }

      // 加载会话列表
      await service.updatePresence(true);

      const roomList = await service.getChatRooms(user.id);
      const userIds = roomList.map((room) => room.otherUser?.id).filter(Boolean) as string[];
      const presenceSnapshot = userIds.length > 0 ? await service.getPresence(userIds) : {};
      const roomsWithPresence = applyPresenceToRooms(roomList, presenceSnapshot);
      setRooms(roomsWithPresence);
      setLoadingRooms(false);

      // Subscribe all messages
      service.subscribeAll(user.id, {
        onMessageReceived: (msg) => {
          setMessages(prev => [...prev, msg]);
          // 刷新会话列表
          service.getChatRooms(user.id).then(async (latestRooms) => {
            const latestUserIds = latestRooms.map((room) => room.otherUser?.id).filter(Boolean) as string[];
            const latestPresence = latestUserIds.length > 0 ? await service.getPresence(latestUserIds) : {};
            setRooms(applyPresenceToRooms(latestRooms, latestPresence));
          });
        },
        onPresenceChanged: (userId, isOnline) => {
          updateRoomPresence(userId, isOnline);
        },
      });

      // 检查URL参数是否有指定的会话
      const roomId = searchParams?.get('room');
      if (roomId) {
        const room = roomsWithPresence.find(r => r.id === roomId || r.otherUser?.id === roomId);
        if (room) {
          handleSelectRoom(room);
        }
      }
    } catch (error) {
      console.error('Init chat service error:', error);
      setLoadingRooms(false);
    }
  }, [user?.id, searchParams, applyPresenceToRooms, updateRoomPresence]);

  useEffect(() => {
    if (!isCnDeployment) {
      setCallConfigError('CallKit is only available in CN deployment');
      return;
    }

    if (!user?.id) {
      setCallConfigError(null);
      return;
    }

    if (!callKitReady) {
      setCallConfigError(language === 'zh' ? 'Call initializing' : 'Call initializing');
      return;
    }

    setCallConfigError(null);
  }, [isCnDeployment, user?.id, callKitReady, language]);

  useEffect(() => {
    const resolveUrls = async () => {
      if (!user?.id) return;

      const pending = messages.filter(
        (m) =>
          m?.type === 'video' &&
          (
            (m?.metadata as any)?.cloudbaseFileId ||
            (m?.metadata as any)?.cloudbasePath ||
            tryParseCloudbaseFilePathFromUrl((m?.metadata as any)?.videoUrl)
          ) &&
          !resolvedVideoUrls[m.id]
      );

      if (pending.length === 0) return;

      await Promise.all(
        pending.map(async (m) => refreshVideoUrl(m))
      );
    };

    resolveUrls();
  }, [messages, refreshVideoUrl, resolvedVideoUrls, user?.id]);

  // 选择会话
  const handleSelectRoom = async (room: ChatRoomWithUser) => {
    setSelectedRoom(room);
    setShowMobileList(false);
    setLoadingMessages(true);

    try {
      const service = chatServiceRef.current;
      if (service) {
        const roomId = room.otherUser?.id || room.id;
        const msgs = await service.getMessages(roomId, { limit: 50 });
        setMessages(msgs);
      }
    } catch (error) {
      console.error('Load messages error:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const {
    isActive: tencentASRActive,
    start: startTencentASR,
    stop: stopTencentASR,
  } = useTencentASR({
    onTranscript: useCallback((text: string, isFinal: boolean) => {
      const normalized = normalizeVoiceText(text);
      if (!normalized) return;

      if (isFinal) {
        const merged = mergeVoiceInput(voiceCommittedInputRef.current, normalized);
        voiceCommittedInputRef.current = merged;
        setInterimVoiceText('');
        setInputValue(merged);
      } else {
        setInterimVoiceText(normalized);
        setInputValue(mergeVoiceInput(voiceCommittedInputRef.current, normalized));
      }
    }, []),
    onError: useCallback((error: string) => {
      setInterimVoiceText('');
      setInputValue(voiceCommittedInputRef.current);
      setIsRealtimeVoiceInputActive(false);
      toast({
        title: language === 'zh' ? '实时语音识别失败' : 'Realtime speech recognition failed',
        description: error,
        variant: 'destructive',
      });
    }, [language, toast]),
    language: language === 'zh' ? 'zh-CN' : 'en-US',
  });

  const stopRealtimeVoiceInput = useCallback(() => {
    stopTencentASR();
    setIsRealtimeVoiceInputActive(false);

    const finalInput = mergeVoiceInput(voiceCommittedInputRef.current, interimVoiceText);
    voiceCommittedInputRef.current = finalInput;
    setInterimVoiceText('');
    setInputValue(finalInput);
  }, [interimVoiceText, stopTencentASR]);

  const startRealtimeVoiceInput = useCallback(() => {
    if (!isCnDeployment) {
      toast({
        title: language === 'zh' ? 'CN only feature' : 'CN only feature',
        description: language === 'zh'
          ? 'Realtime speech-to-text is only available in CN deployment.'
          : 'Realtime speech-to-text is only available in CN deployment.',
        variant: 'destructive',
      });
      return;
    }

    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      const isLocalhost = host === 'localhost' || host === '127.0.0.1' || host === '::1';
      if (!window.isSecureContext && !isLocalhost) {
        toast({
          title: language === 'zh' ? 'Insecure context' : 'Insecure context',
          description: language === 'zh'
            ? 'Realtime voice input requires HTTPS or localhost.'
            : 'Realtime voice input requires HTTPS or localhost.',
          variant: 'destructive',
        });
        return;
      }
    }

    voiceCommittedInputRef.current = inputValueRef.current;
    setInterimVoiceText('');
    setIsRealtimeVoiceInputActive(true);
    void startTencentASR();
  }, [isCnDeployment, language, startTencentASR, toast]);

  // Start voice recording and send as audio message
  const startVoiceMessageRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const duration = recordingDurationRef.current;
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }

        if (audioChunksRef.current.length > 0 && selectedRoom && user?.id) {
          try {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const roomId = selectedRoom.otherUser?.id || selectedRoom.id;
            const formData = new FormData();
            formData.append('audio', audioBlob, 'voice.webm');
            formData.append('chatId', roomId);
            formData.append('duration', String(duration));

            const response = await fetch('/api/chat/upload-audio', {
              method: 'POST',
              body: formData,
            });

            const result = await response.json();
            if (result.success) {
              const service = chatServiceRef.current;
              if (service) {
                const sendResult = await service.sendMessage({
                  roomId,
                  content: '[voice]',
                  type: 'audio',
                  metadata: { audioUrl: result.audio_url, duration },
                });
                if (sendResult.success && sendResult.message) {
                  setMessages((prev) => [...prev, sendResult.message!]);
                  setTimeout(() => scrollToBottom(), 100);
                }
              }
            }
          } catch (error) {
            console.error('Audio upload error:', error);
          }
        }
        setRecordingDuration(0);
      };

      mediaRecorder.start(100);
      setIsRecording(true);

      recordingDurationRef.current = 0;
      recordingTimerRef.current = setInterval(() => {
        recordingDurationRef.current += 1;
        setRecordingDuration(recordingDurationRef.current);
        if (recordingDurationRef.current >= 60) mediaRecorderRef.current?.stop();
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
    }
  }, [selectedRoom, user?.id]);

  const handleSend = async () => {
    const content = (
      isRealtimeVoiceInputActive
        ? mergeVoiceInput(voiceCommittedInputRef.current, interimVoiceText)
        : inputValue
    ).trim();
    if (!content || isSending || !selectedRoom) return;

    try {
      setIsSending(true);
      if (isRealtimeVoiceInputActive) {
        stopRealtimeVoiceInput();
      }
      setInputValue('');
      voiceCommittedInputRef.current = '';
      setInterimVoiceText('');

      const service = chatServiceRef.current;
      if (service) {
        const roomId = selectedRoom.otherUser?.id || selectedRoom.id;
        const result = await service.sendMessage({
          roomId,
          content,
          type: 'text',
        });

        if (result.success && result.message) {
          setMessages(prev => [...prev, result.message!]);
          setTimeout(() => scrollToBottom(), 100);
        } else if (!result.success) {
          setInputValue(content);
          voiceCommittedInputRef.current = content;
          toast({
            title: language === 'zh' ? 'Failed to send' : 'Failed to send',
            description:
              result.error ||
              (language === 'zh'
                ? '无法发送聊天消息，请检查连接后重试'
                : 'Unable to send message. Please check your connection and try again.'),
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      setInputValue(content);
      voiceCommittedInputRef.current = content;
      console.error('Send message error:', error);
      toast({
        title: language === 'zh' ? 'Failed to send' : 'Failed to send',
        description:
          language === 'zh'
            ? 'Unable to send message. Please try again.'
            : 'Unable to send message. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 处理表情选择
  const handleEmojiSelect = (emoji: string) => {
    setInputValue(prev => prev + emoji);
    inputRef.current?.focus();
  };

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(language === 'zh' ? 'zh-CN' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format room time
  const formatRoomTime = (dateString: string | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString(language === 'zh' ? 'zh-CN' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (diffDays === 1) {
      return language === 'zh' ? 'Yesterday' : 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  // 获取消息预览
  const getMessagePreview = (room: ChatRoomWithUser) => {
    const lastMsg = room.lastMessage;
    if (!lastMsg) return language === 'zh' ? '开始聊天吧' : 'Start chatting';

    switch (lastMsg.type) {
      case 'image': return language === 'zh' ? '[图片]' : '[Image]';
      case 'audio': return language === 'zh' ? '[语音]' : '[Voice]';
      case 'video': return language === 'zh' ? '[视频]' : '[Video]';
      case 'file': return language === 'zh' ? '[文件]' : '[File]';
      case 'location': return language === 'zh' ? '[位置]' : '[Location]';
      default: return lastMsg.content || '';
    }
  };

  // 渲染消息内容
  const startSingleCall = useCallback(
    (callType: 'audio' | 'video') => {
      if (!isCnDeployment) {
        toast({
          title: language === 'zh' ? 'CN only feature' : 'CN only feature',
          description: language === 'zh'
            ? 'Voice/video call is only available in CN deployment.'
            : 'Voice/video call is only available in CN deployment.',
          variant: 'destructive',
        });
        return;
      }

      if (!selectedRoom?.otherUser?.id || !user?.id) return;

      const isTargetOnline = !!selectedRoom.otherUser?.isOnline;
      if (!isTargetOnline) {
        toast({
          title: language === 'zh' ? 'User is offline' : 'User is offline',
          description: language === 'zh'
            ? 'You can only start calls when the user is online.'
            : 'You can only start calls when the user is online.',
        });
        return;
      }

      if (!callKitReady) {
        toast({
          title: language === 'zh' ? 'Call initializing' : 'Call initializing',
          description: callConfigError || (language === 'zh' ? 'Please try again later.' : 'Please try again later.'),
          variant: 'destructive',
        });
        return;
      }

      if (!callKitRef.current) {
        toast({
          title: language === 'zh' ? 'Call component not ready' : 'Call component not ready',
          description: language === 'zh' ? 'Please try again later.' : 'Please try again later.',
          variant: 'destructive',
        });
        return;
      }

      const runtimeStatus = callKitRef.current.getCallStatus?.() ?? callStatus;
      if (runtimeStatus !== 'idle') {
        toast({
          title: language === 'zh' ? 'Call in progress' : 'Call in progress',
          description: language === 'zh' ? 'Current call is not finished yet. Please retry later.' : 'Current call is not finished yet. Please retry later.',
          variant: 'destructive',
        });
        return;
      }

      setCallStatus('calling');

      callKitRef.current.startSingleCall({
        to: selectedRoom.otherUser.id,
        callType,
        msg:
          callType === 'video'
            ? (language === 'zh' ? '邀请你进行视频通话' : 'Invites you to a video call')
            : (language === 'zh' ? '邀请你进行语音通话' : 'Invites you to a voice call'),
      }).then((result) => {
        if (!result) {
          const latestStatus = callKitRef.current?.getCallStatus?.() ?? 'idle';
          setCallStatus(latestStatus);
        }
      }).catch((error: any) => {
        const latestStatus = callKitRef.current?.getCallStatus?.() ?? 'idle';
        setCallStatus(latestStatus);
        toast({
          title: language === 'zh' ? 'Failed to start call' : 'Failed to start call',
          description: error?.message || (language === 'zh' ? 'Please try again later.' : 'Please try again later.'),
          variant: 'destructive',
        });
      });
    },
    [isCnDeployment, selectedRoom, user?.id, callKitReady, callConfigError, toast, language, callStatus]
  );

  const userInfoProvider = useCallback(
    async (userIds: string[]) => {
      return userIds.map((userId) => {
        if (userId === user?.id) {
          const nickname =
            (user as any)?.user_metadata?.display_name ||
            (user as any)?.user_metadata?.full_name ||
            user?.email ||
            userId;
          const avatarUrl = (user as any)?.user_metadata?.avatar_url;
          return { userId, nickname, avatarUrl };
        }

        const roomMatch =
          rooms.find((room) => room.otherUser?.id === userId) ||
          (selectedRoom?.otherUser?.id === userId ? selectedRoom : null);

        if (roomMatch?.otherUser) {
          return {
            userId,
            nickname: roomMatch.otherUser.username || userId,
            avatarUrl: roomMatch.otherUser.avatarUrl,
          };
        }

        return { userId, nickname: userId };
      });
    },
    [rooms, selectedRoom, user]
  );

  const groupInfoProvider = useCallback(async (groupIds: string[]) => {
    return groupIds.map((groupId) => ({
      groupId,
      groupName: groupId,
    }));
  }, []);

  const handleCallStatusChanged = useCallback((status: CallUiStatus) => {
    setCallStatus(status);
  }, []);

  const handleCallError = useCallback((error: any) => {
    const rawMessage = typeof error?.message === 'string' ? error.message : '';
    const normalized = rawMessage.toLowerCase();
    const isCallStateBusy = normalized.includes('is in call') || normalized.includes('already in call');

    toast({
      title: language === 'zh' ? '通话失败' : 'Call failed',
      description: isCallStateBusy
        ? (language === 'zh' ? 'Call state is not idle yet. Please retry in a moment.' : 'Call state is not idle yet. Please retry in a moment.')
        : (rawMessage || (language === 'zh' ? 'Please try again later.' : 'Please try again later.')),
      variant: 'destructive',
    });

    const latestStatus = callKitRef.current?.getCallStatus?.() ?? 'idle';
    setCallStatus(latestStatus);
  }, [language, toast]);

  const handleEndCallWithReason = useCallback((_reason: string) => {
    setCallStatus('idle');
  }, []);

  const renderMessageContent = (message: ChatMessage) => {
    switch (message.type) {
      case 'image':
        const imgUrl = message.metadata?.imageUrl || message.metadata?.thumbnailUrl;
        if (!imgUrl) {
          return <p className="text-sm text-gray-400">[图片加载失败]</p>;
        }
        // Easemob HTTP URLs may require auth and can fail to load directly.
        if (imgUrl.startsWith('http://') && imgUrl.includes('easemob.com')) {
          return <p className="text-sm text-gray-400">[旧图片无法显示]</p>;
        }
        return (
          <div className="max-w-xs cursor-pointer" onClick={() => window.open(imgUrl, '_blank')}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgUrl}
              alt="Image"
              className="rounded-lg max-h-48 object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.innerHTML = '<p class="text-sm text-gray-400">[图片加载失败]</p>';
              }}
            />
          </div>
        );

      case 'audio':
        const isPlaying = playingAudioId === message.id;
        return (
          <div
            className="flex items-center space-x-2 min-w-[120px] cursor-pointer"
            onClick={() => {
              const audioUrl = message.metadata?.audioUrl;
              if (!audioUrl) return;

              let audio = audioElementsRef.current.get(message.id);
              if (!audio) {
                audio = new Audio(audioUrl);
                audio.onended = () => setPlayingAudioId(null);
                audioElementsRef.current.set(message.id, audio);
              }

              if (isPlaying) {
                audio.pause();
                audio.currentTime = 0;
                setPlayingAudioId(null);
              } else {
                audioElementsRef.current.forEach((a, id) => {
                  if (id !== message.id) { a.pause(); a.currentTime = 0; }
                });
                audio.play();
                setPlayingAudioId(message.id);
              }
            }}
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </div>
            <span className="text-xs">{message.metadata?.duration || 0}s</span>
          </div>
        );

      case 'video':
        const videoUrl = resolvedVideoUrls[message.id] || message.metadata?.videoUrl;
        if (!videoUrl || videoLoadFailures[message.id]) {
          return <p className="text-sm text-gray-400">[视频加载失败]</p>;
        }
        return (
          <div className="max-w-xs">
            <video
              src={videoUrl}
              controls
              className="rounded-lg max-h-64 w-full"
              onError={async () => {
                const ok = await refreshVideoUrl(message);
                if (!ok) {
                  setVideoLoadFailures((prev) => ({ ...prev, [message.id]: true }));
                }
              }}
            />
          </div>
        );

      case 'file':
        return (
          <div className="flex items-center space-x-2 p-2 bg-white/10 rounded-lg">
            <FileText className="h-8 w-8" />
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{message.metadata?.fileName || 'File'}</p>
              <p className="text-xs opacity-70">{((message.metadata?.fileSize || 0) / 1024).toFixed(1)} KB</p>
            </div>
          </div>
        );

      default:
        return <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>;
    }
  };

  // 过滤会话
  const filteredRooms = rooms.filter((room: any) =>
    room.otherUser?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort rooms: pinned ones first
  const sortedRooms = [...filteredRooms].sort((a, b) => {
    const aIsPinned = pinnedRoomIds.has(a.id);
    const bIsPinned = pinnedRoomIds.has(b.id);
    if (aIsPinned && !bIsPinned) return -1;
    if (!aIsPinned && bIsPinned) return 1;
    return 0;
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && user?.id) {
      initChatService();
    }
  }, [mounted, user?.id, initChatService]);

  useEffect(() => {
    return () => {
      const updatePromise = chatServiceRef.current?.updatePresence(false);
      updatePromise?.catch(() => undefined);
    };
  }, [user?.id]);

  useEffect(() => {
    const callKit = callKitRef.current;
    return () => {
      callKit?.exitCall?.();
    };
  }, []);

  useEffect(() => {
    setIsRealtimeVoiceInputActive(tencentASRActive);
  }, [tencentASRActive]);

  useEffect(() => {
    if (!selectedRoom && isRealtimeVoiceInputActive) {
      stopRealtimeVoiceInput();
    }
  }, [isRealtimeVoiceInputActive, selectedRoom, stopRealtimeVoiceInput]);

  useEffect(() => {
    if (!user?.id && isRealtimeVoiceInputActive) {
      stopRealtimeVoiceInput();
    }
  }, [isRealtimeVoiceInputActive, stopRealtimeVoiceInput, user?.id]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      stopTencentASR();
    };
  }, [stopTencentASR]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length]);

  const callAppKey = process.env.NEXT_PUBLIC_EASEMOB_APP_KEY;

  const callComingSoonText = '该功能尚未上线，敬请期待。';
  const handleSingleCallIconClick = useCallback(() => {
    toast({
      title: callComingSoonText,
    });
  }, [toast, callComingSoonText]);
  const isCallButtonDisabled = false;
  const voiceCallTitle = callComingSoonText;
  const videoCallTitle = callComingSoonText;

  if (!mounted) return null;

  const profilePanelHeader = (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">
        {language === 'zh' ? '用户资料' : 'User Profile'}
      </h2>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowUserProfile(false)}
      >
        <X className="h-5 w-5" />
      </Button>
    </div>
  );

  const profilePanelBody = selectedRoom ? (
    <div className="p-4">
      {profilePanelHeader}

      {/* 用户头像和基本信息 */}
      <div className="text-center mb-6">
        <Avatar className="w-24 h-24 mx-auto mb-4">
          <AvatarImage src={selectedRoom.otherUser?.avatarUrl} />
          <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-primary/70 text-white">
            {selectedRoom.otherUser?.username?.charAt(0).toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
          {selectedRoom.otherUser?.username || (language === 'zh' ? '未知用户' : 'Unknown')}
        </h2>
        <p className="text-sm text-gray-500">
          {selectedRoom.otherUser?.isOnline
            ? (language === 'zh' ? 'Online' : 'Online')
            : (isCnDeployment ? '离线' : 'Offline')
          }
        </p>
      </div>

      {/* 用户详细信息 */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {language === 'zh' ? '用户ID' : 'User ID'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 break-all">
            {selectedRoom.otherUser?.id || 'N/A'}
          </p>
        </div>

        {selectedRoom.otherUser?.email && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {language === 'zh' ? 'Email' : 'Email'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 break-all">
              {selectedRoom.otherUser.email}
            </p>
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {language === 'zh' ? '会话信息' : 'Chat Info'}
          </h3>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>{language === 'zh' ? '消息数量' : 'Messages'}: {messages.length}</p>
            <p>{language === 'zh' ? '未读消息' : 'Unread'}: {selectedRoom.myUnreadCount || 0}</p>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="h-full min-h-0 flex bg-gray-100 dark:bg-gray-900">
      {/* 左侧会话列表 */}
      <div className={cn(
        "w-full md:w-80 lg:w-96 min-h-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col",
        !showMobileList && "hidden md:flex"
      )}>
        {/* 头部 */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-primary flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            {language === 'zh' ? 'Chats' : 'Chats'}
          </h1>
          {/* 搜索框 */}
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={language === 'zh' ? 'Search' : 'Search'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        {/* 会话列表 */}
        <div className="flex-1 overflow-y-auto">
          {loadingRooms ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center space-x-3">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{language === 'zh' ? '暂无会话' : 'No conversations'}</p>
            </div>
          ) : (
            sortedRooms.map((room: any) => (
              <div
                key={room.id}
                onClick={() => handleSelectRoom(room)}
                className={cn(
                  "flex items-center p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors",
                  selectedRoom?.id === room.id && "bg-primary/10 dark:bg-primary/20"
                )}
              >
                {/* 头像 */}
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={room.otherUser?.avatarUrl} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-white">
                      {room.otherUser?.username?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  {room.otherUser?.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
                  )}
                  {pinnedRoomIds.has(room.id) && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                      <Pin className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                </div>

                {/* 会话信息 */}
                <div className="flex-1 min-w-0 ml-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {room.otherUser?.username || (language === 'zh' ? '未知用户' : 'Unknown')}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {formatRoomTime(room.lastMessage?.createdAt || room.updatedAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate pr-2">
                      {getMessagePreview(room)}
                    </p>
                    {room.myUnreadCount > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-primary rounded-full flex items-center justify-center">
                        {room.myUnreadCount > 99 ? '99+' : room.myUnreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 右侧聊天区域 */}
      <div className={cn(
        "flex-1 min-h-0 flex flex-col bg-gray-50 dark:bg-gray-900",
        showMobileList && "hidden md:flex"
      )}>
        {selectedRoom ? (
          <div className="flex-1 min-h-0 flex">
            {/* 聊天主区域 */}
            <div className="flex-1 min-h-0 flex flex-col">
            {/* 聊天头部 */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 sm:p-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {/* 移动端返回按钮 */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden shrink-0"
                  onClick={() => setShowMobileList(true)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>

                <Avatar className="w-10 h-10 shrink-0">
                  <AvatarImage src={selectedRoom.otherUser?.avatarUrl} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-white">
                    {selectedRoom.otherUser?.username?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-gray-900 dark:text-white truncate">
                    {selectedRoom.otherUser?.username || (language === 'zh' ? '未知用户' : 'Unknown')}
                  </h2>
                  <p className="text-xs text-gray-500 truncate">
                    {selectedRoom.otherUser?.isOnline
                      ? (language === 'zh' ? 'Online' : 'Online')
                      : (isCnDeployment ? '离线' : 'Offline')
                    }
                  </p>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center space-x-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-primary"
                  disabled={isCallButtonDisabled}
                  onClick={handleSingleCallIconClick}
                  title={voiceCallTitle}
                >
                  <Phone className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-primary"
                  disabled={isCallButtonDisabled}
                  onClick={handleSingleCallIconClick}
                  title={videoCallTitle}
                >
                  <Video className="h-5 w-5" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-gray-500 hover:text-primary">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleViewProfile}>
                      <User className="h-4 w-4 mr-2" />
                      {language === 'zh' ? '查看资料' : 'View Profile'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowSearchMessages(!showSearchMessages)}>
                      <SearchIcon className="h-4 w-4 mr-2" />
                      {language === 'zh' ? '搜索消息' : 'Search Messages'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      const roomId = selectedRoom.id;
                      setPinnedRoomIds(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(roomId)) {
                          newSet.delete(roomId);
                        } else {
                          newSet.add(roomId);
                        }
                        return newSet;
                      });
                    }}>
                      <Pin className="h-4 w-4 mr-2" />
                      {pinnedRoomIds.has(selectedRoom.id)
                        ? (language === 'zh' ? 'Unpin' : 'Unpin')
                        : (language === 'zh' ? '置顶会话' : 'Pin Chat')
                      }
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* 消息区域 */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
              {showSearchMessages && (
                <div className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder={language === 'zh' ? '搜索消息...' : 'Search messages...'}
                        value={searchMessageQuery}
                        onChange={(e) => setSearchMessageQuery(e.target.value)}
                        className="w-full pl-9 pr-10 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      {searchMessageQuery && (
                        <button
                          onClick={() => setSearchMessageQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      onClick={() => {
                        setShowSearchMessages(false);
                        setSearchMessageQuery('');
                      }}
                    >
                      {language === 'zh' ? 'Close' : 'Close'}
                    </Button>
                  </div>
                </div>
              )}
              {loadingMessages ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>{language === 'zh' ? '暂无消息，发送第一条消息吧' : 'No messages yet'}</p>
                </div>
              ) : (
                messages.map((message: any) => {
                  const isOwn = message.senderId === user?.id;

                  // 搜索过滤
                  if (searchMessageQuery && !message.content.toLowerCase().includes(searchMessageQuery.toLowerCase())) {
                    return null;
                  }

                  return (
                    <div
                      key={message.id}
                      className={cn("flex", isOwn ? "justify-end" : "justify-start")}
                    >
                      <div className={cn(
                        "flex items-end space-x-2 max-w-[85%] sm:max-w-[75%] lg:max-w-[70%]",
                        isOwn && "flex-row-reverse space-x-reverse"
                      )}>
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={isOwn ? (user as any)?.avatarUrl : selectedRoom.otherUser?.avatarUrl} />
                          <AvatarFallback className="text-xs bg-gray-400 text-white">
                            {isOwn
                              ? ((user as any)?.username?.charAt(0).toUpperCase() || (user as any)?.email?.charAt(0).toUpperCase() || '?')
                              : (selectedRoom.otherUser?.username?.charAt(0).toUpperCase() || '?')
                            }
                          </AvatarFallback>
                        </Avatar>

                        <div className="relative">
                          <div
                            className={cn(
                              "rounded-2xl px-4 py-2 shadow-sm",
                              isOwn
                                ? "bg-primary text-white rounded-br-md"
                                : "bg-white dark:bg-gray-800 rounded-bl-md"
                            )}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setShowMenu(showMenu === message.id ? null : message.id);
                            }}
                          >
                            {renderMessageContent(message)}
                            <p className={cn(
                              "text-xs mt-1",
                              isOwn ? "text-white/70" : "text-gray-400"
                            )}>
                              {formatTime(message.createdAt)}
                            </p>
                          </div>

                          {showMenu === message.id && !isOwn && message.type === 'text' && message.content && (
                            <div className="absolute left-0 top-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-20 overflow-hidden min-w-[120px]">
                              <button
                                onClick={() => {
                                  setAiAssistantMessage({ id: message.id, content: message.content });
                                  setShowMenu(null);
                                }}
                                className="flex items-center w-full px-4 py-2.5 text-sm text-left text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                              >
                                <Bot className="h-4 w-4 mr-2" />
                                {language === 'zh' ? 'AI Assistant' : 'AI Assistant'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {aiAssistantMessage && (
              <div className="fixed bottom-24 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
                <AIAssistant
                  message={aiAssistantMessage.content}
                  targetUserName={selectedRoom.otherUser?.username}
                  chatHistory={messages.slice(-10).map((m: any) => ({
                    content: m.content,
                    isOwn: m.senderId === user?.id,
                  }))}
                  language={language as 'zh' | 'en'}
                  onClose={() => setAiAssistantMessage(null)}
                />
              </div>
            )}

            {/* 输入区域 */}
            <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3 sm:p-4">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length === 0 || !selectedRoom || !user?.id) return;

                  const caption = inputValue.trim();
                  if (caption) setInputValue("");

                  try {
                    setIsSending(true);
                    const roomId = selectedRoom.otherUser?.id || selectedRoom.id;
                    const service = chatServiceRef.current;

                    for (const file of files) {
                      const formData = new FormData();
                      formData.append('image', file);
                      formData.append('chatId', roomId);

                      const response = await fetch('/api/chat/upload-image', {
                        method: "POST",
                        body: formData,
                      });

                      const result = await response.json();
                      if (!result.success) {
                        console.error('Image upload failed:', result.error);
                        continue;
                      }

                      if (service) {
                        const sendResult = await service.sendMessage({
                          roomId,
                          content: "[??]",
                          type: "image",
                          metadata: { imageUrl: result.image_url, thumbnailUrl: result.image_url },
                        });
                        if (sendResult.success && sendResult.message) {
                          setMessages(prev => [...prev, sendResult.message!]);
                          setTimeout(() => scrollToBottom(), 100);
                        }
                      }
                    }

                    if (caption && service) {
                      const sendResult = await service.sendMessage({
                        roomId,
                        content: caption,
                        type: "text",
                      });
                      if (sendResult.success && sendResult.message) {
                        setMessages(prev => [...prev, sendResult.message!]);
                        setTimeout(() => scrollToBottom(), 100);
                      }
                    }
                  } catch (error) {
                    console.error('Image upload error:', error);
                  } finally {
                    setIsSending(false);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }
                }}
              />

              <input
                type="file"
                ref={videoInputRef}
                accept="video/*"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length === 0 || !selectedRoom || !user?.id) return;

                  const caption = inputValue.trim();
                  if (caption) setInputValue("");

                  try {
                    setIsSending(true);
                    const roomId = selectedRoom.otherUser?.id || selectedRoom.id;
                    const service = chatServiceRef.current;

                    for (const file of files) {
                      const formData = new FormData();
                      formData.append('video', file);
                      formData.append('chatId', roomId);
                      formData.append('duration', '0');

                      const response = await fetch('/api/chat/upload-video', {
                        method: "POST",
                        body: formData,
                      });

                      const result = await response.json();
                      if (!result.success) {
                        console.error('Video upload failed:', result.error);
                        continue;
                      }

                      if (service) {
                        const sendResult = await service.sendMessage({
                          roomId,
                          content: "[??]",
                          type: "video",
                          metadata: {
                            videoUrl: result.video_url,
                            cloudbaseFileId: result.file_id,
                            cloudbasePath: result.file_path,
                          },
                        });
                        if (sendResult.success && sendResult.message) {
                          setMessages(prev => [...prev, sendResult.message!]);
                          setTimeout(() => scrollToBottom(), 100);
                        }
                      }
                    }

                    if (caption && service) {
                      const sendResult = await service.sendMessage({
                        roomId,
                        content: caption,
                        type: "text",
                      });
                      if (sendResult.success && sendResult.message) {
                        setMessages(prev => [...prev, sendResult.message!]);
                        setTimeout(() => scrollToBottom(), 100);
                      }
                    }
                  } catch (error) {
                    console.error('Video upload error:', error);
                  } finally {
                    setIsSending(false);
                    if (videoInputRef.current) videoInputRef.current.value = "";
                  }
                }}
              />

              {isRecording ? (
                <div className="flex items-center justify-between bg-primary/10 rounded-xl p-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-primary font-medium">{recordingDuration}s</span>
                    <span className="text-gray-500 text-sm">
                      {language === 'zh' ? '正在录音...' : 'Recording...'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        mediaRecorderRef.current?.stop();
                        audioChunksRef.current = [];
                        setIsRecording(false);
                        setRecordingDuration(0);
                        if (recordingTimerRef.current) {
                          clearInterval(recordingTimerRef.current);
                          recordingTimerRef.current = null;
                        }
                      }}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        mediaRecorderRef.current?.stop();
                        setIsRecording(false);
                        if (recordingTimerRef.current) {
                          clearInterval(recordingTimerRef.current);
                          recordingTimerRef.current = null;
                        }
                      }}
                      className="bg-primary text-white"
                    >
                      <Square className="h-4 w-4 mr-1" />
                      {language === 'zh' ? 'Send' : 'Send'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-end gap-2">
                    <div className="flex-1 min-w-0">
                      <textarea
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        readOnly={isRealtimeVoiceInputActive}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        placeholder={language === "zh" ? "输入消息..." : "Type a message..."}
                        rows={1}
                        className={cn(
                          "w-full min-w-0 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/50",
                          isRealtimeVoiceInputActive && "opacity-90"
                        )}
                        style={{ maxHeight: "100px" }}
                      />
                    </div>
                    <Button
                      onClick={handleSend}
                      disabled={isSending || !inputValue.trim()}
                      size="sm"
                      className="bg-primary text-white shrink-0"
                    >
                      {isSending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                
                  <div className="hidden sm:flex items-center justify-between gap-2">
                    <Button
                      variant={isRealtimeVoiceInputActive ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        if (isRealtimeVoiceInputActive) {
                          stopRealtimeVoiceInput();
                        } else {
                          startRealtimeVoiceInput();
                        }
                      }}
                      disabled={isRecording}
                      className={cn(
                        "h-8 px-3 text-xs",
                        isRealtimeVoiceInputActive
                          ? "bg-primary text-white hover:bg-primary/90"
                          : "text-gray-600 hover:text-primary"
                      )}
                    >
                      {isRealtimeVoiceInputActive ? (
                        <Square className="h-3.5 w-3.5 mr-1.5" />
                      ) : (
                        <FileText className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      {isCnDeployment ? "实时语音转文字" : "Realtime Speech to Text"}
                    </Button>

                    <div className="min-w-0 text-right">
                      <p className={cn(
                        "text-xs truncate",
                        isRealtimeVoiceInputActive ? "text-primary" : "text-gray-500"
                      )}>
                        {isRealtimeVoiceInputActive
                          ? "Listening..."
                          : (isCnDeployment ? "发送前将语音转换为文字" : "Convert speech to text before sending")}
                      </p>
                      {isRealtimeVoiceInputActive && interimVoiceText && (
                        <p className="text-[11px] text-gray-500 truncate">{interimVoiceText}</p>
                      )}
                    </div>
                  </div>

                  {isRealtimeVoiceInputActive && (
                    <div className="sm:hidden px-1 text-xs text-primary truncate">
                      {interimVoiceText ? interimVoiceText : "Listening..."}
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-2 w-full">
                    <div className="flex justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-gray-500 hover:text-primary"
                      >
                        <ImageIcon className="h-5 w-5" />
                      </Button>
                    </div>

                    <div className="flex justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => videoInputRef.current?.click()}
                        className="text-gray-500 hover:text-primary"
                      >
                        <Video className="h-5 w-5" />
                      </Button>
                    </div>

                    <div className="flex justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className={cn(
                          "text-gray-500 hover:text-primary",
                          showEmojiPicker && "text-primary bg-primary/10"
                        )}
                      >
                        <Smile className="h-5 w-5" />
                      </Button>
                    </div>

                    <div className="hidden sm:flex justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "text-primary",
                          isRealtimeVoiceInputActive && "text-gray-300"
                        )}
                        disabled={isRealtimeVoiceInputActive}
                        title={
                          isRealtimeVoiceInputActive
                            ? (language === "zh" ? "Stop realtime speech-to-text first" : "Stop realtime speech-to-text first")
                            : (language === "zh" ? "Send voice message" : "Send voice message")
                        }
                        onClick={() => {
                          void startVoiceMessageRecording();
                        }}
                      >
                        <Mic className="h-5 w-5" />
                      </Button>
                    </div>

                    <div className="sm:hidden flex justify-center">
                      {isRealtimeVoiceInputActive ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary bg-primary/10"
                          onClick={stopRealtimeVoiceInput}
                          title="Stop realtime speech-to-text"
                        >
                          <Square className="h-5 w-5" />
                        </Button>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary"
                              title="Voice options"
                            >
                              <Mic className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="center" side="top" className="w-44">
                            <DropdownMenuItem
                              onClick={() => {
                                void startVoiceMessageRecording();
                              }}
                            >
                              <Mic className="h-4 w-4 mr-2" />
                              {language === "zh" ? "Voice message" : "Voice message"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={startRealtimeVoiceInput}>
                              <FileText className="h-4 w-4 mr-2" />
                              {language === "zh" ? "Realtime transcription" : "Realtime transcription"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                  <EmojiPicker
                    isOpen={showEmojiPicker}
                    onClose={() => setShowEmojiPicker(false)}
                    onSelect={handleEmojiSelect}
                    language={language as "zh" | "en"}
                    placement="inline"
                  />
                </div>
              )}
            </div>
            </div>

            {/* 用户资料侧边栏 */}
            {showUserProfile && selectedRoom && (
              <>
                <div
                  className="md:hidden fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                  onClick={() => setShowUserProfile(false)}
                >
                  <div
                    className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-lg"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {profilePanelBody}
                  </div>
                </div>
                <div className="hidden md:block w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
                  {profilePanelBody}
                </div>
              </>
            )}
          </div>
        ) : (
          /* 未选择会话时的占位 */
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">{language === 'zh' ? 'Select a conversation to start' : 'Select a conversation to start'}</p>
            </div>
          </div>
        )}
      </div>

      {isCnDeployment && user?.id && callAppKey && (
        <EasemobCallKit
          appKey={callAppKey}
          language={language === 'zh' ? 'zh' : 'en'}
          userId={user.id}
          callKitRef={callKitRef}
          userInfoProvider={userInfoProvider}
          groupInfoProvider={groupInfoProvider}
          onCallStatusChanged={handleCallStatusChanged}
          onEndCallWithReason={handleEndCallWithReason}
          onCallError={handleCallError}
          onReady={setCallKitReady}
        />
      )}
    </div>
  );
}

