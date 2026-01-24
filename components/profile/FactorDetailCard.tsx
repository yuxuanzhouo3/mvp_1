/**
 * Factor Detail Card Component - 因子详情卡片组件
 * 显示单个评分因子的详细信息
 */

'use client';

import { memo, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  ChevronUp,
  DollarSign,
  GraduationCap,
  Calendar,
  Heart,
  Smile,
  Users,
  Brain,
  Briefcase,
  MapPin,
  Baby
} from 'lucide-react';
import { ScoringFactor, type WeightConfig } from '@/lib/scoring-core';
import type { ScoreBreakdown } from '@/lib/scoring';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';

// ========================================
// 类型定义
// ========================================

interface FactorDetailCardProps {
  /** 因子类型 */
  factor: ScoringFactor;
  /** 因子分数 (0-100) */
  score: number;
  /** 权重 (0-1) */
  weight: number;
  /** 是否显示提升建议 */
  showSuggestion?: boolean;
  /** 是否可展开 */
  expandable?: boolean;
  /** 自定义类名 */
  className?: string;
}

// ========================================
// 常量
// ========================================

/** 因子图标映射 */
const FACTOR_ICONS: Record<ScoringFactor, React.ComponentType<{ className?: string }>> = {
  [ScoringFactor.WEALTH]: DollarSign,
  [ScoringFactor.EDUCATION]: GraduationCap,
  [ScoringFactor.AGE]: Calendar,
  [ScoringFactor.BMI]: Heart,
  [ScoringFactor.APPEARANCE]: Smile,
  [ScoringFactor.RELATIONSHIP_HISTORY]: Users,
  [ScoringFactor.PERSONALITY]: Brain,
  [ScoringFactor.JOB_STABILITY]: Briefcase,
  [ScoringFactor.LOCATION]: MapPin,
  [ScoringFactor.CHILDREN_PREFERENCE]: Baby,
};

/** 因子键名映射 */
const FACTOR_KEYS: Record<ScoringFactor, keyof typeof import('@/lib/i18n/translations/en').en.marketValue.factors> = {
  [ScoringFactor.WEALTH]: 'wealth',
  [ScoringFactor.EDUCATION]: 'education',
  [ScoringFactor.AGE]: 'age',
  [ScoringFactor.BMI]: 'bmi',
  [ScoringFactor.APPEARANCE]: 'appearance',
  [ScoringFactor.RELATIONSHIP_HISTORY]: 'relationshipHistory',
  [ScoringFactor.PERSONALITY]: 'personality',
  [ScoringFactor.JOB_STABILITY]: 'jobStability',
  [ScoringFactor.LOCATION]: 'location',
  [ScoringFactor.CHILDREN_PREFERENCE]: 'childrenPreference',
};

// ========================================
// 辅助函数
// ========================================

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-amber-500';
  if (score >= 80) return 'text-purple-500';
  if (score >= 70) return 'text-blue-500';
  if (score >= 60) return 'text-green-500';
  return 'text-gray-500';
}

function getProgressColor(score: number): string {
  if (score >= 90) return 'bg-amber-500';
  if (score >= 80) return 'bg-purple-500';
  if (score >= 70) return 'bg-blue-500';
  if (score >= 60) return 'bg-green-500';
  return 'bg-gray-500';
}

// ========================================
// 主组件
// ========================================

function FactorDetailCardComponent({
  factor,
  score,
  weight,
  showSuggestion = true,
  expandable = true,
  className
}: FactorDetailCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { language } = useLanguage();
  const t = useTranslations(language);

  const factorKey = FACTOR_KEYS[factor];
  const factorTranslation = t.marketValue.factors[factorKey];
  const Icon = FACTOR_ICONS[factor];

  const weightPercent = useMemo(() => Math.round(weight * 100), [weight]);
  const needsImprovement = score < 70;

  return (
    <Card
      className={cn(
        'transition-all duration-200',
        expandable && 'cursor-pointer hover:shadow-md',
        className
      )}
      onClick={() => expandable && setIsExpanded(!isExpanded)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              score >= 70
                ? 'bg-blue-50 dark:bg-blue-900/20'
                : 'bg-orange-50 dark:bg-orange-900/20'
            )}>
              <Icon className={cn(
                'w-5 h-5',
                score >= 70
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-orange-600 dark:text-orange-400'
              )} />
            </div>

            <div>
              <CardTitle className="text-sm font-medium">
                {factorTranslation.name}
              </CardTitle>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t.marketValue.suggestions.weight}: {weightPercent}%
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={cn('text-xl font-bold', getScoreColor(score))}>
              {score}
            </span>

            {expandable && (
              isExpanded
                ? <ChevronUp className="w-4 h-4 text-gray-400" />
                : <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {/* 进度条 */}
        <div className="relative h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={cn('h-full transition-all duration-500', getProgressColor(score))}
            style={{ width: `${score}%` }}
          />
        </div>

        {/* 描述 */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          {factorTranslation.description}
        </p>

        {/* 展开内容 */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            {/* 提升建议（仅当分数低于70时显示） */}
            {showSuggestion && needsImprovement && (
              <div className="mb-4">
                <Badge variant="outline" className="mb-2 bg-orange-50 text-orange-600 border-orange-200">
                  {t.marketValue.improvementTips}
                </Badge>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {factorTranslation.suggestion}
                </p>
              </div>
            )}

            {/* 改进提示列表 */}
            <ul className="space-y-2">
              {factorTranslation.tips.map((tip: string, index: number) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300"
                >
                  <span className="text-blue-500 mt-0.5">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 使用memo优化性能
export const FactorDetailCard = memo(FactorDetailCardComponent);

// ========================================
// 因子列表组件
// ========================================

interface FactorListProps {
  scoreBreakdown: ScoreBreakdown;
  weights: WeightConfig | Record<string, number>;
  className?: string;
}

function FactorListComponent({ scoreBreakdown, weights, className }: FactorListProps) {
  // 按分数排序因子
  const sortedFactors = useMemo(() => {
    const factorMap: { factor: ScoringFactor; key: keyof ScoreBreakdown }[] = [
      { factor: ScoringFactor.WEALTH, key: 'wealth' },
      { factor: ScoringFactor.EDUCATION, key: 'education' },
      { factor: ScoringFactor.AGE, key: 'age' },
      { factor: ScoringFactor.BMI, key: 'bmi' },
      { factor: ScoringFactor.APPEARANCE, key: 'appearance' },
      { factor: ScoringFactor.RELATIONSHIP_HISTORY, key: 'relationshipHistory' },
      { factor: ScoringFactor.PERSONALITY, key: 'personality' },
      { factor: ScoringFactor.JOB_STABILITY, key: 'jobStability' },
      { factor: ScoringFactor.LOCATION, key: 'location' },
      { factor: ScoringFactor.CHILDREN_PREFERENCE, key: 'childrenPreference' }
    ];
    
    return factorMap
      .map(({ factor, key }) => ({
        factor,
        score: scoreBreakdown[key],
        weight: (weights as Record<string, number>)[key] || 0.1
      }))
      .sort((a, b) => a.score - b.score); // 从低到高排序，优先显示需要改进的
  }, [scoreBreakdown, weights]);
  
  return (
    <div className={cn('space-y-3', className)}>
      {sortedFactors.map(({ factor, score, weight }) => (
        <FactorDetailCard
          key={factor}
          factor={factor}
          score={score}
          weight={weight}
        />
      ))}
    </div>
  );
}

export const FactorList = memo(FactorListComponent);

export default FactorDetailCard;

