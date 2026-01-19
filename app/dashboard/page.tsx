'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/lib/supabase/client';
import { isChinaDeployment } from '@/lib/config/deployment.config';
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
  Calendar,
  Ruler,
  GraduationCap,
  Briefcase,
  Brain,
  Shield,
  Receipt,
  Crown,
  Star,
  Sparkles,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { useLanguage } from '@/components/language-provider';
import { useTranslations, interpolate } from '@/lib/i18n';
import PhotoAuditStatus from '@/components/profile/PhotoAuditStatus';
import { useMarketValue } from '@/hooks/useMarketValue';
import { ScoreBadge } from '@/components/profile/ScoreBadge';
import { chatClient } from '@/lib/realtime/chat-client';

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
  // Extended profile fields
  gender?: 'male' | 'female' | 'other';
  birth_date?: string;
  height_cm?: number;
  weight_kg?: number;
  education_level?: string;
  occupation?: string;
  mbti?: string;
  is_profile_complete?: boolean;
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

interface MembershipStatus {
  tier: string;
  isActive: boolean;
  expiresAt?: string;
  daysRemaining?: number;
}

export default function DashboardPage() {
  const { user, signOut, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = useTranslations(language);

  // Use shared Supabase client singleton
  const supabase = getSupabaseClient();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Use refs to prevent multiple calls and track initialization
  const hasLoadedRef = useRef(false);
  const isRedirectingRef = useRef(false);

  // Get market value score
  const { score: marketValueScore, isLoading: scoreLoading } = useMarketValue({
    userId: user?.id || '',
    enabled: !!user?.id
  });

  const loadDashboardData = useCallback(async (userId: string) => {
    // Prevent multiple simultaneous calls
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    try {
      setLoading(true);

      // Get token based on environment
      let token: string | undefined;

      if (isChinaDeployment()) {
        // CN 环境：使用用户 ID 作为 token
        token = `cn_${userId}`;
      } else {
        // INTL 环境：从 Supabase 获取 session token
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token;
      }

      if (!token) {
        console.error('No session token available');
        setLoading(false);
        return;
      }

      // Save token for PhotoAuditStatus component
      setSessionToken(token);

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Load profile
      const profileRes = await fetch('/api/user/profile', { headers, cache: 'no-store' });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        
        // 🔒 重要：验证返回的 profile 身份与当前登录用户一致
        // 这是防止身份混淆问题的最后一道防线
        if (profileData.profile && profileData.profile.id !== userId) {
          console.error('⚠️ CRITICAL: Profile identity mismatch!', {
            expectedUserId: userId,
            receivedProfileId: profileData.profile.id,
            receivedEmail: profileData.profile.email
          });
          
          // 身份不匹配，清除所有认证数据并重定向到登录页
          console.log('🧹 Clearing mismatched auth data and redirecting to login...');
          localStorage.removeItem('cn_user');
          document.cookie = 'cn_session=; path=/; max-age=0; SameSite=Lax';
          document.cookie = 'cn_session_cross=; path=/; max-age=0; SameSite=None; Secure';
          
          toast({
            title: '身份验证异常 / Authentication Error',
            description: '检测到账户身份不一致，请重新登录 / Account identity mismatch. Please login again.',
            variant: 'destructive',
          });
          
          isRedirectingRef.current = true;
          setLoading(false);
          setTimeout(() => {
            window.location.href = '/auth/login';
          }, 1500);
          return;
        }
        
        setProfile(profileData.profile);
      } else {
        console.error('Failed to load profile:', profileRes.status);
      }

      // Load recent matches
      const matchesRes = await fetch('/api/user/matches', { headers, cache: 'no-store' });
      if (matchesRes.ok) {
        const matchesData = await matchesRes.json();
        setRecentMatches(matchesData.matches?.slice(0, 5) || []);
      } else {
        console.error('Failed to load matches:', matchesRes.status);
      }

      // Load stats
      const statsRes = await fetch('/api/user/stats', { headers, cache: 'no-store' });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats);
      } else {
        console.error('Failed to load stats:', statsRes.status);
      }

      // Load membership status
      try {
        const membershipRes = await fetch('/api/memberships/status', { headers, cache: 'no-store' });
        if (membershipRes.ok) {
          const membershipData = await membershipRes.json();
          setMembershipStatus(membershipData.data?.membership || null);
        }
      } catch {
        // Silently handle membership status failure
        setMembershipStatus(null);
      }

      // Check if user is admin (silently fail if not admin)
      try {
        const adminRes = await fetch('/api/admin/check', { headers, cache: 'no-store' });
        if (adminRes.ok) {
          const adminData = await adminRes.json();
          setIsAdmin(adminData.isAdmin);
        } else {
          // User is not admin, this is expected for most users
          setIsAdmin(false);
        }
      } catch {
        // Silently handle admin check failure
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase.auth]);

  // Main auth effect - only runs once when auth settles
  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    // Prevent duplicate redirects
    if (isRedirectingRef.current) {
      return;
    }

    console.log('🔄 Dashboard useEffect - user:', !!user, 'user id:', user?.id, 'authLoading:', authLoading);

    if (!user || !user.id) {
      // 关键：不依赖 isChinaDeployment()，直接检查 localStorage 和 cookie
      // 这样即使环境变量配置错误也能正常工作
      const cnUserData = localStorage.getItem('cn_user');
      const cnSessionCookie = document.cookie.split(';').find(c => c.trim().startsWith('cn_session='));
      
      // 如果 localStorage 或 cookie 存在，说明用户可能已登录，等待 AuthProvider 恢复
      if (cnUserData || cnSessionCookie) {
        console.log('🔄 Dashboard page: Auth data exists (cnUserData:', !!cnUserData, ', cnSessionCookie:', !!cnSessionCookie, '), waiting for AuthProvider...');
        // 不重定向，不清除数据，等待 AuthProvider
        return;
      }

      console.log('❌ No user found in dashboard and no auth data, redirecting to login');
      isRedirectingRef.current = true;
      setProfile(null);
      setRecentMatches([]);
      setStats(null);
      setLoading(false);
      // Use setTimeout to avoid setState during render
      setTimeout(() => {
        router.push('/auth/login');
      }, 0);
      return;
    }

    console.log('✅ User authenticated, loading dashboard data');
    loadDashboardData(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading, loadDashboardData, router]);

  // Separate effect for profile setup redirect - with debounce
  useEffect(() => {
    // Only check after loading is complete and we have a user
    if (loading || authLoading || !user || isRedirectingRef.current) {
      return;
    }

    // If profile is null or incomplete after loading, redirect to setup
    if (hasLoadedRef.current && (!profile || !profile.is_profile_complete)) {
      console.log('📋 No profile or incomplete profile found, redirecting to profile setup');
      isRedirectingRef.current = true;
      // Use setTimeout to avoid setState during render
      setTimeout(() => {
        router.push('/profile/setup');
      }, 0);
    }
  }, [loading, authLoading, user, profile, router]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t.dashboard.loading}</p>
        </div>
      </div>
    );
  }

  if (!profile || !profile.is_profile_complete) {
    // Show loading while redirecting to profile setup
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t.profileSetup?.redirecting || 'Redirecting to profile setup...'}</p>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    // signOut already handles cache cleanup and redirect to root
  };

  const handleRechargeCredits = () => {
    router.push('/payment/recharge');
  };

  const handleStartMatching = () => {
    router.push('/matching');
  };

  const handleViewChats = () => {
    router.push('/dashboard/messages');
  };

  const handleOpenChat = async (matchId: string) => {
    try {
      const roomId = await chatClient.getOrCreateChatRoom(matchId);
      router.push(`/dashboard/messages/${roomId}`);
    } catch (error) {
      console.error('Failed to open chat:', error);
      toast({
        title: t.dashboard.recentMatches.openChatFailed,
        description: t.dashboard.recentMatches.tryAgainLater,
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      {/* Main Content */}
      <div className="transition-all duration-300 pt-14 md:pt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          {/* Welcome Section */}
          <div className="mb-6">
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <h2 className="text-2xl font-bold text-blue-600 mb-2">
                {interpolate(t.dashboard.welcomeBack, { name: profile.full_name })}
              </h2>
              <p className="text-gray-600">{t.dashboard.discoverFriends}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-6">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">{t.dashboard.quickActions}</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={handleStartMatching}
                    className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Heart className="mr-2 h-5 w-5" />
                    {t.dashboard.startMatching}
                  </button>
                  <button
                    onClick={handleViewChats}
                    className="flex items-center justify-center px-4 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <MessageSquare className="mr-2 h-5 w-5" />
                    {t.dashboard.viewChats}
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
                  <h3 className="text-lg font-semibold text-gray-900">{t.dashboard.stats.title}</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{stats.totalMatches}</div>
                      <div className="text-sm text-gray-600">{t.dashboard.stats.totalMatches}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{stats.totalMessages}</div>
                      <div className="text-sm text-gray-600">{t.dashboard.stats.totalMessages}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-indigo-600">{stats.activeChats}</div>
                      <div className="text-sm text-gray-600">{t.dashboard.stats.activeChats}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{stats.profileCompletion}%</div>
                      <div className="text-sm text-gray-600">{t.dashboard.stats.profileCompletion}</div>
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
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  {t.dashboard.profile.title}
                </h3>
                {/* Membership Badge */}
                {membershipStatus && membershipStatus.tier && membershipStatus.tier !== 'free' && membershipStatus.isActive && (
                  <div
                    onClick={() => router.push('/payment/recharge')}
                    className={`flex items-center px-3 py-1.5 rounded-full cursor-pointer hover:opacity-90 transition-opacity ${
                      membershipStatus.tier === 'vip'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                        : membershipStatus.tier === 'premium'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                        : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                    }`}
                  >
                    {membershipStatus.tier === 'vip' ? (
                      <Crown className="h-4 w-4 mr-1" />
                    ) : membershipStatus.tier === 'premium' ? (
                      <Star className="h-4 w-4 mr-1" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-1" />
                    )}
                    <span className="text-xs font-semibold uppercase">{membershipStatus.tier}</span>
                  </div>
                )}
              </div>
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-lg font-semibold mr-4">
                    {profile.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{profile.full_name}</h4>
                    <p className="text-sm text-gray-600">{profile.email}</p>
                  </div>
                </div>

                {/* Market Value Score */}
                {marketValueScore && (
                  <div
                    onClick={() => router.push('/profile/score-details')}
                    className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-100 dark:border-purple-800 cursor-pointer hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ScoreBadge totalScore={marketValueScore.totalScore} size="md" />
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t.dashboard.profile.marketValue}
                          </p>
                          <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                            {marketValueScore.totalScore.toFixed(1)} / 100
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Top {100 - marketValueScore.percentile}%
                        </p>
                        <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400 ml-auto mt-1" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Basic Info Row */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {profile.gender && (
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="mr-2 h-4 w-4 text-gray-400" />
                      <span>
                        {profile.gender === 'male' ? (t.profileSetup?.genderMale || 'Male') :
                         profile.gender === 'female' ? (t.profileSetup?.genderFemale || 'Female') :
                         (t.profileSetup?.genderOther || 'Other')}
                      </span>
                    </div>
                  )}
                  {profile.birth_date && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="mr-2 h-4 w-4 text-gray-400" />
                      <span>{Math.floor((Date.now() - new Date(profile.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} {t.profileSetup?.yearsOld || 'years old'}</span>
                    </div>
                  )}
                </div>

                {profile.location && (
                  <p className="text-sm text-gray-600 mb-3 flex items-center">
                    <MapPin className="mr-2 h-4 w-4 text-gray-400" />
                    {profile.location}
                  </p>
                )}

                {/* Physical & Professional Info */}
                <div className="space-y-2 mb-4">
                  {profile.height_cm && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Ruler className="mr-2 h-4 w-4 text-gray-400" />
                      <span>{profile.height_cm} cm</span>
                    </div>
                  )}
                  {profile.education_level && (
                    <div className="flex items-center text-sm text-gray-600">
                      <GraduationCap className="mr-2 h-4 w-4 text-gray-400" />
                      <span>
                        {profile.education_level === 'high_school' ? (t.profileSetup?.education_high_school || 'High School') :
                         profile.education_level === 'associate' ? (t.profileSetup?.education_associate || 'Associate') :
                         profile.education_level === 'bachelor' ? (t.profileSetup?.education_bachelor || 'Bachelor') :
                         profile.education_level === 'master' ? (t.profileSetup?.education_master || 'Master') :
                         profile.education_level === 'doctorate' ? (t.profileSetup?.education_doctorate || 'Doctorate') :
                         profile.education_level}
                      </span>
                    </div>
                  )}
                  {profile.occupation && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Briefcase className="mr-2 h-4 w-4 text-gray-400" />
                      <span>{profile.occupation}</span>
                    </div>
                  )}
                  {profile.mbti && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Brain className="mr-2 h-4 w-4 text-gray-400" />
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">{profile.mbti}</span>
                    </div>
                  )}
                </div>

                {profile.bio && (
                  <p className="text-sm text-gray-600 mb-4 italic">&ldquo;{profile.bio}&rdquo;</p>
                )}

                {profile.interests && profile.interests.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">{t.dashboard.profile.interests}</p>
                    <div className="flex flex-wrap gap-2">
                      {profile.interests.slice(0, 5).map((interest, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                          {interest}
                        </span>
                      ))}
                      {profile.interests.length > 5 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                          +{profile.interests.length - 5}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => router.push('/profile/edit')}
                  className="w-full px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  {t.dashboard.profile.editProfile}
                </button>
              </div>
            </div>

            {/* Credits Card */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <CreditCard className="mr-2 h-5 w-5" />
                  {t.dashboard.credits.title}
                </h3>
                <button
                  onClick={() => router.push('/dashboard/orders')}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                >
                  <Receipt className="mr-1 h-4 w-4" />
                  {language === 'zh' ? '订单' : 'Orders'}
                </button>
              </div>
              <div className="p-6">
                {/* Balance Display */}
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-5 mb-5 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm mb-1">{t.dashboard.credits.availableCredits}</p>
                      <div className="text-4xl font-bold">{profile.credits}</div>
                    </div>
                    <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                      <CreditCard className="h-7 w-7 text-white" />
                    </div>
                  </div>
                  {profile.credits < 20 && (
                    <div className="mt-3 pt-3 border-t border-white/20">
                      <p className="text-yellow-200 text-sm flex items-center">
                        <span className="mr-1">⚠️</span>
                        {t.dashboard.credits.lowBalance || 'Low balance! Recharge to continue matching.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Credits Usage Info */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center mb-1">
                      <Heart className="h-4 w-4 text-pink-500 mr-1" />
                      <span className="text-xs text-gray-500">{t.dashboard.credits.likeCost || 'Per Like'}</span>
                    </div>
                    <div className="font-bold text-gray-900">5</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center mb-1">
                      <MessageSquare className="h-4 w-4 text-blue-500 mr-1" />
                      <span className="text-xs text-gray-500">{t.dashboard.credits.messageCost || 'Per Message'}</span>
                    </div>
                    <div className="font-bold text-gray-900">1</div>
                  </div>
                </div>

                {/* Estimated Likes */}
                <div className="bg-green-50 border border-green-100 rounded-lg p-3 mb-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-700 flex items-center">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      {t.dashboard.credits.estimatedLikes || 'Estimated Likes'}
                    </span>
                    <span className="font-bold text-green-700 text-lg">{Math.floor(profile.credits / 5)}</span>
                  </div>
                </div>

                {/* Recharge Button */}
                <button
                  onClick={handleRechargeCredits}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center font-semibold shadow-md hover:shadow-lg"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  {t.dashboard.credits.rechargeCredits}
                </button>
              </div>
            </div>
          </div>

          {/* Photo Audit Status */}
          {sessionToken && user && (
            <div className="mb-6">
              <PhotoAuditStatus
                userId={user.id}
                token={sessionToken}
                onUploadClick={() => router.push('/profile/photos')}
              />
            </div>
          )}

          {/* Recent Matches */}
          {recentMatches.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Heart className="mr-2 h-5 w-5" />
                  {t.dashboard.recentMatches.title}
                </h3>
                <button
                  onClick={() => router.push('/matching/history')}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {t.dashboard.recentMatches.viewAll}
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
                          <p className="text-sm text-gray-600">{t.matching.compatibility}: {match.compatibility_score}%</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleOpenChat(match.id)}
                        className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        {t.dashboard.recentMatches.chat}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
