/**
 * MBTI Compatibility Display Component
 * MBTI兼容性展示组件
 */

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Heart, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  Brain
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
import type { MBTIType } from '@/types/database';
import {
  getMBTICompatibilityResult,
  getMBTITypeInfo,
  getBestMatchingTypes,
  CompatibilityLevel,
  type MBTICompatibilityResult
} from '@/lib/mbti-compatibility';

// ========================================
// 类型定义
// ========================================

interface MBTICompatibilityProps {
  userMbti: MBTIType | null;
  targetMbti?: MBTIType | null;
  showBestMatches?: boolean;
  className?: string;
}

interface CompatibilityBadgeProps {
  level: CompatibilityLevel;
  locale: 'en' | 'zh';
}

// ========================================
// 辅助组件
// ========================================

const levelColors: Record<CompatibilityLevel, string> = {
  [CompatibilityLevel.IDEAL]: 'bg-gradient-to-r from-pink-500 to-rose-500 text-white',
  [CompatibilityLevel.EXCELLENT]: 'bg-gradient-to-r from-purple-500 to-violet-500 text-white',
  [CompatibilityLevel.GOOD]: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white',
  [CompatibilityLevel.MODERATE]: 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white',
  [CompatibilityLevel.CHALLENGING]: 'bg-gradient-to-r from-gray-500 to-slate-500 text-white'
};

const levelLabels: Record<CompatibilityLevel, { en: string; zh: string }> = {
  [CompatibilityLevel.IDEAL]: { en: 'Ideal Match', zh: '理想匹配' },
  [CompatibilityLevel.EXCELLENT]: { en: 'Excellent Match', zh: '极佳匹配' },
  [CompatibilityLevel.GOOD]: { en: 'Good Match', zh: '良好匹配' },
  [CompatibilityLevel.MODERATE]: { en: 'Moderate Match', zh: '一般匹配' },
  [CompatibilityLevel.CHALLENGING]: { en: 'Challenging Match', zh: '挑战匹配' }
};

const levelIcons: Record<CompatibilityLevel, React.ReactNode> = {
  [CompatibilityLevel.IDEAL]: <Sparkles className="w-4 h-4" />,
  [CompatibilityLevel.EXCELLENT]: <Heart className="w-4 h-4" />,
  [CompatibilityLevel.GOOD]: <CheckCircle2 className="w-4 h-4" />,
  [CompatibilityLevel.MODERATE]: <Info className="w-4 h-4" />,
  [CompatibilityLevel.CHALLENGING]: <AlertTriangle className="w-4 h-4" />
};

const CompatibilityBadge: React.FC<CompatibilityBadgeProps> = ({ level, locale }) => {
  return (
    <Badge className={cn('flex items-center gap-1.5 px-3 py-1', levelColors[level])}>
      {levelIcons[level]}
      <span>{levelLabels[level][locale]}</span>
    </Badge>
  );
};

// ========================================
// 主组件
// ========================================

export const MBTICompatibility: React.FC<MBTICompatibilityProps> = ({
  userMbti,
  targetMbti,
  showBestMatches = false,
  className
}) => {
  const { language } = useLanguage();
  const t = useTranslations(language);
  const locale = language === 'zh' ? 'zh' : 'en';

  // 如果没有MBTI数据
  if (!userMbti) {
    return (
      <Card className={cn('', className)}>
        <CardContent className="py-8 text-center">
          <Brain className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            {locale === 'zh' ? '请先完成MBTI性格测试' : 'Please complete the MBTI personality test first'}
          </p>
        </CardContent>
      </Card>
    );
  }

  // 获取用户的MBTI信息
  const userTypeInfo = getMBTITypeInfo(userMbti, locale);

  // 如果有目标MBTI，显示兼容性分析
  if (targetMbti) {
    const result = getMBTICompatibilityResult(userMbti, targetMbti, locale);
    const targetTypeInfo = getMBTITypeInfo(targetMbti, locale);

    return (
      <Card className={cn('', className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-500" />
              {locale === 'zh' ? 'MBTI兼容性分析' : 'MBTI Compatibility Analysis'}
            </CardTitle>
            <CompatibilityBadge level={result.level} locale={locale} />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 类型对比 */}
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <span className="text-lg font-bold text-primary">{userMbti}</span>
              </div>
              <p className="text-sm font-medium">{userTypeInfo.name}</p>
              <p className="text-xs text-gray-500">{locale === 'zh' ? '你' : 'You'}</p>
            </div>
            
            <div className="flex flex-col items-center">
              <Heart className={cn(
                'w-8 h-8',
                result.score >= 85 ? 'text-pink-500 fill-pink-500' :
                result.score >= 70 ? 'text-pink-400' :
                'text-gray-400'
              )} />
              <span className="text-2xl font-bold mt-1">{result.score}</span>
              <span className="text-xs text-gray-500">{locale === 'zh' ? '兼容分' : 'Score'}</span>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-2">
                <span className="text-lg font-bold text-secondary-foreground">{targetMbti}</span>
              </div>
              <p className="text-sm font-medium">{targetTypeInfo.name}</p>
              <p className="text-xs text-gray-500">{locale === 'zh' ? 'TA' : 'Them'}</p>
            </div>
          </div>

          {/* 兼容性进度条 */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{locale === 'zh' ? '兼容指数' : 'Compatibility Index'}</span>
              <span className="font-medium">{result.score}/100</span>
            </div>
            <Progress value={result.score} className="h-2" />
          </div>

          {/* 优势 */}
          <div>
            <h4 className="text-sm font-medium text-green-600 dark:text-green-400 mb-2 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              {locale === 'zh' ? '关系优势' : 'Relationship Strengths'}
            </h4>
            <ul className="space-y-1">
              {result.strengths.map((strength, index) => (
                <li key={index} className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2">
                  <span className="text-green-500 mt-1">•</span>
                  {strength}
                </li>
              ))}
            </ul>
          </div>

          {/* 挑战 */}
          <div>
            <h4 className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              {locale === 'zh' ? '潜在挑战' : 'Potential Challenges'}
            </h4>
            <ul className="space-y-1">
              {result.challenges.map((challenge, index) => (
                <li key={index} className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  {challenge}
                </li>
              ))}
            </ul>
          </div>

          {/* 建议 */}
          <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1">
              <Info className="w-4 h-4" />
              {locale === 'zh' ? '关系建议' : 'Relationship Advice'}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">{result.advice}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 如果只有用户的MBTI，显示用户类型信息和最佳匹配
  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          {locale === 'zh' ? '你的MBTI类型' : 'Your MBTI Type'}
        </CardTitle>
        <CardDescription>{userTypeInfo.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 用户类型展示 */}
        <div className="text-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl font-bold text-primary">{userMbti}</span>
          </div>
          <h3 className="text-xl font-semibold">{userTypeInfo.name}</h3>
        </div>

        {/* 最佳匹配类型 */}
        {showBestMatches && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-primary" />
              {locale === 'zh' ? '最佳匹配类型' : 'Best Matching Types'}
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {getBestMatchingTypes(userMbti, 4).map(({ type, score }) => {
                const typeInfo = getMBTITypeInfo(type, locale);
                const level = score >= 95 ? CompatibilityLevel.IDEAL :
                              score >= 85 ? CompatibilityLevel.EXCELLENT :
                              CompatibilityLevel.GOOD;
                return (
                  <div 
                    key={type}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700"
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold',
                      levelColors[level]
                    )}>
                      {type.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{type}</p>
                      <p className="text-xs text-gray-500 truncate">{typeInfo.name}</p>
                    </div>
                    <span className="text-sm font-bold text-primary">{score}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MBTICompatibility;

