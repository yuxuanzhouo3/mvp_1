'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import {
  Heart,
  X,
  ArrowLeft,
  MapPin,
  Star,
  Gem,
  Rocket,
  Target,
  Gift,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Shield,
  Users,
  ChevronRight,
  Brain,
  MessageCircle
} from 'lucide-react';
import { AIPersonalityAnalysis, AIChatSimulation, AIUsageLimitDisplay } from '@/components/ai';
import { useLanguage } from '@/components/language-provider';
import { useTranslations, interpolate } from '@/lib/i18n';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { MatchScoreDetails } from '@/components/matching/MatchScoreDetails';
import { isChinaDeployment } from '@/lib/config/deployment.config';
import { cn } from '@/lib/utils';
import type { AlgorithmType, MatchResult } from '@/lib/matching/types';
import { RegionSwitch } from '@/components/region/RegionGuard';
import { CNProfileCard } from '@/components/cn/CNProfileCard';
import { INTLProfileCard } from '@/components/intl/INTLProfileCard';

interface Recommendation {
  id?: string;
  targetUser: {
    id: string;
    full_name?: string;
    username?: string;
    real_name?: string;
    avatar_url?: string;
    bio?: string;
    city_name?: string;
    age?: number;
    interests?: number[];
    education_level?: string;
    occupation?: string;
  } | null;
  matchScore: number;
  algorithmType: AlgorithmType;
  likedMe?: boolean; // 对方是否已经喜欢了我
  scoreDetails: {
    userBaseScore: number;
    targetBaseScore: number;
    similarityScore?: number;
    successRate?: number;
    aspirationScore?: number;
    randomFactor?: number;
    message?: string;
    mutualInterests?: number[];
    distance?: number;
  };
}

interface AlgorithmOption {
  key: AlgorithmType;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  hoverBg: string;
}

const algorithmOptions: AlgorithmOption[] = [
  {
    key: 'compatible',
    icon: <Gem className="h-6 w-6" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    hoverBg: 'hover:bg-amber-100',
  },
  {
    key: 'romantic',
    icon: <Rocket className="h-6 w-6" />,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    hoverBg: 'hover:bg-rose-100',
  },
  {
    key: 'pragmatic',
    icon: <Target className="h-6 w-6" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    hoverBg: 'hover:bg-green-100',
  },
  {
    key: 'serendipity',
    icon: <Gift className="h-6 w-6" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    hoverBg: 'hover:bg-purple-100',
  },
];

function MatchingPageContent() {
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = useTranslations(language);

  const getTargetUserName = useCallback(
    (targetUser: Recommendation['targetUser']) => {
      if (!targetUser) return t.matching.unknownUser;
      return (
        (targetUser as any).real_name ||
        (targetUser as any).username ||
        (targetUser as any).full_name ||
        t.matching.unknownUser
      );
    },
    [t.matching.unknownUser]
  );

  const [selectedAlgorithm, setSelectedAlgorithm] = useState<AlgorithmType>('compatible');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showAlgorithmSelector, setShowAlgorithmSelector] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showScoreDetails, setShowScoreDetails] = useState(false);
  const autoLoadedRef = useRef(false);
  const isCN = isChinaDeployment();
  const [algorithmNameOverrides, setAlgorithmNameOverrides] = useState<Partial<Record<AlgorithmType, string>>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/algorithm-names', {
          headers: { 'x-lang': language },
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setAlgorithmNameOverrides(data?.names || {});
      } catch {
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [language]);

  // Check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;
      try {
        const response = await fetch('/api/admin/check', { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          setIsAdmin(data.isAdmin || false);
        }
      } catch {
        setIsAdmin(false);
      }
    };
    if (user) {
      checkAdminStatus();
    }
  }, [user]);

  // 根据错误代码获取翻译后的错误消息
  const getErrorMessage = useCallback((errorCode: string): string => {
    const errors = (t.matching as { errors?: Record<string, string> }).errors;
    if (errors && errorCode in errors) {
      return errors[errorCode];
    }
    return t.matching.loadFailed;
  }, [t]);

  // 获取推荐列表
  const fetchRecommendations = useCallback(async (algorithm: AlgorithmType, forceRefresh = false) => {
    if (!user?.id) return;

    try {
      setGenerating(true);

      // 获取 session token 用于 CN 环境认证
      const token = session?.access_token;

      const response = await fetch('/api/matching/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          algorithm,
          limit: 20,
          forceRefresh
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.recommendations) {
          setRecommendations(data.data.recommendations);
          setCurrentIndex(0);
          setShowAlgorithmSelector(false);
        }
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.errorCode
          ? getErrorMessage(errorData.errorCode)
          : t.matching.loadFailed;
        toast({
          title: t.common.error,
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      toast({
        title: t.common.error,
        description: t.matching.networkError,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  }, [user?.id, session?.access_token, toast, t, getErrorMessage]);

  useEffect(() => {
    if (authLoading) return;

    if (!user || !user.id) {
      router.push('/auth/login');
      return;
    }

    setLoading(false);
  }, [user, authLoading, router]);

  useEffect(() => {
    if (autoLoadedRef.current) return;
    if (authLoading) return;
    if (!user?.id) return;

    const likedYou = searchParams?.get('likedYou');
    if (likedYou !== '1' && likedYou !== 'true') return;

    autoLoadedRef.current = true;
    setSelectedAlgorithm('compatible');
    fetchRecommendations('compatible');
  }, [authLoading, user?.id, searchParams, fetchRecommendations]);

  const handleAlgorithmSelect = (algorithm: AlgorithmType) => {
    setSelectedAlgorithm(algorithm);
    fetchRecommendations(algorithm);
  };

  const handleRefresh = () => {
    fetchRecommendations(selectedAlgorithm, true);
  };

  const handleLike = async () => {
    if (currentIndex >= recommendations.length) return;

    const rec = recommendations[currentIndex];
    if (!rec.targetUser) return;

    try {
      const token = session?.access_token;
      const response = await fetch('/api/matching/swipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          targetUserId: rec.targetUser.id,
          action: 'like',
          recommendationId: rec.id || null
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data?.isMatched) {
          toast({
            title: '🎉 ' + t.matching.matchSuccess,
            description: interpolate(t.matching.matchSuccessDesc, { name: getTargetUserName(rec.targetUser) }),
          });
        } else {
          toast({
            title: t.common.success,
            description: interpolate(t.matching.likeSuccessDesc, { name: getTargetUserName(rec.targetUser) }),
          });
        }
      }
    } catch (error) {
      console.error('Error liking candidate:', error);
    }

    setCurrentIndex(prev => prev + 1);
  };

  const handlePass = async () => {
    if (currentIndex >= recommendations.length) return;

    const rec = recommendations[currentIndex];
    if (!rec.targetUser) {
      setCurrentIndex(prev => prev + 1);
      return;
    }

    try {
      const token = session?.access_token;
      await fetch('/api/matching/swipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          targetUserId: rec.targetUser.id,
          action: 'pass',
          recommendationId: rec.id || null
        }),
      });
    } catch (error) {
      console.error('Error passing candidate:', error);
    }

    setCurrentIndex(prev => prev + 1);
  };

  const handleBackToSelector = () => {
    setShowAlgorithmSelector(true);
    setRecommendations([]);
    setCurrentIndex(0);
  };

  // 获取算法翻译
  const getAlgorithmTranslation = (key: AlgorithmType) => {
    const translations = t.matching.algorithms as Record<AlgorithmType, {
      name: string;
      shortDesc: string;
      description: string;
      persona: string;
    }>;
    return {
      ...translations[key],
      name: algorithmNameOverrides[key] || translations[key].name,
    };
  };

  // 获取分数详情显示
  const getScoreDetail = (rec: Recommendation) => {
    const details = rec.scoreDetails;
    switch (rec.algorithmType) {
      case 'compatible':
        return { label: t.matching.similarityScore, value: details.similarityScore || rec.matchScore };
      case 'romantic':
        return { label: t.matching.aspirationScore, value: details.aspirationScore || rec.matchScore };
      case 'pragmatic':
        return { label: t.matching.successRate, value: details.successRate || rec.matchScore };
      case 'serendipity':
        return { label: t.matching.randomFactor, value: details.randomFactor ? 50 + details.randomFactor : rec.matchScore };
      default:
        return { label: t.matching.matchScore, value: rec.matchScore };
    }
  };

  // 翻译学历
  const translateEducation = (education: string) => {
    const educationMap: Record<string, string> = {
      'high_school': t.profileSetup.education_high_school,
      'associate': t.profileSetup.education_associate,
      'bachelor': t.profileSetup.education_bachelor,
      'master': t.profileSetup.education_master,
      'doctorate': t.profileSetup.education_doctorate,
      // 兼容其他可能的格式
      'High School': t.profileSetup.education_high_school,
      'Associate Degree': t.profileSetup.education_associate,
      "Bachelor's Degree": t.profileSetup.education_bachelor,
      "Master's Degree": t.profileSetup.education_master,
      'Doctorate (PhD)': t.profileSetup.education_doctorate,
    };
    return educationMap[education] || education;
  };

  if (loading || authLoading || !mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const currentRecommendation = recommendations[currentIndex];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardSidebar user={user} isAdmin={isAdmin} />

      <main className="flex-1 w-full pt-0 pb-16 md:pt-0 md:pb-0 md:ml-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          {/* Page Header */}
          <div className="mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {!showAlgorithmSelector && (
                    <button
                      onClick={handleBackToSelector}
                      className="mr-4 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                  )}
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                      <Heart className="h-6 w-6 mr-2 text-blue-600" />
                      {t.matching.title}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      {showAlgorithmSelector ? t.matching.algorithmDesc : getAlgorithmTranslation(selectedAlgorithm).name}
                    </p>
                  </div>
                </div>
                {!showAlgorithmSelector && (
                  <button
                    onClick={handleRefresh}
                    disabled={generating}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
                    {generating ? t.matching.refreshing : t.matching.refreshRecommendations}
                  </button>
                )}
              </div>
            </div>
          </div>

          {showAlgorithmSelector ? (
            /* Algorithm Selector */
            <div className="space-y-4">
              {/* Algorithm Cards */}
              <div className="flex flex-col gap-4">
                {algorithmOptions.map((option) => {
                  const translation = getAlgorithmTranslation(option.key);
                  return (
                    <button
                      key={option.key}
                      onClick={() => handleAlgorithmSelect(option.key)}
                      disabled={generating}
                      className={`
                        relative bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border-2 transition-all duration-200
                        ${option.borderColor} ${option.hoverBg}
                        hover:shadow-md
                        disabled:opacity-50 disabled:cursor-not-allowed
                        text-left
                      `}
                    >
                      <div className="flex items-start space-x-4">
                        <div className={`flex-shrink-0 p-3 rounded-xl ${option.bgColor} ${option.color}`}>
                          {option.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{translation.name}</h3>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${option.bgColor} ${option.color}`}>
                              {translation.shortDesc}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {translation.description}
                          </p>
                          <div className="flex items-center text-xs text-gray-500 dark:text-gray-500">
                            <Users className="h-3.5 w-3.5 mr-1" />
                            {translation.persona}
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </button>
                  );
                })}
              </div>

              {generating && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600 dark:text-gray-400">{t.matching.generating}</p>
                </div>
              )}
            </div>
          ) : recommendations.length === 0 ? (
            /* No Recommendations */
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
              <Heart className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t.matching.noMatches}</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{t.matching.noMoreCandidatesDesc}</p>
              <button
                onClick={handleBackToSelector}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t.matching.selectAlgorithm}
              </button>
            </div>
          ) : currentIndex >= recommendations.length ? (
            /* All Viewed */
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
                <Heart className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t.matching.allCandidatesViewed}</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{t.matching.allCandidatesViewedDesc}</p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={handleRefresh}
                  disabled={generating}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {generating ? t.matching.refreshing : t.matching.refreshRecommendations}
                </button>
                <button
                  onClick={handleBackToSelector}
                  className="bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  {t.matching.selectAlgorithm}
                </button>
              </div>
            </div>
          ) : (
            /* Recommendation Card */
            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className={algorithmOptions.find(o => o.key === selectedAlgorithm)?.color}>
                      {algorithmOptions.find(o => o.key === selectedAlgorithm)?.icon}
                    </span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {getAlgorithmTranslation(selectedAlgorithm).name}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {interpolate(t.matching.progress, {
                      current: currentIndex + 1,
                      total: recommendations.length
                    })}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / recommendations.length) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Candidate Card */}
              {currentRecommendation?.targetUser && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                  {/* Avatar Section */}
                  <div className="relative">
                    <div className="w-full h-64 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      {currentRecommendation.targetUser.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={currentRecommendation.targetUser.avatar_url}
                          alt={getTargetUserName(currentRecommendation.targetUser) || 'User'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-28 h-28 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-5xl font-bold text-white">
                          {getTargetUserName(currentRecommendation.targetUser)?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                    </div>

                    {/* Match Score Badge */}
                    <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-lg px-4 py-2 shadow-lg">
                      <div className="flex items-center space-x-2">
                        <Star className="h-5 w-5 text-yellow-500" />
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {Math.round(currentRecommendation.matchScore)}%
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {t.matching.matchScore}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Algorithm Score Badge */}
                    <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 rounded-lg px-3 py-1.5 shadow-lg">
                      <div className="flex items-center space-x-1">
                        <span className={algorithmOptions.find(o => o.key === selectedAlgorithm)?.color}>
                          {React.cloneElement(
                            algorithmOptions.find(o => o.key === selectedAlgorithm)!.icon as React.ReactElement,
                            { className: 'h-4 w-4' }
                          )}
                        </span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {getScoreDetail(currentRecommendation).label}: {Math.round(getScoreDetail(currentRecommendation).value)}%
                        </span>
                      </div>
                    </div>

                    {/* Liked Me Badge */}
                    {currentRecommendation.likedMe && (
                      <div className="absolute bottom-4 left-4 bg-pink-500 text-white rounded-full px-4 py-2 shadow-lg animate-pulse">
                        <div className="flex items-center space-x-1">
                          <Heart className="h-4 w-4 fill-current" />
                          <span className="text-sm font-bold">{t.matching.likedYou}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Info Section */}
                  <div className="p-6">
                    {/* Name and Age */}
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {getTargetUserName(currentRecommendation.targetUser)}
                      </h2>
                      {currentRecommendation.targetUser.age && (
                        <span className="text-lg text-gray-600 dark:text-gray-400">
                          {interpolate(t.matching.yearsOld, { age: currentRecommendation.targetUser.age })}
                        </span>
                      )}
                    </div>

                    {/* Location & Education */}
                    <div className="flex flex-wrap gap-3 mb-4">
                      {currentRecommendation.targetUser.city_name && (
                        <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm">
                          <MapPin className="h-4 w-4 mr-1 text-blue-500" />
                          {currentRecommendation.targetUser.city_name}
                        </div>
                      )}
                      {currentRecommendation.targetUser.education_level && (
                        <div className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                          {translateEducation(currentRecommendation.targetUser.education_level)}
                        </div>
                      )}
                      {currentRecommendation.targetUser.occupation && (
                        <div className="px-2 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full">
                          {currentRecommendation.targetUser.occupation}
                        </div>
                      )}
                    </div>

                    {/* Bio */}
                    {currentRecommendation.targetUser.bio && (
                      <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                        {currentRecommendation.targetUser.bio}
                      </p>
                    )}

                    {/* Algorithm Message */}
                    {selectedAlgorithm && (
                      <div className={`
                        p-3 rounded-lg mb-4 text-sm
                        ${algorithmOptions.find(o => o.key === selectedAlgorithm)?.bgColor}
                        ${algorithmOptions.find(o => o.key === selectedAlgorithm)?.color}
                      `}>
                        <Sparkles className="h-4 w-4 inline mr-2" />
                        {(t.matching.scoreMessages as Record<AlgorithmType, string>)[selectedAlgorithm]}
                      </div>
                    )}

                    {/* AI Features Buttons */}
                    <div className="flex space-x-2 mb-4">
                      <button
                        onClick={() => setShowAIAnalysis(true)}
                        className="flex-1 flex items-center justify-center px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-all text-sm"
                      >
                        <Brain className="h-4 w-4 mr-2" />
                        {language === 'zh' ? 'AI性格分析' : 'AI Analysis'}
                      </button>
                      <button
                        onClick={() => setShowAIChat(true)}
                        className="flex-1 flex items-center justify-center px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-all text-sm"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        {language === 'zh' ? 'AI模拟对话' : 'AI Chat'}
                      </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-4">
                      <button
                        onClick={handlePass}
                        className="flex-1 flex items-center justify-center px-6 py-4 border-2 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 transition-all"
                      >
                        <X className="h-6 w-6 mr-2" />
                        {t.matching.pass}
                      </button>
                      <button
                        onClick={handleLike}
                        className="flex-1 flex items-center justify-center px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:shadow-lg transition-all"
                      >
                        <Heart className="h-6 w-6 mr-2" />
                        {t.matching.like}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* AI Personality Analysis Modal */}
      {showAIAnalysis && currentRecommendation?.targetUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <Brain className="h-5 w-5 mr-2 text-purple-600" />
                {language === 'zh' ? 'AI性格分析' : 'AI Personality Analysis'}
              </h2>
              <button
                onClick={() => setShowAIAnalysis(false)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <AIPersonalityAnalysis
                targetUserId={currentRecommendation.targetUser.id}
                targetUserName={getTargetUserName(currentRecommendation.targetUser)}
                language={language}
                onClose={() => setShowAIAnalysis(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* AI Chat Simulation Modal */}
      {showAIChat && currentRecommendation?.targetUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <MessageCircle className="h-5 w-5 mr-2 text-indigo-600" />
                {language === 'zh' ? 'AI模拟对话' : 'AI Chat Simulation'}
              </h2>
              <button
                onClick={() => setShowAIChat(false)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <AIChatSimulation
                targetUserId={currentRecommendation.targetUser.id}
                targetUserName={getTargetUserName(currentRecommendation.targetUser)}
                targetUserAvatar={currentRecommendation.targetUser.avatar_url}
                language={language}
                onClose={() => setShowAIChat(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Match Score Details Modal */}
      {showScoreDetails && currentRecommendation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                {language === 'zh' ? '匹配详情' : 'Match Details'}
              </h2>
              <button
                onClick={() => setShowScoreDetails(false)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <MatchScoreDetails
                matchResult={{
                  targetUserId: currentRecommendation.targetUser?.id || '',
                  matchScore: currentRecommendation.matchScore,
                  algorithmType: currentRecommendation.algorithmType,
                  scoreDetails: currentRecommendation.scoreDetails
                }}
                algorithmNameOverrides={algorithmNameOverrides}
                showChart={true}
                defaultExpanded={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MatchingPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    }>
      <MatchingPageContent />
    </Suspense>
  );
}
