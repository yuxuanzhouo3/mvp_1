/**
 * Score Details Page - 评分详情页
 * 显示完整的评分报告和改进建议
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';
import { useMarketValue } from '@/hooks/useMarketValue';
import { getWeights } from '@/lib/scoring-core';
import { getScoreStatistics } from '@/lib/percentile-client';
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
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

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

function formatDateYYYYMMDD(input: Date | string | number): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
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

  const [scoreHistory, setScoreHistory] = useState<
    {
      id: string;
      total_score: number;
      percentile: number | null;
      score_breakdown: any;
      calculated_at: string;
      version: string | null;
      algorithm: string | null;
    }[]
  >([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

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
      await fetchScoreHistory();
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

  const fetchScoreHistory = useCallback(async () => {
    if (!user?.id) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await fetch('/api/user/market-value/history?limit=60', { cache: 'no-store' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to fetch score history');
      }
      const data = await response.json();
      if (data?.success && Array.isArray(data.data)) {
        setScoreHistory(data.data);
        return;
      }
      throw new Error('Failed to fetch score history');
    } catch (err: any) {
      setHistoryError(err?.message || 'Failed to fetch score history');
    } finally {
      setHistoryLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchScoreHistory();
  }, [fetchScoreHistory]);

  const historyChartData = useMemo(() => {
    return [...scoreHistory]
      .reverse()
      .map((row) => ({
        date: formatDateYYYYMMDD(row.calculated_at),
        totalScore: row.total_score,
        percentile: row.percentile ?? null,
      }));
  }, [scoreHistory]);

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

          {/* Skip Default Notice */}
          {score.version === 'skip-default' && (
            <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 flex items-start gap-3">
              <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  {language === 'zh' ? '当前为跳过资料填写的默认评分' : 'Default score from skipped profile setup'}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  {language === 'zh'
                    ? '您跳过了资料填写，系统为您设置了默认评分（60分）。完善资料后可重新计算获得更准确的评分。'
                    : 'You skipped profile setup. The system assigned a default score (60). Complete your profile to get an accurate score.'}
                </p>
                <Button
                  size="sm"
                  className="mt-2 bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => router.push('/profile/edit')}
                >
                  {language === 'zh' ? '去完善资料' : 'Complete Profile'}
                </Button>
              </div>
            </div>
          )}

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
                {score.version === 'skip-default' && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    skip-default
                  </span>
                )}
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
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t.marketValue.allFactors}
                </h2>
                {score.version === 'skip-default' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    skip-default
                  </span>
                )}
              </div>
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

          {/* Score History */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t.marketValue.scoreHistory}
              </h2>
            </div>
            <div className="p-6">
              {historyLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : historyError ? (
                <div className="text-sm text-red-600 dark:text-red-400">
                  {historyError}
                </div>
              ) : scoreHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <TrendingUp className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                  <p>{language === 'zh' ? '暂无历史记录' : 'No history yet'}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historyChartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="totalScore" name={language === 'zh' ? '总分' : 'Total'} stroke="#2563eb" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="percentile" name={language === 'zh' ? '百分位' : 'Percentile'} stroke="#7c3aed" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-3 gap-2 bg-gray-50 dark:bg-gray-900 px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                      <div>{language === 'zh' ? '时间' : 'Date'}</div>
                      <div className="text-right">{language === 'zh' ? '总分' : 'Score'}</div>
                      <div className="text-right">{language === 'zh' ? '百分位' : 'Percentile'}</div>
                    </div>
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {scoreHistory.slice(0, 20).map((row) => (
                        <div key={row.id} className="grid grid-cols-3 gap-2 px-4 py-2 text-sm">
                          <div className="text-gray-700 dark:text-gray-300">
                            {formatDateYYYYMMDD(row.calculated_at)}
                          </div>
                          <div className="text-right text-gray-900 dark:text-white">
                            {Math.round(row.total_score)}
                          </div>
                          <div className="text-right text-gray-900 dark:text-white">
                            {row.percentile === null ? '-' : Math.round(row.percentile)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Last Updated */}
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            {t.marketValue.lastCalculated}
            {formatDateYYYYMMDD(score.calculatedAt)}
            <br />
            {t.marketValue.version}{score.version}
          </p>
        </div>
      </main>
    </div>
  );
}
