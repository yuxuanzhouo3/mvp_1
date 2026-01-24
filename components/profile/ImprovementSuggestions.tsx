/**
 * Improvement Suggestions Component - 提升建议面板组件
 * 分析用户各因子分数，生成优化建议
 */

'use client';

import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  Lightbulb,
  ArrowRight,
  DollarSign,
  GraduationCap,
  Calendar,
  Heart,
  Smile,
  Users,
  Brain,
  Briefcase,
  MapPin,
  Baby,
  Sparkles
} from 'lucide-react';
import { ScoringFactor, type WeightConfig } from '@/lib/scoring-core';
import type { ScoreBreakdown } from '@/lib/scoring';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';

// ========================================
// 类型定义
// ========================================

interface ImprovementSuggestionsProps {
  /** 分数细分 */
  scoreBreakdown: ScoreBreakdown;
  /** 权重配置 */
  weights: WeightConfig;
  /** 最多显示几条建议 */
  maxSuggestions?: number;
  /** 自定义类名 */
  className?: string;
  /** 点击改进按钮回调 */
  onImproveClick?: (factor: ScoringFactor) => void;
}

interface Suggestion {
  factor: ScoringFactor;
  score: number;
  weight: number;
  priority: number;
  title: string;
  description: string;
  actionText: string;
  actionUrl: string;
  icon: React.ComponentType<{ className?: string }>;
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

/** 因子URL映射 */
const FACTOR_URLS: Record<ScoringFactor, string> = {
  [ScoringFactor.WEALTH]: '/profile/edit?section=career',
  [ScoringFactor.EDUCATION]: '/profile/edit?section=education',
  [ScoringFactor.AGE]: '/profile/edit?section=basic',
  [ScoringFactor.BMI]: '/profile/edit?section=physical',
  [ScoringFactor.APPEARANCE]: '/profile/edit?section=photos',
  [ScoringFactor.RELATIONSHIP_HISTORY]: '/profile/edit?section=relationship',
  [ScoringFactor.PERSONALITY]: '/profile/setup?step=5',
  [ScoringFactor.JOB_STABILITY]: '/profile/edit?section=career',
  [ScoringFactor.LOCATION]: '/profile/edit?section=location',
  [ScoringFactor.CHILDREN_PREFERENCE]: '/profile/edit?section=relationship',
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

/** 低分阈值 */
const LOW_SCORE_THRESHOLD = 70;

// ========================================
// 主组件
// ========================================

function ImprovementSuggestionsComponent({
  scoreBreakdown,
  weights,
  maxSuggestions = 3,
  className,
  onImproveClick
}: ImprovementSuggestionsProps) {
  const { language } = useLanguage();
  const t = useTranslations(language);

  // 生成优化建议
  const suggestions = useMemo((): Suggestion[] => {
    const factors = Object.keys(scoreBreakdown) as ScoringFactor[];

    return factors
      .filter(factor => scoreBreakdown[factor as keyof ScoreBreakdown] < LOW_SCORE_THRESHOLD)
      .map(factor => {
        const score = scoreBreakdown[factor as keyof ScoreBreakdown];
        const weight = weights[factor];
        const factorKey = FACTOR_KEYS[factor];
        const factorTranslation = t.marketValue.factors[factorKey];

        // 优先级 = 权重 × (100 - 分数)
        // 高权重、低分数的因子优先级更高
        const priority = weight * (100 - score);

        return {
          factor,
          score,
          weight,
          priority,
          title: factorTranslation.name,
          description: factorTranslation.suggestion,
          actionText: factorTranslation.actionText,
          actionUrl: FACTOR_URLS[factor],
          icon: FACTOR_ICONS[factor]
        };
      })
      .sort((a, b) => b.priority - a.priority)
      .slice(0, maxSuggestions);
  }, [scoreBreakdown, weights, maxSuggestions, t]);

  // 没有需要改进的因子
  if (suggestions.length === 0) {
    return (
      <Card className={cn('bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800', className)}>
        <CardContent className="flex items-center gap-4 py-6">
          <div className="p-3 rounded-full bg-green-100 dark:bg-green-800">
            <Sparkles className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="font-medium text-green-800 dark:text-green-200">
              {t.marketValue.suggestions.greatProfile}
            </h3>
            <p className="text-sm text-green-600 dark:text-green-400">
              {t.marketValue.suggestions.allFactorsGood}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <CardTitle className="text-base font-medium">
            {t.marketValue.suggestions.title}
          </CardTitle>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t.marketValue.suggestions.subtitle}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {suggestions.map((suggestion, index) => {
          const Icon = suggestion.icon;
          const impactScore = Math.round(suggestion.weight * (100 - suggestion.score));

          return (
            <div
              key={suggestion.factor}
              className={cn(
                'flex items-start gap-4 p-4 rounded-lg border transition-colors',
                'bg-gray-50 dark:bg-gray-800/50',
                'border-gray-200 dark:border-gray-700',
                'hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              {/* 优先级标签 */}
              <div className="flex flex-col items-center gap-1">
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs px-2',
                    index === 0 && 'bg-red-50 text-red-600 border-red-200',
                    index === 1 && 'bg-orange-50 text-orange-600 border-orange-200',
                    index === 2 && 'bg-yellow-50 text-yellow-600 border-yellow-200',
                    index > 2 && 'bg-gray-50 text-gray-600 border-gray-200'
                  )}
                >
                  #{index + 1}
                </Badge>
                <Icon className="w-5 h-5 text-gray-400 mt-1" />
              </div>

              {/* 内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {suggestion.title}
                  </h4>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {t.marketValue.suggestions.score}: {suggestion.score}
                  </Badge>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {suggestion.description}
                </p>

                {/* 潜在提升 */}
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {t.marketValue.suggestions.weight}: {Math.round(suggestion.weight * 100)}%
                  </span>
                  <span className="flex items-center gap-1 text-green-600">
                    {t.marketValue.suggestions.potentialImpact}: +{impactScore}
                  </span>
                </div>
              </div>

              {/* 操作按钮 */}
              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onImproveClick) {
                    onImproveClick(suggestion.factor);
                  } else {
                    window.location.href = suggestion.actionUrl;
                  }
                }}
              >
                {suggestion.actionText}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          );
        })}

        {/* 查看全部链接 */}
        {suggestions.length < Object.keys(scoreBreakdown).filter(
          k => scoreBreakdown[k as keyof ScoreBreakdown] < LOW_SCORE_THRESHOLD
        ).length && (
          <Button variant="ghost" className="w-full" asChild>
            <a href="/profile/score-details">
              {t.marketValue.suggestions.viewAllSuggestions}
              <ArrowRight className="w-4 h-4 ml-2" />
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// 使用memo优化性能
export const ImprovementSuggestions = memo(ImprovementSuggestionsComponent);

// ========================================
// 简化版建议（用于侧边栏）
// ========================================

interface CompactSuggestionsProps {
  scoreBreakdown: ScoreBreakdown;
  weights: WeightConfig;
  className?: string;
}

function CompactSuggestionsComponent({
  scoreBreakdown,
  weights,
  className
}: CompactSuggestionsProps) {
  const { language } = useLanguage();
  const t = useTranslations(language);

  const lowScoreFactors = useMemo(() => {
    return (Object.keys(scoreBreakdown) as (keyof ScoreBreakdown)[])
      .filter(factor => scoreBreakdown[factor] < LOW_SCORE_THRESHOLD)
      .length;
  }, [scoreBreakdown]);

  if (lowScoreFactors === 0) {
    return null;
  }

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800',
      className
    )}>
      <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          {t.marketValue.suggestions.areasNeedImprovement.replace('{count}', String(lowScoreFactors))}
        </p>
      </div>
      <Button size="sm" variant="ghost" asChild>
        <a href="/profile/score-details" className="text-amber-600 hover:text-amber-700">
          {t.marketValue.suggestions.fix}
        </a>
      </Button>
    </div>
  );
}

export const CompactSuggestions = memo(CompactSuggestionsComponent);

export default ImprovementSuggestions;

