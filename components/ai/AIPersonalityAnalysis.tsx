'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { analyzePersonality, getAIUsageLimits, PersonalityAnalysis } from '@/lib/services/ai-service';
import { Brain, MessageCircle, ThumbsUp, ThumbsDown, AlertTriangle, Sparkles } from 'lucide-react';

interface AIPersonalityAnalysisProps {
  targetUserId: string;
  targetUserName?: string;
  language?: 'zh' | 'en';
  onClose?: () => void;
  onUpgradeClick?: () => void;
}

export function AIPersonalityAnalysis({
  targetUserId,
  targetUserName,
  language = 'en',
  onClose,
  onUpgradeClick,
}: AIPersonalityAnalysisProps) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<PersonalityAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remainingCount, setRemainingCount] = useState(3);
  const [dailyLimit, setDailyLimit] = useState(3);
  const [isVip, setIsVip] = useState(false);

  useEffect(() => {
    const loadLimits = async () => {
      try {
        const limits = await getAIUsageLimits();
        if (!limits) return;
        setRemainingCount(limits.daily_analysis_limit - limits.daily_analysis_count);
        setDailyLimit(limits.daily_analysis_limit);
        setIsVip(limits.is_vip);
      } catch (err) {
        console.error('Failed to load limits:', err);
      }
    };
    loadLimits();
  }, []);

  const handleAnalyze = async () => {
    if (remainingCount <= 0 && !isVip) {
      setError(language === 'zh' ? '今日分析次数已用完，升级VIP获取更多次数' : 'Daily limit reached. Upgrade to VIP for more analyses.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await analyzePersonality(targetUserId);
      setAnalysis(result.analysis);
      if (!result.cached) {
        setRemainingCount(prev => Math.max(0, prev - 1));
      }
    } catch (err: any) {
      setError(err.message || (language === 'zh' ? '分析失败' : 'Analysis failed'));
    } finally {
      setLoading(false);
    }
  };

  const usedCount = dailyLimit - remainingCount;

  const t = {
    dailyAnalysis: language === 'zh' ? '每日分析' : 'Daily Analysis',
    analyze: language === 'zh' ? 'AI性格分析' : 'AI Personality Analysis',
    analyzing: language === 'zh' ? '分析中...' : 'Analyzing...',
    upgradeVip: language === 'zh' ? '升级VIP' : 'Upgrade to VIP',
    personalitySummary: language === 'zh' ? '性格总结' : 'Personality Summary',
    compatibility: language === 'zh' ? '匹配度' : 'Compatibility',
    topics: language === 'zh' ? '推荐话题' : 'Conversation Topics',
    dos: language === 'zh' ? '建议做' : "Do's",
    donts: language === 'zh' ? '避免做' : "Don'ts",
    challenges: language === 'zh' ? '潜在挑战' : 'Potential Challenges',
    firstMessage: language === 'zh' ? '开场白建议' : 'First Message Ideas',
  };

  return (
    <div className="space-y-4">
      {/* 使用限额显示 */}
      <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-600" />
          <span className="text-sm">{t.dailyAnalysis}</span>
        </div>
        <div className="flex items-center gap-2">
          <Progress value={(usedCount / dailyLimit) * 100} className="w-20 h-2" />
          <span className="text-sm font-medium">{remainingCount}/{dailyLimit}</span>
          {isVip && <Badge variant="secondary">VIP</Badge>}
        </div>
      </div>

      {/* 分析按钮 */}
      {!analysis && (
        <Button
          onClick={handleAnalyze}
          disabled={loading || (remainingCount <= 0 && !isVip)}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          {loading ? (
            <>{t.analyzing}</>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              {t.analyze}
            </>
          )}
        </Button>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
          {error}
          {remainingCount <= 0 && onUpgradeClick && (
            <Button variant="link" className="p-0 h-auto ml-2" onClick={onUpgradeClick}>
              {t.upgradeVip}
            </Button>
          )}
        </div>
      )}

      {/* 加载状态 */}
      {loading && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      )}

      {/* 分析结果 */}
      {analysis && (
        <div className="space-y-4">
          {/* 性格总结 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4" />
                {t.personalitySummary}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">{analysis.personality_summary}</p>
            </CardContent>
          </Card>

          {/* 匹配度 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t.compatibility}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-2">
                <Progress value={analysis.compatibility_score} className="flex-1" />
                <span className="font-bold text-lg">{analysis.compatibility_score}%</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{analysis.compatibility_analysis}</p>
            </CardContent>
          </Card>

          {/* 话题建议 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                {t.topics}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {analysis.conversation_topics.map((topic, i) => (
                  <Badge key={i} variant="outline">{topic}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Do & Don't */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-green-600">
                  <ThumbsUp className="h-4 w-4" />
                  {t.dos}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  {analysis.dos.map((item, i) => (
                    <li key={i} className="text-gray-600 dark:text-gray-400">• {item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-red-600">
                  <ThumbsDown className="h-4 w-4" />
                  {t.donts}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  {analysis.donts.map((item, i) => (
                    <li key={i} className="text-gray-600 dark:text-gray-400">• {item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* 潜在挑战 */}
          {analysis.potential_challenges.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  {t.challenges}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  {analysis.potential_challenges.map((item, i) => (
                    <li key={i} className="text-gray-600 dark:text-gray-400">• {item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* 开场白建议 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t.firstMessage}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analysis.first_message_suggestions.map((msg, i) => (
                  <div key={i} className="p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm">&ldquo;{msg}&rdquo;</div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
