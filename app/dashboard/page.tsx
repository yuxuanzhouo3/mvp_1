'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  CreditCard, 
  MessageSquare, 
  Heart, 
  Settings, 
  Plus,
  TrendingUp,
  Users,
  Calendar,
  MapPin
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  credits: number;
  bio?: string;
  location?: string;
  interests: string[];
  created_at: string;
}

interface RecentMatch {
  id: string;
  matched_user: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  compatibility_score: number;
  matched_at: string;
}

interface DashboardStats {
  totalMatches: number;
  totalMessages: number;
  activeChats: number;
  profileCompletion: number;
}

export default function DashboardPage() {
  const { user, signOut, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [authSettled, setAuthSettled] = useState(false);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading dashboard data for user:', user?.id);
      
      // Get the current session for the auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('❌ No access token available');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };
      
      // Load user profile
      console.log('📊 Loading user profile...');
      const profileResponse = await fetch(`/api/user/profile`, { headers });
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        console.log('✅ Profile loaded:', profileData.profile);
        setProfile(profileData.profile);
      } else {
        console.error('❌ Profile API error:', profileResponse.status);
        // Fallback to basic user data if profile API fails
        const fallbackProfile: UserProfile = {
          id: user?.id || '',
          email: user?.email || '',
          full_name: user?.user_metadata?.full_name || user?.user_metadata?.name || 'User',
          avatar_url: user?.user_metadata?.avatar_url,
          credits: 100,
          bio: '',
          location: '',
          interests: [],
          created_at: new Date().toISOString()
        };
        setProfile(fallbackProfile);
      }

      // Load recent matches
      console.log('💕 Loading recent matches...');
      const matchesResponse = await fetch('/api/user/matches?limit=5', { headers });
      if (matchesResponse.ok) {
        const matchesData = await matchesResponse.json();
        console.log('✅ Matches loaded:', matchesData.matches);
        setRecentMatches(matchesData.matches);
      } else {
        console.error('❌ Matches API error:', matchesResponse.status);
        setRecentMatches([]);
      }

      // Load dashboard stats
      console.log('📈 Loading dashboard stats...');
      const statsResponse = await fetch('/api/user/stats', { headers });
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        console.log('✅ Stats loaded:', statsData.stats);
        setStats(statsData.stats);
      } else {
        console.error('❌ Stats API error:', statsResponse.status);
        // Fallback stats
        setStats({
          totalMatches: 0,
          totalMessages: 0,
          activeChats: 0,
          profileCompletion: 50
        });
      }
    } catch (error) {
      console.error('❌ Dashboard data loading error:', error);
      toast({
        title: '加载失败',
        description: '无法加载仪表盘数据',
        variant: 'destructive',
      });
    } finally {
      console.log('✅ Dashboard data loading complete, setting loading to false');
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔄 Dashboard useEffect - user:', !!user, 'user id:', user?.id, 'authLoading:', authLoading);
    console.log('🔍 Full user object:', user);
    
    // Wait for auth state to settle
    if (authLoading) {
      console.log('⏳ Auth still loading, waiting...');
      return;
    }
    
    setAuthSettled(true);
    if (!user || !user.id) {
      console.log('❌ No user found in dashboard, redirecting to login');
      console.log('🔍 User check failed - user:', user, 'user.id:', user?.id);
      // Use window.location.href to force a full page reload and avoid routing issues
      window.location.href = '/auth/login';
      return;
    } else {
      console.log('✅ User authenticated, loading dashboard data');
      console.log('👤 User details:', { id: user.id, email: user.email });
      loadDashboardData();
    }
  }, [user, authLoading, router]);

  // Show loading skeleton while auth is settling
  if (!authSettled || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header Skeleton */}
          <div className="flex justify-between items-center mb-8">
            <div className="space-y-2">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 animate-pulse"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96 animate-pulse"></div>
            </div>
            <div className="flex space-x-4">
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
            </div>
          </div>

          {/* Content Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse"></div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4 animate-pulse"></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
      toast({
        title: '已退出登录',
        description: '期待您的再次光临！',
      });
    } catch (error) {
      toast({
        title: '退出失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  const handleRechargeCredits = () => {
    router.push('/payment/recharge');
  };

  const handleStartMatching = () => {
    router.push('/matching');
  };

  const handleViewChats = () => {
    router.push('/chat');
  };

  // Debug logging - only log when state changes significantly
  const renderKey = `${authLoading}-${!!profile}-${loading}-${!!user}`;
  console.log('🔍 Dashboard render state:', { 
    authLoading, 
    profile: !!profile, 
    loading, 
    user: !!user,
    renderKey
  });
  
  // Show loading only if we're still loading auth or if we have no profile yet
  if (authLoading || (!profile && !loading)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>用户资料未找到</CardTitle>
            <CardDescription>请完善您的个人资料</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/profile/setup')} className="w-full">
              设置个人资料
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              欢迎回来，{profile.full_name}！
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              发现新的朋友，开始有趣的对话
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={handleViewChats}>
              <MessageSquare className="h-4 w-4 mr-2" />
              查看聊天
            </Button>
            <Button variant="outline" onClick={() => router.push('/settings')}>
              <Settings className="h-4 w-4 mr-2" />
              设置
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              退出登录
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Profile & Quick Actions */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  个人资料
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={profile.avatar_url} />
                    <AvatarFallback>
                      {profile.full_name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{profile.full_name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {profile.email}
                    </p>
                    {profile.location && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        {profile.location}
                      </p>
                    )}
                  </div>
                </div>
                
                {profile.bio && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {profile.bio}
                  </p>
                )}

                {profile.interests && profile.interests.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">兴趣爱好</p>
                    <div className="flex flex-wrap gap-1">
                      {profile.interests.slice(0, 5).map((interest, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {interest}
                        </Badge>
                      ))}
                      {profile.interests.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{profile.interests.length - 5}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => router.push('/profile/edit')}
                >
                  编辑资料
                </Button>
              </CardContent>
            </Card>

            {/* Credit Balance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  积分余额
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {profile.credits}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    可用积分
                  </p>
                  <Button onClick={handleRechargeCredits} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    充值积分
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>快速操作</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={handleStartMatching} className="w-full">
                  <Heart className="h-4 w-4 mr-2" />
                  开始匹配
                </Button>
                <Button variant="outline" onClick={handleViewChats} className="w-full">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  查看聊天
                </Button>
                <Button variant="outline" onClick={() => router.push('/matching/history')} className="w-full">
                  <Users className="h-4 w-4 mr-2" />
                  匹配历史
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Stats & Recent Matches */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Grid */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <Heart className="h-8 w-8 text-red-500 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          总匹配数
                        </p>
                        <p className="text-2xl font-bold">{stats.totalMatches}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <MessageSquare className="h-8 w-8 text-blue-500 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          消息数量
                        </p>
                        <p className="text-2xl font-bold">{stats.totalMessages}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <Users className="h-8 w-8 text-green-500 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          活跃聊天
                        </p>
                        <p className="text-2xl font-bold">{stats.activeChats}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <TrendingUp className="h-8 w-8 text-purple-500 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          资料完整度
                        </p>
                        <p className="text-2xl font-bold">{stats.profileCompletion}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Recent Matches */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Heart className="h-5 w-5 mr-2" />
                    最近匹配
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => router.push('/matching/history')}
                  >
                    查看全部
                  </Button>
                </CardTitle>
                <CardDescription>
                  您最近的匹配对象
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!recentMatches || recentMatches.length === 0 ? (
                  <div className="text-center py-8">
                    <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      还没有匹配记录
                    </p>
                    <Button onClick={handleStartMatching}>
                      开始匹配
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentMatches.map((match) => (
                      <div 
                        key={match.id} 
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                        onClick={() => router.push(`/chat/${match.id}`)}
                      >
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarImage src={match.matched_user.avatar_url} />
                            <AvatarFallback>
                              {match.matched_user.full_name?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{match.matched_user.full_name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              匹配于 {new Date(match.matched_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary">
                            {Math.round(match.compatibility_score * 100)}% 匹配
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  活动摘要
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      本周新匹配
                    </span>
                    <span className="font-medium">
                      {recentMatches.filter(m => 
                        new Date(m.matched_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                      ).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      活跃天数
                    </span>
                    <span className="font-medium">
                      {Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      平均响应时间
                    </span>
                    <span className="font-medium">2.3 小时</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 