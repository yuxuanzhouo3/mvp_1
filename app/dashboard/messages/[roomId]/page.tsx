'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';
import { useLanguage } from '@/components/language-provider';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { useRealtimeTyping } from '@/hooks/useRealtimeTyping';
import { chatClient, Message, MessageType } from '@/lib/realtime/chat-client';
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
  Search,
  Paperclip,
  X,
  RotateCcw,
} from 'lucide-react';

interface ChatUser {
  id: string;
  username: string;
  avatar_url: string | null;
  gender: string | null;
  last_active_at: string | null;
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
  const roomId = params.roomId as string;

  const [mounted, setMounted] = useState(false);
  const [chatUser, setChatUser] = useState<ChatUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showMenu, setShowMenu] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

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

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(language === 'zh' ? 'zh-CN' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 格式化日期分组
  const formatDateGroup = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return language === 'zh' ? '今天' : 'Today';
    } else if (diffDays === 1) {
      return language === 'zh' ? '昨天' : 'Yesterday';
    } else {
      return date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
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
        return imageUrl ? (
          <img
            src={imageUrl}
            alt="Image"
            className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(imageUrl, '_blank')}
          />
        ) : null;
      
      case 'audio':
        return (
          <div className="flex items-center space-x-2">
            <div className="w-32 h-8 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center">
              <span className="text-sm">🎵 {language === 'zh' ? '语音消息' : 'Voice'}</span>
            </div>
          </div>
        );
      
      case 'video':
        return (
          <div className="flex items-center space-x-2">
            <div className="w-32 h-20 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center">
              <span className="text-sm">🎬 {language === 'zh' ? '视频' : 'Video'}</span>
            </div>
          </div>
        );
      
      case 'location':
        return (
          <div className="flex items-center space-x-2">
            <div className="w-32 h-20 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center">
              <span className="text-sm">📍 {language === 'zh' ? '位置' : 'Location'}</span>
            </div>
          </div>
        );
      
      default:
        return <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>;
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && user?.id && roomId) {
      loadChatUser();
    }
  }, [mounted, user?.id, roomId, loadChatUser]);

  // 新消息自动滚动
  useEffect(() => {
    if (messages.length > 0 && !loadingMessages) {
      scrollToBottom();
    }
  }, [messages.length, loadingMessages, scrollToBottom]);

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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        {/* 头部骨架 */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* 聊天头部 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/messages')}
              className="lg:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <Avatar className="w-10 h-10">
              <AvatarImage src={chatUser?.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                {chatUser?.username?.charAt(0).toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>

            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                {chatUser?.username || (language === 'zh' ? '未知用户' : 'Unknown')}
              </h2>
              <div className="flex items-center space-x-2">
                {chatUser?.last_active_at && 
                 new Date().getTime() - new Date(chatUser.last_active_at).getTime() < 5 * 60 * 1000 ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
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

          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Video className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 消息区域 */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        onScroll={handleScroll}
      >
        {/* 加载更多提示 */}
        {hasMore && (
          <div className="text-center py-2">
            <Button variant="ghost" size="sm" onClick={loadMore}>
              {language === 'zh' ? '加载更多' : 'Load more'}
            </Button>
          </div>
        )}

        {/* 消息列表 */}
        {groupMessagesByDate(messages).map((group, groupIndex) => (
          <div key={groupIndex}>
            {/* 日期分隔线 */}
            <div className="flex items-center justify-center my-4">
              <span className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 rounded-full">
                {formatDateGroup(group.date)}
              </span>
            </div>

            {/* 消息列表 */}
            {group.messages.map((message) => {
              const isOwn = message.sender_id === user?.id;
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}
                >
                  <div className={`flex items-end space-x-2 max-w-xs lg:max-w-md ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    {!isOwn && (
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={chatUser?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {chatUser?.username?.charAt(0).toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div className="relative group">
                      {/* 回复引用 */}
                      {message.reply_to_message_id && (
                        <div className={`text-xs mb-1 p-2 rounded ${isOwn ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-gray-100 dark:bg-gray-700'}`}>
                          <span className="text-gray-500 dark:text-gray-400">
                            {language === 'zh' ? '回复: ' : 'Reply: '}
                          </span>
                          <span className="truncate">
                            {messages.find(m => m.id === message.reply_to_message_id)?.content?.slice(0, 20) || '...'}
                          </span>
                        </div>
                      )}

                      {/* 消息气泡 */}
                      <div
                        className={`rounded-lg px-4 py-2 ${
                          isOwn
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                        }`}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setShowMenu(showMenu === message.id ? null : message.id);
                        }}
                      >
                        {renderMessageContent(message)}
                        
                        <div className={`text-xs mt-1 ${
                          isOwn ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {formatTime(message.sent_at)}
                          {isOwn && !message.deleted_at && (
                            <span className="ml-2">
                              {message.is_read ? '✓✓' : '✓'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 消息菜单 */}
                      {showMenu === message.id && !message.deleted_at && (
                        <div className={`absolute ${isOwn ? 'right-0' : 'left-0'} top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20`}>
                          <button
                            onClick={() => handleReply(message)}
                            className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            {language === 'zh' ? '回复' : 'Reply'}
                          </button>
                          {canRecall(message) && (
                            <button
                              onClick={() => handleRecall(message.id)}
                              className="block w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
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
          <div className="flex justify-start mb-3">
            <div className="flex items-end space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={chatUser?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {chatUser?.username?.charAt(0).toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 回复预览 */}
      {replyTo && (
        <div className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between">
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
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-end space-x-2">
          <Button variant="ghost" size="sm">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <ImageIcon className="h-4 w-4" />
          </Button>

          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={language === 'zh' ? '输入消息...' : 'Type a message...'}
              rows={1}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              style={{ maxHeight: '120px' }}
            />
          </div>

          <Button variant="ghost" size="sm">
            <Smile className="h-4 w-4" />
          </Button>

          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isSending}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

