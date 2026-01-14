'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, MessageCircle, Crown } from 'lucide-react';
import { AIUsageLimits } from '@/lib/services/ai-service';

interface AIUsageLimitDisplayProps {
  limits: AIUsageLimits | null;
  onUpgradeClick?: () => void;
  language?: 'zh' | 'en';
}

export function AIUsageLimitDisplay({
  limits,
  onUpgradeClick,
  language = 'en',
}: AIUsageLimitDisplayProps) {
  if (!limits) return null;

  const analysisUsed = limits.daily_analysis_count;
  const analysisLimit = limits.daily_analysis_limit;
  const chatUsed = limits.total_chat_count;
  const chatLimit = limits.total_chat_limit;

  const labels = {
    zh: {
      dailyAnalysis: '每日AI分析',
      totalChats: 'AI对话次数',
      unlimited: '无限',
      remaining: '剩余',
      upgrade: '升级VIP',
      resetsDaily: '每日重置',
    },
    en: {
      dailyAnalysis: 'Daily AI Analysis',
      totalChats: 'AI Chat Sessions',
      unlimited: 'Unlimited',
      remaining: 'remaining',
      upgrade: 'Upgrade to VIP',
      resetsDaily: 'Resets daily',
    },
  };

  const t = labels[language];

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* VIP标识 */}
        {limits.is_vip && (
          <div className="flex items-center gap-2 text-amber-600">
            <Crown className="h-4 w-4" />
            <span className="text-sm font-medium">VIP Member</span>
          </div>
        )}

        {/* 每日分析限额 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <span>{t.dailyAnalysis}</span>
            </div>
            <span className="text-muted-foreground text-xs">{t.resetsDaily}</span>
          </div>
          <div className="flex items-center gap-3">
            <Progress value={(analysisUsed / analysisLimit) * 100} className="flex-1 h-2" />
            <span className="text-sm font-medium w-12 text-right">
              {analysisLimit - analysisUsed}/{analysisLimit}
            </span>
          </div>
        </div>

        {/* 总对话限额 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <MessageCircle className="h-4 w-4 text-primary" />
            <span>{t.totalChats}</span>
          </div>
          {limits.is_vip || chatLimit === null ? (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{t.unlimited}</Badge>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Progress value={(chatUsed / chatLimit) * 100} className="flex-1 h-2" />
              <span className="text-sm font-medium w-12 text-right">
                {chatLimit - chatUsed}/{chatLimit}
              </span>
            </div>
          )}
        </div>

        {/* 升级按钮 */}
        {!limits.is_vip && onUpgradeClick && (
          <Button variant="outline" className="w-full" onClick={onUpgradeClick}>
            <Crown className="h-4 w-4 mr-2" />
            {t.upgrade}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
