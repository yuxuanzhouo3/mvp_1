/**
 * Match Score Details Component
 * 匹配分数详情展示组件
 * 
 * 用于在匹配结果页面展示：
 * - 使用的算法类型
 * - 匹配分数详情
 * - 各维度得分对比
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Gem,
  Rocket,
  Target,
  Gift,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  MapPin,
  Heart,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
import type { AlgorithmType, MatchResult } from '@/lib/matching/types';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
} from 'recharts';

// ========================================
// 类型定义
// ========================================

interface MatchScoreDetailsProps {
  matchResult: MatchResult;
  showChart?: boolean;
  defaultExpanded?: boolean;
  className?: string;
}

interface AlgorithmBadgeProps {
  algorithm: AlgorithmType;
  locale: 'en' | 'zh';
}

// ========================================
// 算法信息配置
// ========================================

const algorithmConfig: Record<AlgorithmType, {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  name: { en: string; zh: string };
  description: { en: string; zh: string };
}> = {
  compatible: {
    icon: Gem,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    name: { en: 'Compatible Match', zh: '金玉良缘' },
    description: { en: 'Matching based on similar conditions', zh: '门当户对匹配' },
  },
  romantic: {
    icon: Rocket,
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
    name: { en: 'Romantic Pursuit', zh: '勇敢追爱' },
    description: { en: 'Pursue excellence in matching', zh: '慕强择优匹配' },
  },
  pragmatic: {
    icon: Target,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    name: { en: 'Pragmatic Match', zh: '稳稳幸福' },
    description: { en: 'Practical matching with high success rate', zh: '务实匹配高成功率' },
  },
  serendipity: {
    icon: Gift,
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/30',
    name: { en: 'Serendipity', zh: '心动盲盒' },
    description: { en: 'Leave room for serendipity', zh: '给缘分一个机会' },
  },
};

// ========================================
// 因子名称映射
// ========================================

const factorNames: Record<string, { en: string; zh: string }> = {
  wealth: { en: 'Wealth', zh: '财富' },
  education: { en: 'Education', zh: '学历' },
  age: { en: 'Age', zh: '年龄' },
  bmi: { en: 'BMI', zh: '身材' },
  appearance: { en: 'Appearance', zh: '外貌' },
  relationshipHistory: { en: 'History', zh: '恋爱史' },
  personality: { en: 'Personality', zh: '性格' },
  jobStability: { en: 'Job', zh: '职业' },
  location: { en: 'Location', zh: '地理' },
  childrenPreference: { en: 'Children', zh: '生育' },
};

// ========================================
// 辅助组件
// ========================================

const AlgorithmBadge: React.FC<AlgorithmBadgeProps> = ({ algorithm, locale }) => {
  const config = algorithmConfig[algorithm];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        'flex items-center gap-1.5 px-3 py-1 font-medium',
        config.bgColor,
        config.borderColor,
        config.color
      )}
    >
      <Icon className="w-4 h-4" />
      <span>{config.name[locale]}</span>
    </Badge>
  );
};

const ScoreIndicator: React.FC<{ userScore: number; targetScore: number }> = ({
  userScore,
  targetScore,
}) => {
  const diff = targetScore - userScore;
  
  if (Math.abs(diff) < 1) {
    return (
      <span className="flex items-center text-gray-500">
        <Minus className="w-4 h-4 mr-1" />
        相近
      </span>
    );
  }
  
  if (diff > 0) {
    return (
      <span className="flex items-center text-green-500">
        <TrendingUp className="w-4 h-4 mr-1" />
        +{diff.toFixed(1)}
      </span>
    );
  }
  
  return (
    <span className="flex items-center text-red-500">
      <TrendingDown className="w-4 h-4 mr-1" />
      {diff.toFixed(1)}
    </span>
  );
};

// ========================================
// 主组件
// ========================================

export const MatchScoreDetails: React.FC<MatchScoreDetailsProps> = ({
  matchResult,
  showChart = true,
  defaultExpanded = false,
  className,
}) => {
  const { language } = useLanguage();
  const t = useTranslations(language);
  const locale = language === 'zh' ? 'zh' : 'en';
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const { algorithmType, matchScore, scoreDetails } = matchResult;
  const config = algorithmConfig[algorithmType];
  const Icon = config.icon;

  // 准备雷达图数据
  const radarData = scoreDetails.factorComparison
    ? Object.entries(scoreDetails.factorComparison).map(([factor, data]) => ({
        factor: factorNames[factor]?.[locale] || factor,
        user: data.user,
        target: data.target,
        fullMark: 100,
      }))
    : [];

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className={cn('pb-3', config.bgColor)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-full', config.bgColor, config.color)}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {config.name[locale]}
              </CardTitle>
              <CardDescription>
                {config.description[locale]}
              </CardDescription>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {matchScore.toFixed(1)}
            </div>
            <div className="text-sm text-gray-500">
              {locale === 'zh' ? '匹配分' : 'Match Score'}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* 基础分数对比 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
            <div className="text-sm text-gray-500 mb-1">
              {locale === 'zh' ? '你的基础分' : 'Your Base Score'}
            </div>
            <div className="text-xl font-semibold text-blue-600 dark:text-blue-400">
              {scoreDetails.userBaseScore.toFixed(1)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-pink-50 dark:bg-pink-950/30">
            <div className="text-sm text-gray-500 mb-1">
              {locale === 'zh' ? 'TA的基础分' : 'Their Base Score'}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-semibold text-pink-600 dark:text-pink-400">
                {scoreDetails.targetBaseScore.toFixed(1)}
              </span>
              <ScoreIndicator
                userScore={scoreDetails.userBaseScore}
                targetScore={scoreDetails.targetBaseScore}
              />
            </div>
          </div>
        </div>

        {/* 算法特定信息 */}
        {algorithmType === 'compatible' && scoreDetails.similarityScore && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30">
            <div className="flex items-center gap-2 mb-2">
              <Gem className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium">
                {locale === 'zh' ? '条件相似度' : 'Similarity Score'}
              </span>
            </div>
            <Progress value={scoreDetails.similarityScore} className="h-2" />
            <div className="text-right text-sm text-gray-500 mt-1">
              {scoreDetails.similarityScore.toFixed(1)}%
            </div>
          </div>
        )}

        {algorithmType === 'romantic' && (
          <div className="space-y-3">
            {scoreDetails.interestAToB && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-4 h-4 text-rose-500" />
                  <span className="text-sm font-medium">
                    {locale === 'zh' ? '你对TA的兴趣度' : 'Your Interest Level'}
                  </span>
                </div>
                <Progress value={scoreDetails.interestAToB} className="h-2" />
                <div className="text-right text-sm text-gray-500 mt-1">
                  {scoreDetails.interestAToB.toFixed(1)}%
                </div>
              </div>
            )}
            {scoreDetails.acceptanceBToA && (
              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium">
                    {locale === 'zh' ? 'TA接受你的可能性' : 'Acceptance Probability'}
                  </span>
                </div>
                <Progress value={scoreDetails.acceptanceBToA} className="h-2" />
                <div className="text-right text-sm text-gray-500 mt-1">
                  {scoreDetails.acceptanceBToA.toFixed(1)}%
                </div>
              </div>
            )}
          </div>
        )}

        {algorithmType === 'pragmatic' && scoreDetails.successRate && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium">
                {locale === 'zh' ? '预估成功率' : 'Estimated Success Rate'}
              </span>
            </div>
            <Progress value={scoreDetails.successRate} className="h-2" />
            <div className="text-right text-sm text-gray-500 mt-1">
              {scoreDetails.successRate.toFixed(1)}%
            </div>
          </div>
        )}

        {algorithmType === 'serendipity' && scoreDetails.randomFactor !== undefined && (
          <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-950/30">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-violet-500" />
              <span className="text-sm font-medium">
                {locale === 'zh' ? '缘分加成' : 'Serendipity Bonus'}
              </span>
              <span className={cn(
                'text-sm font-semibold ml-auto',
                scoreDetails.randomFactor >= 0 ? 'text-green-500' : 'text-red-500'
              )}>
                {scoreDetails.randomFactor >= 0 ? '+' : ''}
                {scoreDetails.randomFactor.toFixed(1)}
              </span>
            </div>
          </div>
        )}

        {/* 共同兴趣 */}
        {scoreDetails.mutualInterests && scoreDetails.mutualInterests.length > 0 && (
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div className="text-sm font-medium mb-2">
              {locale === 'zh' ? `${scoreDetails.mutualInterests.length}个共同兴趣` : `${scoreDetails.mutualInterests.length} Mutual Interests`}
            </div>
            <div className="flex flex-wrap gap-2">
              {scoreDetails.mutualInterests.slice(0, 5).map((interestId) => (
                <Badge key={interestId} variant="secondary" className="text-xs">
                  #{interestId}
                </Badge>
              ))}
              {scoreDetails.mutualInterests.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{scoreDetails.mutualInterests.length - 5}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* 距离信息 */}
        {scoreDetails.distance !== undefined && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <MapPin className="w-4 h-4" />
            <span>
              {scoreDetails.distance < 1
                ? locale === 'zh' ? '< 1公里' : '< 1 km'
                : locale === 'zh'
                ? `${scoreDetails.distance.toFixed(1)}公里`
                : `${scoreDetails.distance.toFixed(1)} km`}
            </span>
          </div>
        )}

        {/* 消息提示 */}
        {scoreDetails.message && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-primary mt-0.5" />
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {scoreDetails.message}
              </p>
            </div>
          </div>
        )}

        {/* 可折叠的详细对比 */}
        {showChart && radarData.length > 0 && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <span className="text-sm font-medium">
                  {locale === 'zh' ? '查看详细对比' : 'View Detailed Comparison'}
                </span>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis
                      dataKey="factor"
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Radar
                      name={locale === 'zh' ? '你' : 'You'}
                      dataKey="user"
                      stroke="hsl(217, 91%, 60%)"
                      fill="hsl(217, 91%, 60%)"
                      fillOpacity={0.3}
                    />
                    <Radar
                      name={locale === 'zh' ? 'TA' : 'Them'}
                      dataKey="target"
                      stroke="hsl(339, 82%, 51%)"
                      fill="hsl(339, 82%, 51%)"
                      fillOpacity={0.3}
                    />
                    <Legend />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
};

export default MatchScoreDetails;

