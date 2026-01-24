'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/lib/supabase/client';
import { isChinaDeployment } from '@/lib/config/deployment.config';
import {
  Sun,
  Moon,
  CloudSun,
  Ghost,
  ArrowRight,
  Zap,
  FileText,
  Activity,
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
        token = undefined;
      } else {
        // INTL 环境：从 Supabase 获取 session token
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token;
      }

      // Save token for PhotoAuditStatus component
      setSessionToken(token ?? null);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
          fetch('/api/auth/cn-logout', { method: 'POST', credentials: 'include' }).catch(() => {});
          
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
  }, [supabase.auth, toast]);

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
      
      // 如果 localStorage 或 cookie 存在，说明用户可能已登录，等待 AuthProvider 恢复
      if (cnUserData) {
        console.log('🔄 Dashboard page: Auth data exists (cnUserData:', !!cnUserData, '), waiting for AuthProvider...');
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

  const isCN = isChinaDeployment();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { icon: <Sun className="h-8 w-8 text-yellow-500" />, text: isCN ? "早上好" : "Good Morning" };
    if (hour < 18) return { icon: <CloudSun className="h-8 w-8 text-orange-400" />, text: isCN ? "下午好" : "Good Afternoon" };
    return { icon: <Moon className="h-8 w-8 text-indigo-400" />, text: isCN ? "晚上好" : "Good Evening" };
  };

  const greeting = getGreeting();

  // Theme Classes
  const containerClass = isCN ? "cn-bg-cream min-h-screen" : "bg-animated min-h-screen";
  const cardClass = isCN ? "cn-card bg-white" : "card-glass";
  const btnPrimaryClass = isCN ? "cn-btn cn-btn-primary w-full" : "btn-primary w-full";
  const btnSecondaryClass = isCN ? "cn-btn cn-btn-secondary w-full" : "btn-secondary w-full";
  const titleClass = isCN ? "cn-card-title" : "text-xl font-bold text-gradient-theme";
  const subtitleClass = isCN ? "cn-card-subtitle" : "text-sm text-gray-500 dark:text-gray-400";
  const sectionTitleClass = isCN ? "text-xl font-bold text-[hsl(var(--cn-primary))] mb-4 flex items-center" : "text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center";

  return (
    <>
      {/* Main Content */}
      <div className={`transition-all duration-300 pt-14 md:pt-0 ${containerClass}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Welcome Section */}
          <div className="mb-8 cn-animate-in fade-in">
            <div className={`${cardClass} p-8 text-center relative overflow-hidden flex flex-col items-center justify-center`}>
               {!isCN && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>}
               
               <div className="mb-4 animate-bounce-slow">
                 {greeting.icon}
               </div>
               
              <h2 className={`text-3xl font-bold mb-3 ${isCN ? 'text-[hsl(var(--cn-primary))]' : 'text-gradient-theme'}`}>
                {greeting.text}, {profile.full_name}
              </h2>
              <p className={subtitleClass}>{t.dashboard.discoverFriends}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-8 cn-animate-in fade-in" style={{ animationDelay: '0.1s' }}>
            <div className={cardClass}>
              <div className={`px-6 py-4 border-b ${isCN ? 'border-[hsl(var(--cn-border))]' : 'border-gray-100 dark:border-gray-800'}`}>
                <h3 className={sectionTitleClass}>
                    <Zap className={`mr-2 h-5 w-5 ${isCN ? 'text-[hsl(var(--cn-gold))]' : 'text-yellow-500'}`} />
                    {t.dashboard.quickActions}
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={handleStartMatching}
                    className={`${btnPrimaryClass} flex flex-col items-center justify-center py-6 group`}
                  >
                    <Heart className="mb-2 h-8 w-8 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-lg">{t.dashboard.startMatching}</span>
                    <span className="text-sm opacity-80 mt-1 font-normal">{isCN ? "寻找心仪对象" : "Find your soulmate"}</span>
                  </button>
                  <button
                    onClick={handleViewChats}
                    className={`${btnSecondaryClass} flex flex-col items-center justify-center py-6 group`}
                  >
                    <MessageSquare className="mb-2 h-8 w-8 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-lg">{t.dashboard.viewChats}</span>
                    <span className="text-sm opacity-80 mt-1 font-normal">{isCN ? "查看未读消息" : "Check new messages"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="mb-8 cn-animate-in fade-in" style={{ animationDelay: '0.2s' }}>
              <div className={cardClass}>
                <div className={`px-6 py-4 border-b ${isCN ? 'border-[hsl(var(--cn-border))]' : 'border-gray-100 dark:border-gray-800'}`}>
                  <h3 className={sectionTitleClass}>
                      <Activity className={`mr-2 h-5 w-5 ${isCN ? 'text-[hsl(var(--cn-primary))]' : 'text-blue-500'}`} />
                      {t.dashboard.stats.title}
                  </h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-6">
                    <div className="text-center p-4 rounded-xl bg-gray-50 dark:bg-white/5 relative overflow-hidden group hover:shadow-md transition-all">
                      <div className={`absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity ${isCN ? 'text-[hsl(var(--cn-primary))]' : 'text-blue-600'}`}>
                          <Users className="h-24 w-24" />
                      </div>
                      <div className={`text-3xl font-bold mb-1 relative z-10 ${isCN ? 'text-[hsl(var(--cn-primary))]' : 'text-blue-600'}`}>{stats.totalMatches}</div>
                      <div className="text-sm text-gray-500 relative z-10">{t.dashboard.stats.totalMatches}</div>
                    </div>
                    
                    <div className="text-center p-4 rounded-xl bg-gray-50 dark:bg-white/5 relative overflow-hidden group hover:shadow-md transition-all">
                       <div className={`absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity ${isCN ? 'text-[hsl(var(--cn-gold))]' : 'text-green-600'}`}>
                          <MessageSquare className="h-24 w-24" />
                      </div>
                      <div className={`text-3xl font-bold mb-1 relative z-10 ${isCN ? 'text-[hsl(var(--cn-gold))]' : 'text-green-600'}`}>{stats.totalMessages}</div>
                      <div className="text-sm text-gray-500 relative z-10">{t.dashboard.stats.totalMessages}</div>
                    </div>
                    
                    <div className="text-center p-4 rounded-xl bg-gray-50 dark:bg-white/5 relative overflow-hidden group hover:shadow-md transition-all">
                       <div className={`absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity ${isCN ? 'text-[hsl(var(--cn-primary-dark))]' : 'text-indigo-600'}`}>
                          <Zap className="h-24 w-24" />
                      </div>
                      <div className={`text-3xl font-bold mb-1 relative z-10 ${isCN ? 'text-[hsl(var(--cn-primary-dark))]' : 'text-indigo-600'}`}>{stats.activeChats}</div>
                      <div className="text-sm text-gray-500 relative z-10">{t.dashboard.stats.activeChats}</div>
                    </div>
                    
                    <div className="text-center p-4 rounded-xl bg-gray-50 dark:bg-white/5 relative overflow-hidden group hover:shadow-md transition-all">
                       <div className={`absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity ${isCN ? 'text-[hsl(var(--cn-warning))]' : 'text-yellow-600'}`}>
                          <FileText className="h-24 w-24" />
                      </div>
                      <div className={`text-3xl font-bold mb-1 relative z-10 ${isCN ? 'text-[hsl(var(--cn-warning))]' : 'text-yellow-600'}`}>{stats.profileCompletion}%</div>
                      <div className="text-sm text-gray-500 relative z-10">{t.dashboard.stats.profileCompletion}</div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all duration-1000 ease-out ${isCN ? 'bg-[hsl(var(--cn-gold))]' : 'bg-gradient-to-r from-blue-500 to-purple-500'}`}
                      style={{ width: `${stats.profileCompletion}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-center mt-2 text-gray-400">
                    {stats.profileCompletion < 100 ? (isCN ? "完善资料可提高匹配成功率" : "Complete your profile to get more matches") : (isCN ? "资料已完善" : "Profile completed!")}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Profile & Credits */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 cn-animate-in fade-in" style={{ animationDelay: '0.3s' }}>
            {/* Profile Card */}
            <div className={`${isCN ? 'cn-profile-card' : 'intl-profile-card'}`}>
              <div className={`${isCN ? 'cn-profile-header' : 'pb-4 border-b border-gray-100 dark:border-gray-800 mb-4'}`}>
                 {!isCN && (
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold flex items-center">
                            <User className="mr-2 h-5 w-5 text-purple-500" />
                            {t.dashboard.profile.title}
                        </h3>
                         {/* Membership Badge INTL */}
                        {membershipStatus && membershipStatus.tier && membershipStatus.tier !== 'free' && membershipStatus.isActive && (
                          <div
                            onClick={() => router.push('/payment/recharge')}
                            className={`flex items-center px-3 py-1 rounded-full cursor-pointer hover:opacity-90 transition-opacity badge-theme`}
                          >
                             <Sparkles className="h-3 w-3 mr-1" />
                            <span className="uppercase">{membershipStatus.tier}</span>
                          </div>
                        )}
                    </div>
                 )}
                 {isCN && (
                     <div className="text-center">
                         <h3 className="text-xl font-bold mb-2">{t.dashboard.profile.title}</h3>
                          {/* Membership Badge CN */}
                        {membershipStatus && membershipStatus.tier && membershipStatus.tier !== 'free' && membershipStatus.isActive && (
                          <div
                            onClick={() => router.push('/payment/recharge')}
                            className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 text-white text-sm"
                          >
                            <span className="uppercase">{membershipStatus.tier}</span>
                          </div>
                        )}
                     </div>
                 )}
              </div>
              
              <div className={isCN ? "cn-profile-body" : ""}>
                <div className={`flex items-center mb-6 ${isCN ? 'flex-col text-center' : ''}`}>
                  <div className={`${isCN ? 'cn-profile-avatar' : 'w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 p-1 mr-4 shadow-lg'}`}>
                     <div className={`w-full h-full rounded-full flex items-center justify-center text-white text-2xl font-bold ${isCN ? 'bg-[hsl(var(--cn-primary))]' : 'bg-white/20 backdrop-blur-sm'}`}>
                        {profile.full_name?.charAt(0).toUpperCase()}
                     </div>
                  </div>
                  <div className={isCN ? '' : 'flex-1'}>
                    <h4 className={isCN ? "cn-profile-name" : "text-xl font-bold text-gray-900 dark:text-white"}>{profile.full_name}</h4>
                    <p className={isCN ? "cn-profile-age" : "text-sm text-gray-500 dark:text-gray-400"}>{profile.email}</p>
                  </div>
                </div>

                {/* Market Value Score */}
                {marketValueScore && (
                  <div
                    onClick={() => router.push('/profile/score-details')}
                    className={`mb-6 p-4 rounded-xl cursor-pointer transition-all ${
                        isCN 
                        ? 'bg-[hsl(var(--cn-bg-cream))] border border-[hsl(var(--cn-border-gold))]' 
                        : 'bg-gradient-to-r from-purple-50/50 to-blue-50/50 dark:from-purple-900/10 dark:to-blue-900/10 border border-purple-100 dark:border-purple-800 hover:shadow-lg'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <ScoreBadge totalScore={marketValueScore.totalScore} size="md" />
                        <div>
                          <p className={`text-sm font-medium ${isCN ? 'text-[hsl(var(--cn-text-secondary))]' : 'text-gray-600 dark:text-gray-300'}`}>
                            {t.dashboard.profile.marketValue}
                          </p>
                          <p className={`text-xl font-bold ${isCN ? 'text-[hsl(var(--cn-primary))]' : 'text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600'}`}>
                            {marketValueScore.totalScore.toFixed(1)} / 100
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs ${isCN ? 'text-[hsl(var(--cn-text-muted))]' : 'text-gray-500'}`}>
                          Top {100 - marketValueScore.percentile}%
                        </p>
                        <TrendingUp className={`h-5 w-5 ml-auto mt-1 ${isCN ? 'text-[hsl(var(--cn-primary))]' : 'text-purple-500'}`} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Basic Info Row */}
                <div className={`grid grid-cols-2 gap-4 mb-6 ${isCN ? '' : 'bg-gray-50 dark:bg-white/5 p-4 rounded-xl'}`}>
                  {profile.gender && (
                    <div className={`flex items-center text-sm ${isCN ? 'cn-info-row border-none p-0' : 'text-gray-600 dark:text-gray-300'}`}>
                      <User className={`mr-2 h-4 w-4 ${isCN ? 'text-[hsl(var(--cn-text-secondary))]' : 'text-gray-400'}`} />
                      <span className={isCN ? 'cn-info-value' : ''}>
                        {profile.gender === 'male' ? (t.profileSetup?.genderMale || 'Male') :
                         profile.gender === 'female' ? (t.profileSetup?.genderFemale || 'Female') :
                         (t.profileSetup?.genderOther || 'Other')}
                      </span>
                    </div>
                  )}
                  {profile.birth_date && (
                    <div className={`flex items-center text-sm ${isCN ? 'cn-info-row border-none p-0' : 'text-gray-600 dark:text-gray-300'}`}>
                      <Calendar className={`mr-2 h-4 w-4 ${isCN ? 'text-[hsl(var(--cn-text-secondary))]' : 'text-gray-400'}`} />
                      <span className={isCN ? 'cn-info-value' : ''}>{Math.floor((Date.now() - new Date(profile.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} {t.profileSetup?.yearsOld || 'years old'}</span>
                    </div>
                  )}
                   {profile.height_cm && (
                    <div className={`flex items-center text-sm ${isCN ? 'cn-info-row border-none p-0' : 'text-gray-600 dark:text-gray-300'}`}>
                      <Ruler className={`mr-2 h-4 w-4 ${isCN ? 'text-[hsl(var(--cn-text-secondary))]' : 'text-gray-400'}`} />
                      <span className={isCN ? 'cn-info-value' : ''}>{profile.height_cm} cm</span>
                    </div>
                  )}
                  {profile.education_level && (
                    <div className={`flex items-center text-sm ${isCN ? 'cn-info-row border-none p-0' : 'text-gray-600 dark:text-gray-300'}`}>
                      <GraduationCap className={`mr-2 h-4 w-4 ${isCN ? 'text-[hsl(var(--cn-text-secondary))]' : 'text-gray-400'}`} />
                      <span className={isCN ? 'cn-info-value' : ''}>
                        {profile.education_level === 'high_school' ? (t.profileSetup?.education_high_school || 'High School') :
                         profile.education_level === 'associate' ? (t.profileSetup?.education_associate || 'Associate') :
                         profile.education_level === 'bachelor' ? (t.profileSetup?.education_bachelor || 'Bachelor') :
                         profile.education_level === 'master' ? (t.profileSetup?.education_master || 'Master') :
                         profile.education_level === 'doctorate' ? (t.profileSetup?.education_doctorate || 'Doctorate') :
                         profile.education_level}
                      </span>
                    </div>
                  )}
                </div>

                {profile.location && (
                  <p className={`text-sm mb-4 flex items-center ${isCN ? 'cn-text-secondary' : 'text-gray-600 dark:text-gray-400'}`}>
                    <MapPin className="mr-2 h-4 w-4 opacity-70" />
                    {profile.location}
                  </p>
                )}

                {/* Professional Info */}
                <div className="space-y-3 mb-6">
                  {profile.occupation && (
                    <div className={`flex items-center text-sm ${isCN ? 'cn-info-row' : 'p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors'}`}>
                      <Briefcase className={`mr-3 h-4 w-4 ${isCN ? 'text-[hsl(var(--cn-text-secondary))]' : 'text-gray-400'}`} />
                      <span className={isCN ? 'cn-info-value' : 'text-gray-700 dark:text-gray-200'}>{profile.occupation}</span>
                    </div>
                  )}
                  {profile.mbti && (
                    <div className={`flex items-center text-sm ${isCN ? 'cn-info-row' : 'p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors'}`}>
                      <Brain className={`mr-3 h-4 w-4 ${isCN ? 'text-[hsl(var(--cn-text-secondary))]' : 'text-gray-400'}`} />
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${isCN ? 'cn-badge-primary' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'}`}>{profile.mbti}</span>
                    </div>
                  )}
                </div>

                {profile.bio && (
                  <p className={`text-sm mb-6 italic p-4 rounded-lg ${isCN ? 'bg-[hsl(var(--cn-bg-cream))] text-[hsl(var(--cn-text-secondary))]' : 'bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300 border-l-4 border-purple-400'}`}>&ldquo;{profile.bio}&rdquo;</p>
                )}

                {profile.interests && profile.interests.length > 0 && (
                  <div className="mb-6">
                    <p className={`text-sm mb-3 ${isCN ? 'cn-text-secondary font-medium' : 'text-gray-500 font-medium'}`}>{t.dashboard.profile.interests}</p>
                    <div className="flex flex-wrap gap-2">
                      {profile.interests.slice(0, 5).map((interest, index) => (
                        <span key={index} className={isCN ? "cn-badge cn-badge-gold" : "interest-tag"}>
                          {interest}
                        </span>
                      ))}
                      {profile.interests.length > 5 && (
                        <span className={`px-2 py-1 text-xs rounded-full ${isCN ? 'bg-gray-100 text-gray-500' : 'bg-gray-100 text-gray-500'}`}>
                          +{profile.interests.length - 5}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => router.push('/profile/edit')}
                  className={`w-full py-3 rounded-lg transition-all font-medium ${
                      isCN 
                      ? 'border-2 border-[hsl(var(--cn-primary))] text-[hsl(var(--cn-primary))] hover:bg-[hsl(var(--cn-primary)/0.05)]' 
                      : 'border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                  }`}
                >
                  {t.dashboard.profile.editProfile}
                </button>
              </div>
            </div>

            {/* Credits Card */}
            <div className={`${cardClass} overflow-hidden flex flex-col`}>
              <div className={`px-6 py-4 border-b flex items-center justify-between ${isCN ? 'border-[hsl(var(--cn-border))]' : 'border-gray-100 dark:border-gray-800'}`}>
                <h3 className={sectionTitleClass}>
                  <CreditCard className="mr-2 h-5 w-5" />
                  {t.dashboard.credits.title}
                </h3>
                <button
                  onClick={() => router.push('/dashboard/orders')}
                  className={`text-sm flex items-center hover:opacity-80 ${isCN ? 'text-[hsl(var(--cn-primary))]' : 'text-blue-600'}`}
                >
                  <Receipt className="mr-1 h-4 w-4" />
                  {language === 'zh' ? '订单' : 'Orders'}
                </button>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                {/* Balance Display */}
                <div className={`rounded-xl p-6 mb-6 text-white relative overflow-hidden ${isCN ? 'bg-gradient-to-br from-[hsl(var(--cn-gold))] to-[hsl(var(--cn-gold-dark))]' : 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-glow'}`}>
                   {!isCN && <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>}
                  <div className="flex items-center justify-between relative z-10">
                    <div>
                      <p className="text-white/80 text-sm mb-2 font-medium">{t.dashboard.credits.availableCredits}</p>
                      <div className="text-5xl font-bold tracking-tight">{profile.credits}</div>
                    </div>
                    <div className="w-16 h-16 bg-white/20 rounded-2xl backdrop-blur-sm flex items-center justify-center border border-white/30">
                      <CreditCard className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  {profile.credits < 20 && (
                    <div className="mt-4 pt-4 border-t border-white/20">
                      <p className="text-yellow-100 text-sm flex items-center font-medium">
                        <span className="mr-2 text-lg">⚠️</span>
                        {t.dashboard.credits.lowBalance || 'Low balance! Recharge to continue matching.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Credits Usage Info */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className={`rounded-xl p-4 text-center ${isCN ? 'bg-[hsl(var(--cn-bg-cream))]' : 'bg-white dark:bg-white/5 border border-gray-100 dark:border-gray-800'}`}>
                    <div className="flex items-center justify-center mb-2">
                      <Heart className="h-4 w-4 text-pink-500 mr-2" />
                      <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{t.dashboard.credits.likeCost || 'Per Like'}</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">5</div>
                  </div>
                  <div className={`rounded-xl p-4 text-center ${isCN ? 'bg-[hsl(var(--cn-bg-cream))]' : 'bg-white dark:bg-white/5 border border-gray-100 dark:border-gray-800'}`}>
                    <div className="flex items-center justify-center mb-2">
                      <MessageSquare className="h-4 w-4 text-blue-500 mr-2" />
                      <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{t.dashboard.credits.messageCost || 'Per Message'}</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">1</div>
                  </div>
                </div>

                {/* Estimated Likes */}
                <div className={`rounded-xl p-4 mb-6 border ${isCN ? 'bg-green-50 border-green-100' : 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm flex items-center font-medium ${isCN ? 'text-green-700' : 'text-emerald-700 dark:text-emerald-400'}`}>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      {t.dashboard.credits.estimatedLikes || 'Estimated Likes'}
                    </span>
                    <span className={`font-bold text-xl ${isCN ? 'text-green-700' : 'text-emerald-700 dark:text-emerald-400'}`}>{Math.floor(profile.credits / 5)}</span>
                  </div>
                </div>

                {/* Recharge Button */}
                <button
                  onClick={handleRechargeCredits}
                  className={`mt-auto w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 ${
                      isCN 
                      ? 'bg-gradient-to-r from-[hsl(var(--cn-primary))] to-[hsl(var(--cn-primary-dark))]' 
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600'
                  }`}
                >
                  <div className="flex items-center justify-center">
                      <Plus className="mr-2 h-6 w-6" />
                      {t.dashboard.credits.rechargeCredits}
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Photo Audit Status */}
          {user && (
            <div className="mb-8 cn-animate-in fade-in" style={{ animationDelay: '0.4s' }}>
              <PhotoAuditStatus
                userId={user.id}
                token={sessionToken ?? undefined}
                onUploadClick={() => router.push('/profile/photos')}
              />
            </div>
          )}

          {/* Recent Matches */}
          <div className={`${cardClass} cn-animate-in fade-in`} style={{ animationDelay: '0.5s' }}>
            <div className={`px-6 py-4 border-b flex justify-between items-center ${isCN ? 'border-[hsl(var(--cn-border))]' : 'border-gray-100 dark:border-gray-800'}`}>
              <h3 className={sectionTitleClass}>
                <Heart className="mr-2 h-5 w-5 text-pink-500" />
                {t.dashboard.recentMatches.title}
              </h3>
              {recentMatches.length > 0 && (
                <button
                  onClick={() => router.push('/matching/history')}
                  className={`text-sm hover:underline ${isCN ? 'text-[hsl(var(--cn-primary))]' : 'text-blue-600'}`}
                >
                  {t.dashboard.recentMatches.viewAll}
                </button>
              )}
            </div>
            
            {recentMatches.length > 0 ? (
              <div className={`divide-y ${isCN ? 'divide-[hsl(var(--cn-border))]' : 'divide-gray-100 dark:divide-gray-800'}`}>
                {recentMatches.map((match) => (
                  <div key={match.id} className={`px-6 py-4 transition-colors ${isCN ? 'hover:bg-[hsl(var(--cn-bg-cream))]' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold mr-4 shadow-sm ${isCN ? 'bg-[hsl(var(--cn-text-muted))]' : 'bg-gradient-to-br from-gray-400 to-gray-500'}`}>
                          {match.matched_user.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white text-lg">{match.matched_user.full_name}</h4>
                          <div className="flex items-center mt-1">
                             {isCN ? (
                                 <span className="cn-match-score-label text-xs">
                                     匹配度: <span className="text-[hsl(var(--cn-primary))] font-bold">{match.compatibility_score}%</span>
                                 </span>
                             ) : (
                                 <div className="flex items-center">
                                     <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden mr-2">
                                         <div className="h-full bg-gradient-to-r from-pink-500 to-purple-500" style={{ width: `${match.compatibility_score}%` }}></div>
                                     </div>
                                     <span className="text-xs font-bold text-purple-600">{match.compatibility_score}%</span>
                                 </div>
                             )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleOpenChat(match.id)}
                        className={`px-6 py-2 rounded-lg font-medium transition-all ${
                            isCN 
                            ? 'border border-[hsl(var(--cn-primary))] text-[hsl(var(--cn-primary))] hover:bg-[hsl(var(--cn-primary))] hover:text-white' 
                            : 'bg-white border border-gray-200 hover:border-blue-500 hover:text-blue-600 text-gray-600 shadow-sm'
                        }`}
                      >
                        {t.dashboard.recentMatches.chat}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center flex flex-col items-center justify-center text-gray-500">
                <div className={`mb-4 p-4 rounded-full ${isCN ? 'bg-gray-100' : 'bg-gray-50 dark:bg-white/5'}`}>
                   <Ghost className="h-12 w-12 opacity-50" />
                </div>
                <h4 className="text-lg font-medium mb-2">{isCN ? "暂无匹配" : "No matches yet"}</h4>
                <p className="text-sm mb-6 max-w-xs mx-auto opacity-70">
                  {isCN ? "完善资料或开始匹配，寻找合适的对象" : "Start matching to find new friends based on your personality."}
                </p>
                <button
                  onClick={handleStartMatching}
                  className={`flex items-center px-6 py-2 rounded-full font-medium transition-all ${
                    isCN 
                    ? 'bg-[hsl(var(--cn-primary))] text-white hover:opacity-90' 
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg'
                  }`}
                >
                  {t.dashboard.startMatching} <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
