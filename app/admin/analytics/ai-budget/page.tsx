'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
import { isChinaDeployment } from '@/lib/config/deployment.config';
import {
  Brain,
  TrendingUp,
  Users,
  RefreshCw,
  Loader2,
  ArrowLeft,
  AlertTriangle,
  Zap,
  MessageSquare,
  BarChart3,
  Bot,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
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
    assistant_tokens: number;
    assistant_sessions: number;
  };
  sessions_by_type: {
    free_trial: number;
    vip_unlimited: number;
    assistant: number;
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
  personality?: {
    total_count: number;
    monthly_count: number;
    today_count?: number;
    daily_trend: Array<{
      date: string;
      count: number;
    }>;
    top_users: Array<{
      user_id: string;
      username: string;
      analysis_count: number;
    }>;
  };
  errors?: string[];
}

type AiRegion = 'CN' | 'INTL';

function formatTokens(tokens: number) {
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(2)}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
  return tokens.toString();
}

function AIBudgetStatsView({ stats }: { stats: AIStats | null }) {
  const { language } = useLanguage();
  const t = useTranslations(language);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <>
      {stats.errors && stats.errors.length > 0 ? (
        <Card className="mb-6 bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-700 mt-0.5" />
              <div className="space-y-1">
                <div className="text-sm font-semibold text-yellow-800">
                  {language === 'zh' ? '部分数据不可用' : 'Some data unavailable'}
                </div>
                <div className="text-sm text-yellow-800">
                  {stats.errors.join('、')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {stats.budget && (stats.budget.is_warning || stats.budget.is_over_budget) && (
        <Card className={`mb-6 ${stats.budget.is_over_budget ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className={`h-6 w-6 ${stats.budget.is_over_budget ? 'text-red-600' : 'text-yellow-600'}`} />
              <div>
                <h3 className={`font-semibold ${stats.budget.is_over_budget ? 'text-red-800' : 'text-yellow-800'}`}>
                  {stats.budget.is_over_budget
                    ? t.admin.aiBudget.budgetExceeded
                    : t.admin.aiBudget.budgetWarning}
                </h3>
                <p className={`text-sm ${stats.budget.is_over_budget ? 'text-red-700' : 'text-yellow-700'}`}>
                  {t.admin.aiBudget.used}: {formatTokens(stats.budget.monthly_usage)} / {formatTokens(stats.budget.monthly_limit)} tokens ({stats.budget.usage_percent.toFixed(1)}%)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-purple-500" />
            {t.admin.aiBudget.monthlyBudget}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>{t.admin.aiBudget.used}: {formatTokens(stats.budget?.monthly_usage || 0)}</span>
              <span>{t.admin.aiBudget.budget}: {formatTokens(stats.budget?.monthly_limit || 0)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all ${
                  stats.budget?.is_over_budget ? 'bg-red-500' :
                  stats.budget?.is_warning ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(stats.budget?.usage_percent || 0, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <Badge className={
                stats.budget?.is_over_budget ? 'bg-red-100 text-red-800' :
                stats.budget?.is_warning ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
              }>
                {stats.budget?.is_over_budget
                  ? t.admin.aiBudget.overBudget
                  : stats.budget?.is_warning
                    ? t.admin.aiBudget.warning
                    : t.admin.aiBudget.normal}
              </Badge>
              <span className="text-2xl font-bold">{stats.budget?.usage_percent.toFixed(1)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t.admin.aiBudget.totalTokens}
            </CardTitle>
            <Brain className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {formatTokens(stats.overview.total_tokens || 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {t.admin.aiBudget.totalConsumed}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t.admin.aiBudget.chatSessions}
            </CardTitle>
            <MessageSquare className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {stats.overview.total_sessions || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {t.admin.aiBudget.totalSessions}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t.admin.aiBudget.chatMessages}
            </CardTitle>
            <MessageSquare className="h-5 w-5 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-600">
              {stats.overview.total_chat_count || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {t.admin.aiBudget.totalMessages}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t.admin.aiBudget.activeUsers}
            </CardTitle>
            <Users className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats.overview.unique_users || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {t.admin.aiBudget.usersUsingAI}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t.admin.aiBudget.analysisCount}
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {stats.overview.total_analysis_count || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {t.admin.aiBudget.totalAnalyses}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t.admin.aiBudget.assistantTokens}
            </CardTitle>
            <Bot className="h-5 w-5 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-cyan-600">
              {formatTokens(stats.overview.assistant_tokens || 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {t.admin.aiBudget.assistantThisMonth}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-500" />
              {t.admin.aiBudget.sessionsByType}
            </CardTitle>
            <CardDescription>
              {t.admin.aiBudget.sessionsByTypeDesc}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.sessions_by_type ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(() => {
                  const items = [
                    { key: 'assistant', label: t.admin.aiBudget.aiAssistant, color: '#22d3ee', bar: 'bg-cyan-500' },
                    { key: 'free_trial', label: t.admin.aiBudget.freeTrial, color: '#3b82f6', bar: 'bg-blue-500' },
                    { key: 'vip_unlimited', label: t.admin.aiBudget.vipUnlimited, color: '#a855f7', bar: 'bg-purple-500' },
                  ] as const;
                  const total =
                    (stats.sessions_by_type.free_trial || 0) +
                    (stats.sessions_by_type.vip_unlimited || 0) +
                    (stats.sessions_by_type.assistant || 0);
                  const pieData = items.map(item => ({
                    name: item.label,
                    key: item.key,
                    value: stats.sessions_by_type[item.key] || 0,
                    color: item.color,
                  }));

                  return (
                    <>
                      <div className="space-y-4">
                        {items.map(item => {
                          const count = stats.sessions_by_type[item.key] || 0;
                          const percent = total > 0 ? (count / total) * 100 : 0;

                          return (
                            <div key={item.key} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{item.label}</span>
                                <span className="text-sm">
                                  {count} ({percent.toFixed(1)}%)
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`${item.bar} h-2 rounded-full`}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="h-56">
                        {total > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={pieData}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={50}
                                outerRadius={80}
                                paddingAngle={2}
                              >
                                {pieData.map(entry => (
                                  <Cell key={entry.key} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-sm text-gray-500">
                            {t.admin.aiBudget.noData}
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {t.admin.aiBudget.noData}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-rose-500" />
              {t.admin.aiBudget.topTokenUsers}
            </CardTitle>
            <CardDescription>
              {t.admin.aiBudget.topTokenUsersDesc}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.top_users && stats.top_users.length > 0 ? (
              <div className="space-y-3">
                {stats.top_users.map((user, index) => (
                  <div
                    key={user.user_id || index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-sm font-bold text-rose-600">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{user.username}</p>
                        <p className="text-xs text-gray-500 font-mono">
                          {user.user_id.slice(0, 8)}...
                        </p>
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
                {t.admin.aiBudget.noData}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-500" />
            {t.admin.aiBudget.dailyTrend}
          </CardTitle>
          <CardDescription>
            {t.admin.aiBudget.dailyTrendDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.daily_stats && stats.daily_stats.length > 0 ? (
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.daily_stats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(value) => formatTokens(Number(value) || 0)}
                  />
                  <Tooltip
                    labelFormatter={(value) => {
                      const date = new Date(value as string);
                      return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                    formatter={(value: any, name: any) => {
                      if (name === t.admin.aiBudget.tokenUsage) return [formatTokens(Number(value) || 0), name];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    yAxisId="left"
                    dataKey="sessions"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name={t.admin.aiBudget.sessions}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    yAxisId="right"
                    dataKey="tokens"
                    stroke="#a855f7"
                    strokeWidth={2}
                    name={t.admin.aiBudget.tokenUsage}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {t.admin.aiBudget.noTrendData}
            </div>
          )}
        </CardContent>
      </Card>

      {(() => {
        const personality = stats.personality ?? {
          total_count: 0,
          monthly_count: 0,
          today_count: 0,
          daily_trend: [],
          top_users: [],
        };

        return (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t.admin.aiBudget.personalityTitle}
                  </CardTitle>
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <div className="text-3xl font-bold text-orange-600">
                        {personality.total_count || 0}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {t.admin.aiBudget.personalityTotal}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>{t.admin.aiBudget.personalityMonthly}</span>
                      <span className="font-semibold text-gray-900">
                        {personality.monthly_count || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>{t.admin.aiBudget.personalityToday}</span>
                      <span className="font-semibold text-gray-900">
                        {personality.today_count || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-rose-500" />
                    {t.admin.aiBudget.personalityTopUsers}
                  </CardTitle>
                  <CardDescription>
                    {t.admin.aiBudget.personalityTopUsersDesc}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {personality.top_users && personality.top_users.length > 0 ? (
                    <div className="space-y-3">
                      {personality.top_users.map((user, index) => (
                        <div
                          key={user.user_id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-sm font-bold text-rose-600">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{user.username}</p>
                              <p className="text-xs text-gray-500 font-mono">
                                {user.user_id.slice(0, 8)}...
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-rose-100 text-rose-800">
                            {user.analysis_count}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      {t.admin.aiBudget.noData}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-indigo-500" />
                  {t.admin.aiBudget.personalityDailyTrend}
                </CardTitle>
                <CardDescription>
                  {t.admin.aiBudget.dailyTrendDesc}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {personality.daily_trend && personality.daily_trend.length > 0 ? (
                  <div className="w-full h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={personality.daily_trend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(value) => {
                            const date = new Date(value);
                            return `${date.getMonth() + 1}/${date.getDate()}`;
                          }}
                        />
                        <YAxis allowDecimals={false} />
                        <Tooltip
                          labelFormatter={(value) => {
                            const date = new Date(value as string);
                            return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#4f46e5"
                          strokeWidth={2}
                          name={t.admin.aiBudget.analysisCount}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {t.admin.aiBudget.personalityNoDailyData}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        );
      })()}
    </>
  );
}

export default function AIBudgetPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = useTranslations(language);

  const [selectedRegion, setSelectedRegion] = useState<AiRegion>(() =>
    isChinaDeployment() ? 'CN' : 'INTL'
  );
  const [cnStats, setCnStats] = useState<AIStats | null>(null);
  const [intlStats, setIntlStats] = useState<AIStats | null>(null);
  const [cnError, setCnError] = useState<string | null>(null);
  const [intlError, setIntlError] = useState<string | null>(null);
  const [cnLoading, setCnLoading] = useState(false);
  const [intlLoading, setIntlLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showBoth, setShowBoth] = useState(false);

  const loadStatsForRegion = useCallback(
    async (region: AiRegion) => {
      try {
        if (region === 'CN') {
          setCnLoading(true);
          setCnError(null);
        } else {
          setIntlLoading(true);
          setIntlError(null);
        }

        const response = await fetch(`/api/admin/ai/stats?region=${region}`, {
          credentials: 'include',
          cache: 'no-store',
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            router.push('/admin/login');
            return;
          }
          const message = await response.text();
          throw new Error(message || 'Failed to load stats');
        }

        const data = await response.json();
        if (data?.success) {
          if (region === 'CN') {
            setCnStats(data);
          } else {
            setIntlStats(data);
          }
          setLastUpdated(new Date());
        } else {
          throw new Error(data?.error || 'Failed to load stats');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        if (region === 'CN') {
          setCnError(message);
        } else {
          setIntlError(message);
        }
        toast({
          title: t.admin.aiBudget.error,
          description: t.admin.aiBudget.loadFailed,
          variant: 'destructive',
        });
      } finally {
        if (region === 'CN') {
          setCnLoading(false);
        } else {
          setIntlLoading(false);
        }
      }
    },
    [router, toast, t.admin.aiBudget.error, t.admin.aiBudget.loadFailed]
  );

  const loadAll = useCallback(async () => {
    await Promise.all([loadStatsForRegion('CN'), loadStatsForRegion('INTL')]);
  }, [loadStatsForRegion]);

  useEffect(() => {
    loadAll();

    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadAll();
      }, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, loadAll, loadStatsForRegion]);

  const currentStats = selectedRegion === 'CN' ? cnStats : intlStats;
  const currentError = selectedRegion === 'CN' ? cnError : intlError;
  const currentLoading = selectedRegion === 'CN' ? cnLoading : intlLoading;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t.admin.aiBudget.title}
          </h1>
          <p className="text-gray-600 mt-1">
            {t.admin.aiBudget.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={selectedRegion} onValueChange={(v) => setSelectedRegion(v as AiRegion)}>
            <TabsList>
              <TabsTrigger value="CN">CN</TabsTrigger>
              <TabsTrigger value="INTL">INTL</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant={showBoth ? 'default' : 'outline'}
            onClick={() => setShowBoth(!showBoth)}
            className={showBoth ? 'bg-slate-900 hover:bg-slate-800' : ''}
          >
            {showBoth ? (language === 'zh' ? '同屏：开' : 'Both: On') : (language === 'zh' ? '同屏：关' : 'Both: Off')}
          </Button>
          <Button variant="outline" onClick={() => (showBoth ? loadAll() : loadStatsForRegion(selectedRegion))}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t.admin.aiBudget.refresh}
          </Button>
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {autoRefresh ? t.admin.aiBudget.autoOn : t.admin.aiBudget.autoOff}
          </Button>
          <Link href="/admin">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t.admin.aiBudget.back}
            </Button>
          </Link>
        </div>
      </div>

      {lastUpdated && (
        <div className="text-sm text-gray-500 mb-4">
          {t.admin.aiBudget.lastUpdated}
          {lastUpdated.toLocaleTimeString()}
          {autoRefresh && (
            <span className="ml-2 text-green-600">
              ({t.admin.aiBudget.autoRefreshNote})
            </span>
          )}
        </div>
      )}

      {showBoth ? (
        <>
          {cnError ? (
            <Card className="border-red-200 bg-red-50 mb-6">
              <CardHeader className="py-4">
                <CardTitle className="text-sm text-red-700">
                  {language === 'zh' ? 'CN 加载失败' : 'CN Load failed'}
                </CardTitle>
                <CardDescription className="text-red-600 break-all">{cnError}</CardDescription>
              </CardHeader>
            </Card>
          ) : null}
          {intlError ? (
            <Card className="border-red-200 bg-red-50 mb-6">
              <CardHeader className="py-4">
                <CardTitle className="text-sm text-red-700">
                  {language === 'zh' ? 'INTL 加载失败' : 'INTL Load failed'}
                </CardTitle>
                <CardDescription className="text-red-600 break-all">{intlError}</CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          {cnLoading && !cnStats ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              {language === 'zh' ? 'CN 加载中' : 'CN Loading'}
            </div>
          ) : null}
          {intlLoading && !intlStats ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              {language === 'zh' ? 'INTL 加载中' : 'INTL Loading'}
            </div>
          ) : null}

          <div className="space-y-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="outline">CN</Badge>
              </div>
              <AIBudgetStatsView stats={cnStats} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="outline">INTL</Badge>
              </div>
              <AIBudgetStatsView stats={intlStats} />
            </div>
          </div>
        </>
      ) : (
        <>
          {currentError ? (
            <Card className="border-red-200 bg-red-50 mb-6">
              <CardHeader className="py-4">
                <CardTitle className="text-sm text-red-700">
                  {language === 'zh' ? '加载失败' : 'Load failed'}
                </CardTitle>
                <CardDescription className="text-red-600 break-all">{currentError}</CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          {currentLoading && !currentStats ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              {language === 'zh' ? '加载中' : 'Loading'}
            </div>
          ) : null}

          <Tabs value={selectedRegion} onValueChange={(v) => setSelectedRegion(v as AiRegion)}>
            <TabsContent value="CN">
              <AIBudgetStatsView stats={cnStats} />
            </TabsContent>
            <TabsContent value="INTL">
              <AIBudgetStatsView stats={intlStats} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
