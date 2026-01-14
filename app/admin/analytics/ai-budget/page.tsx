'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/components/language-provider';
import {
  Brain,
  TrendingUp,
  Users,
  RefreshCw,
  Loader2,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Zap,
  MessageSquare,
  BarChart3,
} from 'lucide-react';
import Link from 'next/link';

interface AIStats {
  budget: {
    monthly_limit: number;
    monthly_usage: number;
    usage_percent: number;
    is_warning: boolean;
    is_over_budget: boolean;
    warning_threshold: number;
  };
  overview: {
    total_sessions: number;
    total_tokens: number;
    unique_users: number;
    total_analysis_count: number;
    total_chat_count: number;
  };
  sessions_by_type: {
    free_trial: number;
    vip_unlimited: number;
  };
  daily_stats: Array<{
    date: string;
    sessions: number;
    tokens: number;
  }>;
  top_users: Array<{
    user_id: string;
    username: string;
    total_tokens: number;
  }>;
}

export default function AIBudgetPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { language } = useLanguage();

  const [stats, setStats] = useState<AIStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.push('/auth/login');
        return;
      }

      const response = await fetch('/api/admin/ai/stats', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push('/auth/login');
          return;
        }
        throw new Error('Failed to load stats');
      }

      const data = await response.json();
      if (data.success) {
        setStats(data);
      }
    } catch (error) {
      console.error('Load stats error:', error);
      toast({
        title: language === 'zh' ? '错误' : 'Error',
        description: language === 'zh' ? '加载统计失败' : 'Failed to load statistics',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(2)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {language === 'zh' ? 'AI预算控制' : 'AI Budget Control'}
          </h1>
          <p className="text-gray-600 mt-1">
            {language === 'zh' ? 'AI功能Token使用和预算监控' : 'AI feature token usage and budget monitoring'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadStats}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {language === 'zh' ? '刷新' : 'Refresh'}
          </Button>
          <Link href="/admin">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {language === 'zh' ? '返回' : 'Back'}
            </Button>
          </Link>
        </div>
      </div>

      {/* Budget Alert */}
      {stats?.budget && (stats.budget.is_warning || stats.budget.is_over_budget) && (
        <Card className={`mb-6 ${stats.budget.is_over_budget ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className={`h-6 w-6 ${stats.budget.is_over_budget ? 'text-red-600' : 'text-yellow-600'}`} />
              <div>
                <h3 className={`font-semibold ${stats.budget.is_over_budget ? 'text-red-800' : 'text-yellow-800'}`}>
                  {stats.budget.is_over_budget
                    ? (language === 'zh' ? '⚠️ 预算已超支！AI功能可能已暂停' : '⚠️ Budget exceeded! AI features may be suspended')
                    : (language === 'zh' ? '⚠️ 预算预警：已使用超过80%' : '⚠️ Budget warning: Over 80% used')}
                </h3>
                <p className={`text-sm ${stats.budget.is_over_budget ? 'text-red-700' : 'text-yellow-700'}`}>
                  {language === 'zh'
                    ? `本月已使用 ${formatTokens(stats.budget.monthly_usage)} / ${formatTokens(stats.budget.monthly_limit)} tokens (${stats.budget.usage_percent.toFixed(1)}%)`
                    : `Used ${formatTokens(stats.budget.monthly_usage)} / ${formatTokens(stats.budget.monthly_limit)} tokens this month (${stats.budget.usage_percent.toFixed(1)}%)`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget Progress Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-purple-500" />
            {language === 'zh' ? '月度预算使用情况' : 'Monthly Budget Usage'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>{language === 'zh' ? '已使用' : 'Used'}: {formatTokens(stats?.budget.monthly_usage || 0)}</span>
              <span>{language === 'zh' ? '预算' : 'Budget'}: {formatTokens(stats?.budget.monthly_limit || 0)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all ${
                  stats?.budget.is_over_budget ? 'bg-red-500' :
                  stats?.budget.is_warning ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(stats?.budget.usage_percent || 0, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <Badge className={
                stats?.budget.is_over_budget ? 'bg-red-100 text-red-800' :
                stats?.budget.is_warning ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
              }>
                {stats?.budget.is_over_budget
                  ? (language === 'zh' ? '超预算' : 'Over Budget')
                  : stats?.budget.is_warning
                    ? (language === 'zh' ? '预警' : 'Warning')
                    : (language === 'zh' ? '正常' : 'Normal')}
              </Badge>
              <span className="text-2xl font-bold">{stats?.budget.usage_percent.toFixed(1)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'zh' ? '总Token使用' : 'Total Tokens'}
            </CardTitle>
            <Brain className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {formatTokens(stats?.overview.total_tokens || 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {language === 'zh' ? '累计消耗' : 'total consumed'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'zh' ? '对话会话数' : 'Chat Sessions'}
            </CardTitle>
            <MessageSquare className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {stats?.overview.total_sessions || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {language === 'zh' ? '总对话次数' : 'total sessions'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'zh' ? '活跃用户' : 'Active Users'}
            </CardTitle>
            <Users className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats?.overview.unique_users || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {language === 'zh' ? '使用AI功能的用户' : 'users using AI'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'zh' ? '性格分析次数' : 'Analysis Count'}
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {stats?.overview.total_analysis_count || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {language === 'zh' ? '累计分析次数' : 'total analyses'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Sessions by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-500" />
              {language === 'zh' ? '会话类型分布' : 'Sessions by Type'}
            </CardTitle>
            <CardDescription>
              {language === 'zh' ? '免费试用 vs VIP无限' : 'Free trial vs VIP unlimited'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.sessions_by_type ? (
              <div className="space-y-4">
                {[
                  { key: 'free_trial', label: language === 'zh' ? '免费试用' : 'Free Trial', color: 'bg-blue-500' },
                  { key: 'vip_unlimited', label: language === 'zh' ? 'VIP无限' : 'VIP Unlimited', color: 'bg-purple-500' },
                ].map(item => {
                  const count = stats.sessions_by_type[item.key as keyof typeof stats.sessions_by_type] || 0;
                  const total = (stats.sessions_by_type.free_trial || 0) + (stats.sessions_by_type.vip_unlimited || 0);
                  const percent = total > 0 ? (count / total) * 100 : 0;

                  return (
                    <div key={item.key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{item.label}</span>
                        <span className="text-sm">{count} ({percent.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className={`${item.color} h-2 rounded-full`} style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {language === 'zh' ? '暂无数据' : 'No data available'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-rose-500" />
              {language === 'zh' ? 'Token使用排行' : 'Top Token Users'}
            </CardTitle>
            <CardDescription>
              {language === 'zh' ? 'Token消耗最多的用户' : 'Users consuming the most tokens'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.top_users && stats.top_users.length > 0 ? (
              <div className="space-y-3">
                {stats.top_users.map((user, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-sm font-bold text-rose-600">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{user.username}</p>
                        <p className="text-xs text-gray-500 font-mono">{user.user_id.slice(0, 8)}...</p>
                      </div>
                    </div>
                    <Badge className="bg-rose-100 text-rose-800">
                      {formatTokens(user.total_tokens)}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {language === 'zh' ? '暂无数据' : 'No data available'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Stats Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-amber-500" />
            {language === 'zh' ? '每日使用统计' : 'Daily Usage Stats'}
          </CardTitle>
          <CardDescription>
            {language === 'zh' ? '过去30天的AI使用情况' : 'AI usage in the past 30 days'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.daily_stats && stats.daily_stats.length > 0 ? (
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">{language === 'zh' ? '日期' : 'Date'}</th>
                    <th className="text-right py-2 px-4">{language === 'zh' ? '会话数' : 'Sessions'}</th>
                    <th className="text-right py-2 px-4">{language === 'zh' ? 'Token消耗' : 'Tokens'}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.daily_stats.slice().reverse().map((day, index) => (
                    <tr key={index} className="border-b last:border-0">
                      <td className="py-2 px-4 font-medium">{day.date}</td>
                      <td className="text-right py-2 px-4">{day.sessions}</td>
                      <td className="text-right py-2 px-4 text-purple-600">{formatTokens(day.tokens)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {language === 'zh' ? '暂无每日数据' : 'No daily data available'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
