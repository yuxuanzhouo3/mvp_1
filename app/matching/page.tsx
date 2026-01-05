'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  ChevronRight
} from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { useTranslations, interpolate } from '@/lib/i18n';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import type { AlgorithmType } from '@/lib/matching/types';

interface Recommendation {
  id?: string;
  targetUser: {
    id: string;
    full_name: string;
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

export default function MatchingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = useTranslations(language);

  const [selectedAlgorithm, setSelectedAlgorithm] = useState<AlgorithmType>('compatible');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showAlgorithmSelector, setShowAlgorithmSelector] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;
      try {
        const response = await fetch('/api/admin/check');
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

  // 获取推荐列表
  const fetchRecommendations = useCallback(async (algorithm: AlgorithmType, forceRefresh = false) => {
    if (!user?.id) return;

    try {
      setGenerating(true);

      const response = await fetch('/api/matching/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        toast({
          title: t.common.error,
          description: errorData.error || t.matching.loadFailed,
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
  }, [user?.id, toast, t]);

  useEffect(() => {
    if (authLoading) return;

    if (!user || !user.id) {
      router.push('/auth/login');
      return;
    }

    setLoading(false);
  }, [user, authLoading, router]);

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
      const response = await fetch('/api/matching/swipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_id: rec.targetUser.id,
          action: 'like'
        }),
      });

      if (response.ok) {
        toast({
          title: t.common.success,
          description: interpolate(t.matching.likeSuccessDesc, { name: rec.targetUser.full_name || 'TA' }),
        });
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
      await fetch('/api/matching/swipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_id: rec.targetUser.id,
          action: 'pass'
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
    return translations[key];
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

      <main className="flex-1 w-full">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
                        <img
                          src={currentRecommendation.targetUser.avatar_url}
                          alt={currentRecommendation.targetUser.full_name || 'User'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-28 h-28 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-5xl font-bold text-white">
                          {currentRecommendation.targetUser.full_name?.charAt(0).toUpperCase() || '?'}
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
                  </div>

                  {/* Info Section */}
                  <div className="p-6">
                    {/* Name and Age */}
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {currentRecommendation.targetUser.full_name}
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
                          {currentRecommendation.targetUser.education_level}
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
                    {currentRecommendation.scoreDetails.message && (
                      <div className={`
                        p-3 rounded-lg mb-6 text-sm
                        ${algorithmOptions.find(o => o.key === selectedAlgorithm)?.bgColor}
                        ${algorithmOptions.find(o => o.key === selectedAlgorithm)?.color}
                      `}>
                        <Sparkles className="h-4 w-4 inline mr-2" />
                        {currentRecommendation.scoreDetails.message}
                      </div>
                    )}

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
    </div>
  );
}
