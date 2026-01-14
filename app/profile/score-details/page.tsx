/**
 * Score Details Page - 评分详情页
 * 显示完整的评分报告和改进建议
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';
import { useMarketValue } from '@/hooks/useMarketValue';
import { getWeights } from '@/lib/scoring';
import { getScoreStatistics } from '@/lib/percentile';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
import {
  RefreshCw,
  Share2,
  TrendingUp,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

// Score Components
import { MarketValueRadar } from '@/components/profile/MarketValueRadar';
import { ScoreCard } from '@/components/profile/ScoreBadge';
import { FactorList } from '@/components/profile/FactorDetailCard';
import { PercentileComparison } from '@/components/profile/PercentileComparison';
import { ImprovementSuggestions } from '@/components/profile/ImprovementSuggestions';

// ========================================
// Loading Skeleton
// ========================================

function ScoreDetailsSkeleton() {
  const { language } = useLanguage();
  const t = useTranslations(language);

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">{t.common.loading}</p>
      </div>
    </div>
  );
}

// ========================================
// Main Component
// ========================================

export default function ScoreDetailsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = useTranslations(language);

  // State
  const [averageScore, setAverageScore] = useState<number | undefined>();
  const [totalUsers, setTotalUsers] = useState<number | undefined>();
  const [isAdmin, setIsAdmin] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Get market value score
  const {
    score,
    isLoading,
    isRecalculating,
    error,
    recalculateScore,
    refetch
  } = useMarketValue({
    userId: user?.id || '',
    enabled: !!user?.id
  });

  // Get weights for current user's gender (default to compatible_match algorithm)
  const weights = score?.scoreBreakdown
    ? getWeights('compatible_match', 'male', 'female')
    : null;

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Load statistics
  useEffect(() => {
    async function loadStats() {
      const stats = await getScoreStatistics();
      if (stats) {
        setAverageScore(stats.avgScore);
        setTotalUsers(stats.totalUsers);
      }
    }
    loadStats();
  }, []);

  // Handle recalculate
  const handleRecalculate = async () => {
    try {
      await recalculateScore();
      toast({
        title: t.marketValue.scoreUpdated,
        description: t.marketValue.scoreUpdatedDesc,
      });
    } catch (err) {
      toast({
        title: t.marketValue.updateFailed,
        description: t.marketValue.updateFailedDesc,
        variant: 'destructive',
      });
    }
  };

  // Handle share (placeholder)
  const handleShare = () => {
    toast({
      title: t.marketValue.comingSoon,
      description: t.marketValue.shareComingSoon,
    });
  };

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  // Loading state
  if (authLoading || isLoading || !mounted) {
    return <ScoreDetailsSkeleton />;
  }

  // No user
  if (!user) {
    return null;
  }

  // No score yet
  if (!score) {
    return (
      <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 dark:bg-gray-900">
        <DashboardSidebar user={user} isAdmin={isAdmin} />

        <main className="flex-1 w-full pt-14 md:pt-0">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            {/* Page Header */}
            <div className="mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                  <TrendingUp className="h-6 w-6 mr-2 text-blue-600" />
                  {t.marketValue.title}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {t.marketValue.subtitle}
                </p>
              </div>
            </div>

            {/* No Score Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
                <TrendingUp className="h-10 w-10 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {t.marketValue.noScore}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {t.marketValue.noScoreDesc}
              </p>
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => router.push('/profile/edit')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {t.marketValue.completeProfile}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRecalculate}
                  disabled={isRecalculating}
                >
                  {isRecalculating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      {t.marketValue.calculating}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {t.marketValue.calculateNow}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardSidebar user={user} isAdmin={isAdmin} />

      <main className="flex-1 w-full pt-14 md:pt-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          {/* Page Header */}
          <div className="mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                    <TrendingUp className="h-6 w-6 mr-2 text-blue-600" />
                    {t.marketValue.title}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    {t.marketValue.subtitle}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRecalculate}
                    disabled={isRecalculating}
                  >
                    {isRecalculating ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    <span className="ml-2 hidden sm:inline">
                      {t.marketValue.recalculate}
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShare}
                  >
                    <Share2 className="h-4 w-4" />
                    <span className="ml-2 hidden sm:inline">
                      {t.marketValue.share}
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Score Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Main Score Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <ScoreCard
                totalScore={score.totalScore}
                percentile={score.percentile}
              />
            </div>

            {/* Percentile Comparison */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <PercentileComparison
                percentile={score.percentile}
                totalScore={score.totalScore}
                averageScore={averageScore}
                totalUsers={totalUsers}
              />
            </div>
          </div>

          {/* Radar Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-6">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                {t.marketValue.scoreBreakdown}
                <Button variant="ghost" size="icon" className="h-5 w-5 ml-2">
                  <Info className="h-4 w-4" />
                </Button>
              </h2>
            </div>
            <div className="p-6 flex justify-center">
              <MarketValueRadar
                scoreBreakdown={score.scoreBreakdown}
                size="lg"
              />
            </div>
          </div>

          {/* Improvement Suggestions */}
          {weights && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-6">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t.marketValue.improvementSuggestions}
                </h2>
              </div>
              <div className="p-6">
                <ImprovementSuggestions
                  scoreBreakdown={score.scoreBreakdown}
                  weights={weights}
                  maxSuggestions={5}
                  onImproveClick={(factor) => {
                    router.push('/profile/edit');
                  }}
                />
              </div>
            </div>
          )}

          {/* Factor Details */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-6">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t.marketValue.allFactors}
              </h2>
            </div>
            <div className="p-6">
              {weights && (
                <FactorList
                  scoreBreakdown={score.scoreBreakdown}
                  weights={weights}
                />
              )}
            </div>
          </div>

          {/* Score History (Placeholder) */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t.marketValue.scoreHistory}
              </h2>
            </div>
            <div className="p-12 text-center">
              <TrendingUp className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {t.marketValue.scoreHistoryComingSoon}
              </p>
            </div>
          </div>

          {/* Last Updated */}
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            {t.marketValue.lastCalculated}
            {new Date(score.calculatedAt).toLocaleString()}
            <br />
            {t.marketValue.version}{score.version}
          </p>
        </div>
      </main>
    </div>
  );
}
