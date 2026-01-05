/**
 * Score Badge Component - 评分徽章组件
 * 显示用户评分等级 (S/A/B/C/D)
 */

'use client';

import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { getScoreGrade, getGradeColor, getGradeBgColor } from '@/lib/percentile';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';

// ========================================
// 类型定义
// ========================================

interface ScoreBadgeProps {
  /** 总分 (0-100) */
  totalScore: number;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** 是否显示分数 */
  showScore?: boolean;
  /** 是否显示等级文字 */
  showLabel?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 悬浮提示内容 */
  tooltipContent?: string;
}

// ========================================
// 常量
// ========================================

/** 尺寸配置 */
const SIZE_CONFIG = {
  sm: {
    badge: 'h-6 w-6 text-xs',
    score: 'text-xs',
    label: 'text-xs'
  },
  md: {
    badge: 'h-8 w-8 text-sm',
    score: 'text-sm',
    label: 'text-sm'
  },
  lg: {
    badge: 'h-10 w-10 text-base',
    score: 'text-base',
    label: 'text-base'
  },
  xl: {
    badge: 'h-14 w-14 text-xl',
    score: 'text-lg',
    label: 'text-lg'
  }
};

// ========================================
// 主组件
// ========================================

function ScoreBadgeComponent({
  totalScore,
  size = 'md',
  showScore = false,
  showLabel = false,
  className,
  tooltipContent
}: ScoreBadgeProps) {
  const { language } = useLanguage();
  const t = useTranslations(language);

  // 计算等级
  const grade = useMemo(() => getScoreGrade(totalScore), [totalScore]);
  const gradeColor = useMemo(() => getGradeColor(grade), [grade]);
  const gradeBgColor = useMemo(() => getGradeBgColor(grade), [grade]);

  const sizeConfig = SIZE_CONFIG[size];

  // 获取翻译后的等级描述
  const gradeDescriptions: Record<'S' | 'A' | 'B' | 'C' | 'D', string> = {
    S: t.marketValue.gradeDescriptions.S,
    A: t.marketValue.gradeDescriptions.A,
    B: t.marketValue.gradeDescriptions.B,
    C: t.marketValue.gradeDescriptions.C,
    D: t.marketValue.gradeDescriptions.D,
  };
  const description = gradeDescriptions[grade];

  // 获取翻译后的等级标签
  const gradeLabels: Record<'S' | 'A' | 'B' | 'C' | 'D', string> = {
    S: t.marketValue.gradeLabels.excellent,
    A: t.marketValue.gradeLabels.veryGood,
    B: t.marketValue.gradeLabels.good,
    C: t.marketValue.gradeLabels.fair,
    D: t.marketValue.gradeLabels.improve,
  };

  // 获取渐变背景样式
  const getGradientStyle = () => {
    switch (grade) {
      case 'S':
        return 'bg-gradient-to-br from-amber-400 to-yellow-600';
      case 'A':
        return 'bg-gradient-to-br from-purple-400 to-purple-600';
      case 'B':
        return 'bg-gradient-to-br from-blue-400 to-blue-600';
      case 'C':
        return 'bg-gradient-to-br from-green-400 to-green-600';
      case 'D':
        return 'bg-gradient-to-br from-gray-400 to-gray-600';
    }
  };

  return (
    <div
      className={cn('flex items-center gap-2', className)}
      title={tooltipContent || description}
    >
      {/* 等级徽章 */}
      <div
        className={cn(
          'flex items-center justify-center rounded-full font-bold text-white shadow-md',
          getGradientStyle(),
          sizeConfig.badge
        )}
      >
        {grade}
      </div>

      {/* 分数显示 */}
      {showScore && (
        <span className={cn('font-semibold', gradeColor, sizeConfig.score)}>
          {totalScore.toFixed(1)}
        </span>
      )}

      {/* 等级标签 */}
      {showLabel && (
        <Badge
          variant="outline"
          className={cn('border', gradeBgColor, gradeColor, sizeConfig.label)}
        >
          {gradeLabels[grade]}
        </Badge>
      )}
    </div>
  );
}

// 使用memo优化性能
export const ScoreBadge = memo(ScoreBadgeComponent);

// ========================================
// 紧凑版徽章（用于列表）
// ========================================

interface CompactScoreBadgeProps {
  totalScore: number;
  className?: string;
}

function CompactScoreBadgeComponent({ totalScore, className }: CompactScoreBadgeProps) {
  const grade = getScoreGrade(totalScore);
  
  const getCompactStyle = () => {
    switch (grade) {
      case 'S':
        return 'bg-amber-500 text-white';
      case 'A':
        return 'bg-purple-500 text-white';
      case 'B':
        return 'bg-blue-500 text-white';
      case 'C':
        return 'bg-green-500 text-white';
      case 'D':
        return 'bg-gray-500 text-white';
    }
  };
  
  return (
    <Badge 
      className={cn(
        'px-1.5 py-0.5 text-xs font-bold',
        getCompactStyle(),
        className
      )}
    >
      {grade}
    </Badge>
  );
}

export const CompactScoreBadge = memo(CompactScoreBadgeComponent);

// ========================================
// 详细评分卡片
// ========================================

interface ScoreCardProps {
  totalScore: number;
  percentile: number;
  className?: string;
}

function ScoreCardComponent({ totalScore, percentile, className }: ScoreCardProps) {
  const { language } = useLanguage();
  const t = useTranslations(language);

  const grade = getScoreGrade(totalScore);
  const gradeColor = getGradeColor(grade);

  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700',
        className
      )}
    >
      <ScoreBadge totalScore={totalScore} size="xl" />

      <div className="flex-1">
        <div className="flex items-baseline gap-2">
          <span className={cn('text-2xl font-bold', gradeColor)}>
            {totalScore.toFixed(1)}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t.marketValue.outOf100}
          </span>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          {t.marketValue.outperformsUsers.replace('{percentile}', String(percentile))}
        </p>
      </div>
    </div>
  );
}

export const ScoreCard = memo(ScoreCardComponent);

export default ScoreBadge;

