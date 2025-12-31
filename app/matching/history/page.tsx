'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { 
  Heart, 
  MessageSquare, 
  Calendar, 
  MapPin, 
  ArrowLeft,
  Filter,
  Search
} from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';

interface MatchHistory {
  id: string;
  matched_user: {
    id: string;
    full_name: string;
    avatar_url?: string;
    age: number;
    location: string;
  };
  matched_at: string;
  compatibility_score: number;
  status: 'active' | 'inactive' | 'blocked';
  last_interaction?: string;
  total_messages: number;
}

export default function MatchingHistoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [matches, setMatches] = useState<MatchHistory[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<MatchHistory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    loadMatchHistory();
  }, [user]);

  useEffect(() => {
    filterMatches();
  }, [matches, searchQuery, selectedFilter]);

  const loadMatchHistory = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/user/matches');
      if (response.ok) {
        const data = await response.json();
        setMatches(data.matches);
      }
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法加载匹配历史',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterMatches = () => {
    let filtered = matches;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(match =>
        match.matched_user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        match.matched_user.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    switch (selectedFilter) {
      case 'active':
        filtered = filtered.filter(match => match.status === 'active');
        break;
      case 'inactive':
        filtered = filtered.filter(match => match.status === 'inactive');
        break;
      default:
        break;
    }

    setFilteredMatches(filtered);
  };

  const handleChatClick = (matchId: string) => {
    router.push(`/chat/${matchId}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">活跃</Badge>;
      case 'inactive':
        return <Badge variant="secondary">不活跃</Badge>;
      case 'blocked':
        return <Badge variant="destructive">已屏蔽</Badge>;
      default:
        return <Badge variant="outline">未知</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">加载匹配历史中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              匹配历史
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              查看您的所有匹配记录
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回仪表盘
            </Button>
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="搜索匹配..."
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
              全部 ({matches.length})
            </Button>
            <Button
              variant={selectedFilter === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedFilter('active')}
            >
              活跃 ({matches.filter(m => m.status === 'active').length})
            </Button>
            <Button
              variant={selectedFilter === 'inactive' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedFilter('inactive')}
            >
              不活跃 ({matches.filter(m => m.status === 'inactive').length})
            </Button>
          </div>
        </div>

        {/* Match History List */}
        <div className="grid gap-4">
          {filteredMatches.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  暂无匹配记录
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {searchQuery || selectedFilter !== 'all' 
                    ? '没有找到符合条件的匹配' 
                    : '开始匹配来发现新的朋友吧！'
                  }
                </p>
                {!searchQuery && selectedFilter === 'all' && (
                  <Button onClick={() => router.push('/matching')}>
                    开始匹配
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredMatches.map((match) => (
              <Card key={match.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={match.matched_user.avatar_url} />
                        <AvatarFallback>
                          {match.matched_user.full_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {match.matched_user.full_name}
                          </h3>
                          {getStatusBadge(match.status)}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {match.matched_user.age}岁
                          </div>
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {match.matched_user.location}
                          </div>
                          <div className="flex items-center">
                            <Heart className="h-4 w-4 mr-1" />
                            {match.compatibility_score}% 匹配度
                          </div>
                        </div>
                        
                        <div className="mt-2 text-sm text-gray-500">
                          匹配于 {formatDate(match.matched_at)}
                          {match.last_interaction && (
                            <span className="ml-4">
                              最后互动: {formatDate(match.last_interaction)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          共 {match.total_messages} 条消息
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => handleChatClick(match.id)}
                        disabled={match.status === 'blocked'}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        聊天
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 