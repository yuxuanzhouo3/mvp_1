'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { 
  Heart, 
  X, 
  Check, 
  ArrowLeft,
  User,
  Settings,
  LogOut,
  Menu,
  Home,
  MessageSquare,
  CreditCard,
  MapPin,
  Star
} from 'lucide-react';

interface Candidate {
  id: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  age?: number;
  interests: string[];
  compatibility_score: number;
}

export default function MatchingPage() {
  const { user, signOut, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);

  const loadCandidates = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const response = await fetch('/api/matching/candidates');
      if (response.ok) {
        const data = await response.json();
        setCandidates(data);
      } else {
        console.error('Failed to load candidates');
        toast({
          title: '加载失败',
          description: '无法加载匹配候选人',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading candidates:', error);
      toast({
        title: '加载失败',
        description: '网络错误，请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    
    if (!user || !user.id) {
      router.push('/auth/login');
      return;
    }
    
    loadCandidates();
  }, [user, authLoading]);

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

  const handleLike = async () => {
    if (currentIndex >= candidates.length) return;
    
    const candidate = candidates[currentIndex];
    try {
      const response = await fetch('/api/matching/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ candidate_id: candidate.id }),
      });
      
      if (response.ok) {
        toast({
          title: '喜欢成功',
          description: `你已喜欢 ${candidate.full_name}`,
        });
      }
    } catch (error) {
      console.error('Error liking candidate:', error);
    }
    
    setCurrentIndex(prev => prev + 1);
  };

  const handlePass = () => {
    setCurrentIndex(prev => prev + 1);
  };

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

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

  const currentCandidate = candidates[currentIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Back Button */}
            <button
              onClick={handleBackToDashboard}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              返回
            </button>

            {/* Title */}
            <h1 className="text-xl font-bold text-gray-900">匹配</h1>

            {/* User Menu */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {user?.user_metadata?.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="text-sm font-medium text-gray-700 hidden sm:block">
                  {user?.user_metadata?.full_name || 'User'}
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
      </header>

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
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-blue-600 rounded-md bg-blue-50"
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
      <div className="pt-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {candidates.length === 0 ? (
            <div className="text-center py-12">
              <Heart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂时没有更多候选人</h3>
              <p className="text-gray-600 mb-6">请稍后再来查看新的匹配！</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                返回首页
              </button>
            </div>
          ) : currentIndex >= candidates.length ? (
            <div className="text-center py-12">
              <Heart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">已查看所有候选人</h3>
              <p className="text-gray-600 mb-6">请稍后再来查看新的匹配！</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                返回首页
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Progress */}
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  {currentIndex + 1} / {candidates.length}
                </p>
              </div>

              {/* Candidate Card */}
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="relative">
                  {/* Avatar */}
                  <div className="w-full h-64 bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center">
                    <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center text-4xl font-bold text-gray-700">
                      {currentCandidate.full_name?.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  
                  {/* Compatibility Score */}
                  <div className="absolute top-4 right-4 bg-white rounded-full px-3 py-1 shadow-md">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-500 mr-1" />
                      <span className="text-sm font-semibold text-gray-700">
                        {currentCandidate.compatibility_score}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {/* Name and Age */}
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {currentCandidate.full_name}
                    </h2>
                    {currentCandidate.age && (
                      <span className="text-lg text-gray-600">{currentCandidate.age}岁</span>
                    )}
                  </div>

                  {/* Location */}
                  {currentCandidate.location && (
                    <div className="flex items-center text-gray-600 mb-4">
                      <MapPin className="h-4 w-4 mr-2" />
                      {currentCandidate.location}
                    </div>
                  )}

                  {/* Bio */}
                  {currentCandidate.bio && (
                    <p className="text-gray-700 mb-4 leading-relaxed">
                      {currentCandidate.bio}
                    </p>
                  )}

                  {/* Interests */}
                  {currentCandidate.interests && currentCandidate.interests.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">兴趣爱好</h3>
                      <div className="flex flex-wrap gap-2">
                        {currentCandidate.interests.map((interest, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-4">
                    <button
                      onClick={handlePass}
                      className="flex-1 flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <X className="h-5 w-5 mr-2" />
                      跳过
                    </button>
                    <button
                      onClick={handleLike}
                      className="flex-1 flex items-center justify-center px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      <Heart className="h-5 w-5 mr-2" />
                      喜欢
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 