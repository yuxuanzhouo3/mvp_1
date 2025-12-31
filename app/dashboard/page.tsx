'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@supabase/supabase-js';
import { 
  Heart, 
  MessageSquare, 
  Users, 
  TrendingUp, 
  CreditCard, 
  Plus, 
  Settings, 
  User, 
  MapPin,
  Bell,
  LogOut,
  Menu,
  Home,
  ArrowLeft
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';

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
  const pathname = usePathname();
  const { toast } = useToast();
  
  // Create Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [authSettled, setAuthSettled] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  const loadDashboardData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        console.error('No session token available');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      // Load profile
      const profileRes = await fetch('/api/user/profile', { headers });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData.profile);
      } else {
        console.error('Failed to load profile:', profileRes.status);
      }

      // Load recent matches
      const matchesRes = await fetch('/api/user/matches', { headers });
      if (matchesRes.ok) {
        const matchesData = await matchesRes.json();
        setRecentMatches(matchesData.matches?.slice(0, 5) || []);
      } else {
        console.error('Failed to load matches:', matchesRes.status);
      }

      // Load stats
      const statsRes = await fetch('/api/user/stats', { headers });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats);
      } else {
        console.error('Failed to load stats:', statsRes.status);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔄 Dashboard useEffect - user:', !!user, 'user id:', user?.id, 'authLoading:', authLoading);
    
    if (authLoading) {
      console.log('⏳ Auth still loading, waiting...');
      return;
    }
    
    setAuthSettled(true);
    
    if (!user || !user.id) {
      console.log('❌ No user found in dashboard, redirecting to login');
      setProfile(null);
      setRecentMatches([]);
      setStats(null);
      setLoading(false);
      router.push('/auth/login');
      return;
    } else {
      console.log('✅ User authenticated, loading dashboard data');
      loadDashboardData();
    }
  }, [user, authLoading, authSettled]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">无法加载用户资料</h3>
          <p className="text-gray-600 mb-4">请稍后重试或联系客服。</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md transition-colors"
          >
            刷新页面
          </button>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/auth/login';
      toast({
        title: '已退出登录',
        description: '期待您的再次光临！',
      });
    } catch (error) {
      console.error('Logout error:', error);
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

  // Hide header on settings page
  const isSettingsPage = pathname === '/dashboard/settings';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Hidden on settings page */}
      {!isSettingsPage && (
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Sidebar Toggle Button */}
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 z-50 p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                style={{ left: '1%' }}
              >
                <Menu className="h-5 w-5" />
              </button>

              {/* Logo */}
              <div className="flex-1 flex justify-center">
                <h1 className="text-xl font-bold text-blue-600">PersonaLink</h1>
              </div>

              {/* User Menu */}
              <div className="relative">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {profile.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-700 hidden sm:block">
                      {profile.full_name}
                    </span>
                  </div>
                  
                  <div className="relative">
                    <button className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 transition-colors">
                      <Settings className="h-4 w-4" />
                    </button>
                    
                    {/* Dropdown Menu */}
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 hidden group-hover:block">
                      <button
                        onClick={() => router.push('/dashboard/settings')}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        设置
                      </button>
                      <button
                        onClick={() => router.push('/dashboard/notifications')}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        通知
                      </button>
                      <hr className="my-1" />
                      <button
                        onClick={handleSignOut}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                      >
                        退出登录
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${showSidebar ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">PersonaLink</h2>
          <button
            onClick={() => setShowSidebar(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
        
        <nav className="mt-4">
          <div className="px-4 space-y-2">
            <button
              onClick={() => { router.push('/dashboard'); setShowSidebar(false); }}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900"
            >
              <Home className="mr-3 h-5 w-5" />
              首页
            </button>
            <button
              onClick={() => { router.push('/chat'); setShowSidebar(false); }}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900"
            >
              <MessageSquare className="mr-3 h-5 w-5" />
              聊天
            </button>
            <button
              onClick={() => { router.push('/matching'); setShowSidebar(false); }}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900"
            >
              <Heart className="mr-3 h-5 w-5" />
              匹配
            </button>
            <button
              onClick={() => { router.push('/payment/recharge'); setShowSidebar(false); }}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900"
            >
              <CreditCard className="mr-3 h-5 w-5" />
              充值
            </button>
            <button
              onClick={() => { router.push('/dashboard/settings'); setShowSidebar(false); }}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900"
            >
              <Settings className="mr-3 h-5 w-5" />
              设置
            </button>
          </div>
        </nav>
      </div>

      {/* Overlay */}
      {showSidebar && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Main Content */}
      <div className={`${!isSettingsPage ? 'pt-16' : ''} transition-all duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Welcome Section */}
          <div className="mb-6">
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <h2 className="text-2xl font-bold text-blue-600 mb-2">
                欢迎回来，{profile.full_name}！
              </h2>
              <p className="text-gray-600">发现新的朋友，开始有趣的对话</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-6">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">快速操作</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={handleStartMatching}
                    className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Heart className="mr-2 h-5 w-5" />
                    开始匹配
                  </button>
                  <button
                    onClick={handleViewChats}
                    className="flex items-center justify-center px-4 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <MessageSquare className="mr-2 h-5 w-5" />
                    查看聊天
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="mb-6">
              <div className="bg-white rounded-lg shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">数据统计</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{stats.totalMatches}</div>
                      <div className="text-sm text-gray-600">总匹配数</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{stats.totalMessages}</div>
                      <div className="text-sm text-gray-600">消息数量</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-indigo-600">{stats.activeChats}</div>
                      <div className="text-sm text-gray-600">活跃聊天</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{stats.profileCompletion}%</div>
                      <div className="text-sm text-gray-600">资料完整度</div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${stats.profileCompletion}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Profile & Credits */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Profile Card */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  个人资料
                </h3>
              </div>
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-lg font-semibold mr-4">
                    {profile.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{profile.full_name}</h4>
                    <p className="text-sm text-gray-600">{profile.email}</p>
                  </div>
                </div>
                
                {profile.location && (
                  <p className="text-sm text-gray-600 mb-3 flex items-center">
                    <MapPin className="mr-1 h-4 w-4" />
                    {profile.location}
                  </p>
                )}
                
                {profile.interests && profile.interests.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">兴趣爱好</p>
                    <div className="flex flex-wrap gap-2">
                      {profile.interests.slice(0, 3).map((interest, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                          {interest}
                        </span>
                      ))}
                      {profile.interests.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                          +{profile.interests.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                <button
                  onClick={() => router.push('/profile/edit')}
                  className="w-full px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  编辑资料
                </button>
              </div>
            </div>

            {/* Credits Card */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <CreditCard className="mr-2 h-5 w-5" />
                  积分余额
                </h3>
              </div>
              <div className="p-6 text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">{profile.credits}</div>
                <p className="text-sm text-gray-600 mb-4">可用积分</p>
                <button
                  onClick={handleRechargeCredits}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  充值积分
                </button>
              </div>
            </div>
          </div>

          {/* Recent Matches */}
          {recentMatches.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Heart className="mr-2 h-5 w-5" />
                  最近匹配
                </h3>
                <button
                  onClick={() => router.push('/matching/history')}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  查看全部
                </button>
              </div>
              <div className="divide-y divide-gray-200">
                {recentMatches.map((match) => (
                  <div key={match.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-white text-sm font-semibold mr-3">
                          {match.matched_user.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{match.matched_user.full_name}</h4>
                          <p className="text-sm text-gray-600">匹配度: {match.compatibility_score}%</p>
                        </div>
                      </div>
                      <button
                        onClick={() => router.push(`/chat/${match.id}`)}
                        className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        聊天
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 