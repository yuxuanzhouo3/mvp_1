'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/lib/supabase/client';
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
  ArrowLeft,
  Calendar,
  Ruler,
  GraduationCap,
  Briefcase,
  Brain
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { useLanguage } from '@/components/language-provider';
import { useTranslations, interpolate } from '@/lib/i18n';

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
  const { language } = useLanguage();
  const t = useTranslations(language);

  // Use shared Supabase client singleton
  const supabase = getSupabaseClient();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);

  // Use refs to prevent multiple calls and track initialization
  const hasLoadedRef = useRef(false);
  const isRedirectingRef = useRef(false);

  const loadDashboardData = useCallback(async (userId: string) => {
    // Prevent multiple simultaneous calls
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    try {
      setLoading(true);

      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        console.error('No session token available');
        setLoading(false);
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
      console.log('❌ No user found in dashboard, redirecting to login');
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
  }, [user?.id, authLoading, loadDashboardData, router]);

  // Separate effect for profile setup redirect - with debounce
  useEffect(() => {
    // Only check after loading is complete and we have a user
    if (loading || authLoading || !user || isRedirectingRef.current) {
      return;
    }

    // If profile is null after loading, redirect to setup
    if (profile === null && hasLoadedRef.current) {
      console.log('📋 No profile found, redirecting to profile setup');
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

  if (!profile) {
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
    try {
      await signOut();
      window.location.href = '/auth/login';
      toast({
        title: t.header.logout,
        description: t.auth.login.welcomeBack,
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: t.auth.login.loginFailed,
        description: t.dashboard.tryLater,
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
                        {t.header.settings}
                      </button>
                      <button
                        onClick={() => router.push('/dashboard/notifications')}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        {t.header.notifications}
                      </button>
                      <hr className="my-1" />
                      <button
                        onClick={handleSignOut}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                      >
                        {t.header.logout}
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
              {t.dashboard.sidebar.home}
            </button>
            <button
              onClick={() => { router.push('/chat'); setShowSidebar(false); }}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900"
            >
              <MessageSquare className="mr-3 h-5 w-5" />
              {t.dashboard.sidebar.chat}
            </button>
            <button
              onClick={() => { router.push('/matching'); setShowSidebar(false); }}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900"
            >
              <Heart className="mr-3 h-5 w-5" />
              {t.dashboard.sidebar.matching}
            </button>
            <button
              onClick={() => { router.push('/payment/recharge'); setShowSidebar(false); }}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900"
            >
              <CreditCard className="mr-3 h-5 w-5" />
              {t.dashboard.sidebar.recharge}
            </button>
            <button
              onClick={() => { router.push('/dashboard/settings'); setShowSidebar(false); }}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900"
            >
              <Settings className="mr-3 h-5 w-5" />
              {t.dashboard.sidebar.settings}
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
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  {t.dashboard.profile.title}
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
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <CreditCard className="mr-2 h-5 w-5" />
                  {t.dashboard.credits.title}
                </h3>
              </div>
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="text-5xl font-bold text-blue-600 mb-1">{profile.credits}</div>
                  <p className="text-gray-500 text-sm">{t.dashboard.credits.availableCredits}</p>
                </div>

                {/* Credits Usage Info */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">{t.dashboard.credits.matchCost || 'Per Match'}</span>
                    <span className="font-semibold text-gray-900">10 {t.dashboard.credits.creditsUnit || 'credits'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">{t.dashboard.credits.messageCost || 'Per Message'}</span>
                    <span className="font-semibold text-gray-900">1 {t.dashboard.credits.creditsUnit || 'credit'}</span>
                  </div>
                  <div className="border-t border-gray-200 mt-3 pt-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{t.dashboard.credits.estimatedMatches || 'Estimated Matches'}</span>
                      <span className="font-semibold text-gray-900">{Math.floor(profile.credits / 10)}</span>
                    </div>
                  </div>
                </div>

                {/* Low Balance Warning */}
                {profile.credits < 20 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex items-center">
                    <span className="text-yellow-700 text-sm">
                      ⚠️ {t.dashboard.credits.lowBalance || 'Low balance! Recharge to continue matching.'}
                    </span>
                  </div>
                )}

                <button
                  onClick={handleRechargeCredits}
                  className="w-full px-4 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center justify-center font-semibold border border-blue-200"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  {t.dashboard.credits.rechargeCredits}
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
                        onClick={() => router.push(`/chat/${match.id}`)}
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
    </div>
  );
}
