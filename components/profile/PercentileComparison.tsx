/**
 * Percentile Comparison Component - 百分位对比组件
 * 显示用户在同性别中的排名
 */

'use client';

import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, Award } from 'lucide-react';
import { getScoreRanking } from '@/lib/percentile-client';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';

// ========================================
// 类型定义
// ========================================

interface PercentileComparisonProps {
  /** 百分位 (0-100) */
  percentile: number;
  /** 用户总分 */
  totalScore: number;
  /** 同性别平均分 */
  averageScore?: number;
  /** 同性别用户总数 */
  totalUsers?: number;
  /** 自定义类名 */
  className?: string;
}

// ========================================
// 辅助函数
// ========================================

function getPercentileColor(percentile: number): string {
  if (percentile >= 90) return 'text-amber-500';
  if (percentile >= 75) return 'text-purple-500';
  if (percentile >= 50) return 'text-blue-500';
  if (percentile >= 25) return 'text-green-500';
  return 'text-gray-500';
}

function getProgressGradient(percentile: number): string {
  if (percentile >= 90) return 'from-amber-400 to-amber-600';
  if (percentile >= 75) return 'from-purple-400 to-purple-600';
  if (percentile >= 50) return 'from-blue-400 to-blue-600';
  if (percentile >= 25) return 'from-green-400 to-green-600';
  return 'from-gray-400 to-gray-600';
}

// ========================================
// 主组件
// ========================================

function PercentileComparisonComponent({
  percentile,
  totalScore,
  averageScore,
  totalUsers,
  className
}: PercentileComparisonProps) {
  const { language } = useLanguage();
  const t = useTranslations(language);

  const ranking = useMemo(() => getScoreRanking(percentile), [percentile]);
  const percentileColor = useMemo(() => getPercentileColor(percentile), [percentile]);
  const progressGradient = useMemo(() => getProgressGradient(percentile), [percentile]);

  // 计算与平均分的差距
  const scoreDiff = averageScore ? (totalScore - averageScore).toFixed(1) : null;
  const isAboveAverage = scoreDiff && parseFloat(scoreDiff) > 0;

  // 获取激励文案
  const getMotivationMessage = () => {
    if (percentile >= 90) return t.marketValue.ranking.congratsTop;
    if (percentile >= 70) return t.marketValue.ranking.greatJob;
    if (percentile >= 50) return t.marketValue.ranking.doingWell;
    return t.marketValue.ranking.completeToImprove;
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-500" />
            {t.marketValue.ranking.title}
          </CardTitle>
          <span className={cn('text-sm font-medium', percentileColor)}>
            {ranking}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 百分位进度条 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t.marketValue.ranking.youOutperform}
            </span>
            <span className={cn('text-2xl font-bold', percentileColor)}>
              {percentile}%
            </span>
          </div>

          <div className="relative h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full bg-gradient-to-r transition-all duration-500',
                progressGradient
              )}
              style={{ width: `${percentile}%` }}
            />
            {/* 标记点 */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md border-2 border-blue-500 transition-all duration-500"
              style={{ left: `calc(${percentile}% - 8px)` }}
            />
          </div>

          {/* 刻度标记 */}
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-400">0%</span>
            <span className="text-xs text-gray-400">25%</span>
            <span className="text-xs text-gray-400">50%</span>
            <span className="text-xs text-gray-400">75%</span>
            <span className="text-xs text-gray-400">100%</span>
          </div>
        </div>

        {/* 统计信息 */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100 dark:border-gray-700">
          {/* 与平均分对比 */}
          {averageScore !== undefined && (
            <div className="flex items-center gap-3">
              <div className={cn(
                'p-2 rounded-lg',
                isAboveAverage
                  ? 'bg-green-50 dark:bg-green-900/20'
                  : 'bg-orange-50 dark:bg-orange-900/20'
              )}>
                <TrendingUp className={cn(
                  'w-4 h-4',
                  isAboveAverage
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-orange-600 dark:text-orange-400 rotate-180'
                )} />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t.marketValue.ranking.vsAverage}
                </p>
                <p className={cn(
                  'text-sm font-semibold',
                  isAboveAverage ? 'text-green-600' : 'text-orange-600'
                )}>
                  {isAboveAverage ? '+' : ''}{scoreDiff}
                </p>
              </div>
            </div>
          )}

          {/* 用户总数 */}
          {totalUsers !== undefined && (
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t.marketValue.ranking.totalUsers}
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {totalUsers.toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 激励文案 */}
        <div className="pt-2">
          <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
            {getMotivationMessage()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// 使用memo优化性能
export const PercentileComparison = memo(PercentileComparisonComponent);

// ========================================
// 简化版百分位显示
// ========================================

interface SimplePercentileProps {
  percentile: number;
  className?: string;
}

function SimplePercentileComponent({ percentile, className }: SimplePercentileProps) {
  const percentileColor = getPercentileColor(percentile);
  
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${percentile}%` }}
        />
      </div>
      <span className={cn('text-sm font-medium whitespace-nowrap', percentileColor)}>
        Top {100 - percentile}%
      </span>
    </div>
  );
}

export const SimplePercentile = memo(SimplePercentileComponent);

export default PercentileComparison;

