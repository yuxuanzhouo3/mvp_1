'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { 
  Heart, 
  X, 
  Star, 
  MapPin, 
  Calendar, 
  Users, 
  Filter,
  RefreshCw,
  MessageSquare,
  User
} from 'lucide-react';

interface MatchCandidate {
  id: string;
  full_name: string;
  avatar_url?: string;
  age: number;
  location: string;
  bio: string;
  interests: string[];
  industry: string;
  communication_style: string;
  compatibility_score: number;
  common_interests: string[];
  match_reasons: string[];
}

export default function MatchingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    minAge: 18,
    maxAge: 65,
    location: '',
    interests: [] as string[],
  });

  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    loadCandidates();
  }, [user]);

  const loadCandidates = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/matching/candidates');
      if (response.ok) {
        const data = await response.json();
        setCandidates(data.candidates);
      }
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法加载匹配候选人',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async () => {
    if (isProcessing || currentIndex >= candidates.length) return;
    
    setIsProcessing(true);
    const candidate = candidates[currentIndex];
    
    try {
      const response = await fetch('/api/matching/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: candidate.id }),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.isMatch) {
          toast({
            title: '🎉 匹配成功！',
            description: `您与 ${candidate.full_name} 互相喜欢！`,
          });
          
          // Show match modal or redirect to chat
          setTimeout(() => {
            router.push(`/chat/${data.chatId}`);
          }, 2000);
        } else {
          toast({
            title: '已喜欢',
            description: `您喜欢了 ${candidate.full_name}`,
          });
        }
      }
    } catch (error) {
      toast({
        title: '操作失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePass = async () => {
    if (isProcessing || currentIndex >= candidates.length) return;
    
    setIsProcessing(true);
    const candidate = candidates[currentIndex];
    
    try {
      await fetch('/api/matching/pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: candidate.id }),
      });

      toast({
        title: '已跳过',
        description: `您跳过了 ${candidate.full_name}`,
      });
    } catch (error) {
      toast({
        title: '操作失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleSuperLike = async () => {
    if (isProcessing || currentIndex >= candidates.length) return;
    
    setIsProcessing(true);
    const candidate = candidates[currentIndex];
    
    try {
      const response = await fetch('/api/matching/super-like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: candidate.id }),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.isMatch) {
          toast({
            title: '🌟 超级匹配！',
            description: `您与 ${candidate.full_name} 超级匹配！`,
          });
          
          setTimeout(() => {
            router.push(`/chat/${data.chatId}`);
          }, 2000);
        } else {
          toast({
            title: '超级喜欢已发送',
            description: `您超级喜欢了 ${candidate.full_name}`,
          });
        }
      }
    } catch (error) {
      toast({
        title: '操作失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleRefresh = () => {
    setCurrentIndex(0);
    loadCandidates();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">正在寻找匹配...</p>
        </div>
      </div>
    );
  }

  if (candidates.length === 0 || currentIndex >= candidates.length) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-12">
            <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              暂时没有更多推荐
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              我们已经为您展示了所有可用的匹配。请稍后再来查看新的推荐！
            </p>
            <div className="space-y-3">
              <Button onClick={handleRefresh} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                刷新推荐
              </Button>
              <Button variant="outline" onClick={() => router.push('/dashboard')} className="w-full">
                返回仪表盘
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentCandidate = candidates[currentIndex];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              发现
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              找到您的理想匹配
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">筛选条件</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">年龄范围</label>
                <div className="flex items-center space-x-2 mt-1">
                  <input
                    type="number"
                    value={filters.minAge}
                    onChange={(e) => setFilters(prev => ({ ...prev, minAge: parseInt(e.target.value) }))}
                    className="w-20 px-2 py-1 border rounded text-sm"
                    min="18"
                    max="100"
                  />
                  <span>至</span>
                  <input
                    type="number"
                    value={filters.maxAge}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxAge: parseInt(e.target.value) }))}
                    className="w-20 px-2 py-1 border rounded text-sm"
                    min="18"
                    max="100"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">位置</label>
                <input
                  type="text"
                  value={filters.location}
                  onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="输入城市名称"
                  className="w-full px-3 py-2 border rounded mt-1"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Match Card */}
        <Card 
          ref={cardRef}
          className="relative overflow-hidden cursor-pointer transition-transform hover:scale-105"
        >
          <div className="relative">
            {/* Profile Image */}
            <div className="aspect-square bg-gradient-to-br from-blue-400 to-purple-600 relative">
              {currentCandidate.avatar_url ? (
                <img
                  src={currentCandidate.avatar_url}
                  alt={currentCandidate.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Avatar className="h-32 w-32">
                    <AvatarFallback className="text-4xl">
                      {currentCandidate.full_name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
              
              {/* Compatibility Score */}
              <div className="absolute top-4 right-4">
                <Badge className="bg-white/90 text-gray-900">
                  {Math.round(currentCandidate.compatibility_score * 100)}% 匹配
                </Badge>
              </div>
            </div>

            {/* Profile Info */}
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {currentCandidate.full_name}, {currentCandidate.age}
                  </h2>
                  <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                    <MapPin className="h-4 w-4" />
                    <span>{currentCandidate.location}</span>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                {currentCandidate.bio}
              </p>

              {/* Interests */}
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  兴趣爱好
                </h3>
                <div className="flex flex-wrap gap-2">
                  {currentCandidate.interests.slice(0, 5).map((interest, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {interest}
                    </Badge>
                  ))}
                  {currentCandidate.interests.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{currentCandidate.interests.length - 5}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Common Interests */}
              {currentCandidate.common_interests.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-green-600 mb-2">
                    共同兴趣
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {currentCandidate.common_interests.map((interest, index) => (
                      <Badge key={index} className="bg-green-100 text-green-800 text-xs">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Match Reasons */}
              {currentCandidate.match_reasons.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-blue-600 mb-2">
                    匹配理由
                  </h3>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    {currentCandidate.match_reasons.map((reason, index) => (
                      <li key={index} className="flex items-center">
                        <Star className="h-3 w-3 text-blue-500 mr-2" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center items-center space-x-4 mt-6">
          <Button
            variant="outline"
            size="lg"
            onClick={handlePass}
            disabled={isProcessing}
            className="w-16 h-16 rounded-full border-2 border-gray-300 hover:border-red-500 hover:bg-red-50"
          >
            <X className="h-8 w-8 text-gray-600" />
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={handleSuperLike}
            disabled={isProcessing}
            className="w-16 h-16 rounded-full border-2 border-purple-300 hover:border-purple-500 hover:bg-purple-50"
          >
            <Star className="h-8 w-8 text-purple-600" />
          </Button>

          <Button
            size="lg"
            onClick={handleLike}
            disabled={isProcessing}
            className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600"
          >
            <Heart className="h-8 w-8 text-white" />
          </Button>
        </div>

        {/* Progress */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {currentIndex + 1} / {candidates.length}
          </p>
        </div>
      </div>
    </div>
  );
} 