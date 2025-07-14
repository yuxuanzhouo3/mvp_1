'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Plus, 
  MessageSquare, 
  Heart,
  Filter,
  MoreVertical,
  Phone,
  Video
} from 'lucide-react';

interface ChatPreview {
  id: string;
  matched_user: {
    id: string;
    full_name: string;
    avatar_url?: string;
    is_online: boolean;
    last_seen?: string;
  };
  last_message: {
    content: string;
    sender_id: string;
    created_at: string;
    message_type: 'text' | 'image' | 'file';
  };
  unread_count: number;
  compatibility_score: number;
  matched_at: string;
}

export default function ChatListPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [filteredChats, setFilteredChats] = useState<ChatPreview[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'unread' | 'online'>('all');

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    loadChats();
  }, [user]);

  useEffect(() => {
    filterChats();
  }, [chats, searchQuery, selectedFilter]);

  const loadChats = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/chat/list');
      if (response.ok) {
        const data = await response.json();
        setChats(data.chats);
      }
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法加载聊天列表',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterChats = () => {
    let filtered = chats;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(chat =>
        chat.matched_user.full_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    switch (selectedFilter) {
      case 'unread':
        filtered = filtered.filter(chat => chat.unread_count > 0);
        break;
      case 'online':
        filtered = filtered.filter(chat => chat.matched_user.is_online);
        break;
      default:
        break;
    }

    setFilteredChats(filtered);
  };

  const handleChatClick = (chatId: string) => {
    router.push(`/chat/${chatId}`);
  };

  const handleStartMatching = () => {
    router.push('/matching');
  };

  const formatLastMessage = (message: ChatPreview['last_message']) => {
    if (message.message_type === 'image') {
      return '📷 图片';
    }
    if (message.message_type === 'file') {
      return '📎 文件';
    }
    return message.content.length > 30 
      ? message.content.substring(0, 30) + '...' 
      : message.content;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return '刚刚';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}小时前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">加载聊天列表中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              聊天
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              与您的匹配对象保持联系
            </p>
          </div>
          <Button onClick={handleStartMatching}>
            <Plus className="h-4 w-4 mr-2" />
            开始匹配
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="搜索聊天..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant={selectedFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedFilter('all')}
            >
              全部
            </Button>
            <Button
              variant={selectedFilter === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedFilter('unread')}
            >
              未读
            </Button>
            <Button
              variant={selectedFilter === 'online' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedFilter('online')}
            >
              在线
            </Button>
          </div>
        </div>

        {/* Chat List */}
        {filteredChats.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {searchQuery ? '没有找到匹配的聊天' : '还没有聊天'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {searchQuery 
                  ? '尝试调整搜索条件' 
                  : '开始匹配来找到新的朋友并开始聊天'
                }
              </p>
              {!searchQuery && (
                <Button onClick={handleStartMatching}>
                  <Heart className="h-4 w-4 mr-2" />
                  开始匹配
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredChats.map((chat) => (
              <Card 
                key={chat.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleChatClick(chat.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    {/* Avatar */}
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={chat.matched_user.avatar_url} />
                        <AvatarFallback>
                          {chat.matched_user.full_name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 ${
                        chat.matched_user.is_online ? 'bg-green-500' : 'bg-gray-400'
                      }`}></div>
                    </div>

                    {/* Chat Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">
                          {chat.matched_user.full_name}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="text-xs">
                            {Math.round(chat.compatibility_score * 100)}% 匹配
                          </Badge>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTime(chat.last_message.created_at)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {formatLastMessage(chat.last_message)}
                        </p>
                        {chat.unread_count > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {chat.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-1">
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Stats */}
        {chats.length > 0 && (
          <div className="mt-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                  <span>总计 {chats.length} 个聊天</span>
                  <span>
                    {chats.filter(chat => chat.unread_count > 0).length} 个未读
                  </span>
                  <span>
                    {chats.filter(chat => chat.matched_user.is_online).length} 个在线
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
} 