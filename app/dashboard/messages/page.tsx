'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';
import { useLanguage } from '@/components/language-provider';
import { useRealtimeRooms } from '@/hooks/useRealtimeRooms';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MessageSquare,
  Search,
  Heart,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

/**
 * 聊天列表页面 - INTL 环境
 * 使用 Supabase Realtime 实现实时更新
 */
export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { language } = useLanguage();

  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 使用 Realtime Hook 获取聊天室列表
  const { rooms, loading, error, refresh, totalUnreadCount } = useRealtimeRooms();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (authLoading || !mounted) return;
    if (!user || !user.id) {
      router.push('/auth/login');
    }
  }, [user, authLoading, mounted, router]);

  // 过滤聊天室
  const filteredRooms = rooms.filter(room =>
    room.other_user_username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 格式化时间
  const formatTime = (dateString: string | null) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString(language === 'zh' ? 'zh-CN' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (diffDays === 1) {
      return language === 'zh' ? '昨天' : 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
        weekday: 'short'
      });
    } else {
      return date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  // 获取消息类型图标/文本
  const getMessagePreview = (content: string | null, type: string) => {
    if (!content) {
      switch (type) {
        case 'image': return language === 'zh' ? '[图片]' : '[Image]';
        case 'audio': return language === 'zh' ? '[语音]' : '[Voice]';
        case 'video': return language === 'zh' ? '[视频]' : '[Video]';
        case 'location': return language === 'zh' ? '[位置]' : '[Location]';
        case 'sticker': return language === 'zh' ? '[表情]' : '[Sticker]';
        default: return '';
      }
    }
    return content;
  };

  // 防止水合不匹配
  if (!mounted) {
    return <div suppressHydrationWarning />;
  }

  if (loading || authLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 头部骨架 */}
        <div className="mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full mt-4" />
          </div>
        </div>
        {/* 列表骨架 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-4">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* 页面头部 */}
      <div className="mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                <MessageSquare className="h-6 w-6 mr-2 text-blue-600" />
                {language === 'zh' ? '消息' : 'Messages'}
                {totalUnreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                  </Badge>
                )}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {rooms.length > 0
                  ? `${rooms.length} ${language === 'zh' ? '个对话' : 'conversations'}`
                  : language === 'zh' ? '暂无对话' : 'No conversations'
                }
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={refresh}
              className="text-gray-500"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* 搜索框 */}
          {rooms.length > 0 && (
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={language === 'zh' ? '搜索对话...' : 'Search conversations...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">
            {language === 'zh' ? '加载失败，请重试' : 'Failed to load, please retry'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            className="mt-2"
          >
            {language === 'zh' ? '重试' : 'Retry'}
          </Button>
        </div>
      )}

      {/* 聊天列表 */}
      {rooms.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
            <MessageSquare className="h-10 w-10 text-blue-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {language === 'zh' ? '暂无对话' : 'No conversations'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {language === 'zh' ? '匹配成功后即可开始聊天' : 'Start chatting after matching'}
          </p>
          <Button
            onClick={() => router.push('/matching')}
            className="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Heart className="h-5 w-5 mr-2" />
            {language === 'zh' ? '开始匹配' : 'Start Matching'}
          </Button>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
          <Search className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {language === 'zh' ? '未找到匹配的对话' : 'No conversations found'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {language === 'zh' ? '尝试其他搜索词' : 'Try a different search term'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredRooms.map((room) => (
              <div
                key={room.id}
                onClick={() => router.push(`/dashboard/messages/${room.id}`)}
                className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    {/* 头像 */}
                    <div className="relative flex-shrink-0">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={room.other_user_avatar_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                          {room.other_user_username?.charAt(0).toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      {/* 在线状态指示器 */}
                      {room.other_user_last_active &&
                       new Date().getTime() - new Date(room.other_user_last_active).getTime() < 5 * 60 * 1000 && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
                      )}
                    </div>

                    {/* 聊天信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {room.other_user_username || (language === 'zh' ? '未知用户' : 'Unknown User')}
                        </h3>
                        {room.last_message_at && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                            {formatTime(room.last_message_at)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        {room.last_message_content || room.last_message_type !== 'text' ? (
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate pr-2">
                            {getMessagePreview(room.last_message_content, room.last_message_type)}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                            {language === 'zh' ? '开始聊天吧' : 'Start chatting'}
                          </p>
                        )}
                        {room.unread_count > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-blue-600 rounded-full flex-shrink-0">
                            {room.unread_count > 99 ? '99+' : room.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 箭头 */}
                  <ChevronRight className="h-5 w-5 text-gray-400 ml-2 flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 快速统计 */}
      {rooms.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {language === 'zh' ? '总对话' : 'Total Chats'}
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{rooms.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <MessageSquare className="h-5 w-5 text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {language === 'zh' ? '未读消息' : 'Unread'}
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {totalUnreadCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
