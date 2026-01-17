'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
import {
  Coins,
  TrendingUp,
  TrendingDown,
  Users,
  PieChart,
  RefreshCw,
  Loader2,
  ArrowLeft,
  BarChart3,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import Link from 'next/link';

interface CreditsStats {
  overview: {
    total_credits_issued: number;
    total_credits_consumed: number;
    total_current_credits: number;
    total_users: number;
    users_with_credits: number;
    average_credits_per_user: number;
  };
  issue_stats: Array<{
    type: string;
    label: string;
    count: number;
    total: number;
  }>;
  consume_stats: Array<{
    type: string;
    label: string;
    count: number;
    total: number;
    percentage: number;
  }>;
  distribution: {
    zero: number;
    '1-50': number;
    '51-100': number;
    '101-200': number;
    '201-500': number;
    '500+': number;
  };
  daily_stats: Array<{
    date: string;
    issued: number;
    consumed: number;
    net: number;
  }>;
  top_consumers: Array<{
    user_id: string;
    username: string;
    total_consumed: number;
  }>;
}

export default function CreditsAnalyticsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = useTranslations(language);

  const [stats, setStats] = useState<CreditsStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = async () => {
    try {
      setIsLoading(true);

      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        router.push('/auth/login');
        return;
      }

      const response = await fetch('/api/admin/credits/stats', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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
        title: t.admin.creditsAnalytics.error,
        description: t.admin.creditsAnalytics.loadFailed,
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

  const distributionLabels: Record<string, string> = {
    zero: t.admin.creditsAnalytics.zeroCredits,
    '1-50': '1-50',
    '51-100': '51-100',
    '101-200': '101-200',
    '201-500': '201-500',
    '500+': '500+',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t.admin.creditsAnalytics.title}
          </h1>
          <p className="text-gray-600 mt-1">
            {t.admin.creditsAnalytics.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadStats}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t.admin.creditsAnalytics.refresh}
          </Button>
          <Link href="/admin">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t.admin.creditsAnalytics.back}
            </Button>
          </Link>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Issued */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t.admin.creditsAnalytics.totalIssued}
            </CardTitle>
            <ArrowUpRight className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats?.overview.total_credits_issued?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {t.admin.creditsAnalytics.totalCreditsIssued}
            </p>
          </CardContent>
        </Card>

        {/* Total Consumed */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t.admin.creditsAnalytics.totalConsumed}
            </CardTitle>
            <ArrowDownRight className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {stats?.overview.total_credits_consumed?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {t.admin.creditsAnalytics.totalCreditsConsumed}
            </p>
          </CardContent>
        </Card>

        {/* Current Credits in Circulation */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t.admin.creditsAnalytics.inCirculation}
            </CardTitle>
            <Wallet className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {stats?.overview.total_current_credits?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {t.admin.creditsAnalytics.heldByUsers}
            </p>
          </CardContent>
        </Card>

        {/* Users with Credits */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t.admin.creditsAnalytics.usersWithCredits}
            </CardTitle>
            <Users className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {stats?.overview.users_with_credits?.toLocaleString() || 0}
              <span className="text-lg font-normal text-gray-500 ml-1">
                / {stats?.overview.total_users?.toLocaleString() || 0}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {t.common.age}: {stats?.overview.average_credits_per_user || 0} {t.admin.creditsAnalytics.avgPerUser}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Consumption by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-orange-500" />
              {t.admin.creditsAnalytics.consumptionByFeature}
            </CardTitle>
            <CardDescription>
              {t.admin.creditsAnalytics.whereCreditsSpent}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.consume_stats && stats.consume_stats.length > 0 ? (
              <div className="space-y-4">
                {stats.consume_stats.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.label}</span>
                      <div className="text-right">
                        <span className="text-sm font-medium">{item.total.toLocaleString()}</span>
                        <span className="text-xs text-gray-500 ml-2">({item.percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 text-right">
                      {item.count} {t.admin.creditsAnalytics.transactions}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {t.admin.creditsAnalytics.noConsumptionData}
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-500" />
              {t.admin.creditsAnalytics.userDistribution}
            </CardTitle>
            <CardDescription>
              {t.admin.creditsAnalytics.usersByBalance}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.distribution ? (
              <div className="space-y-4">
                {Object.entries(stats.distribution).map(([range, count], index) => {
                  const totalUsers = stats.overview.total_users || 1;
                  const percentage = (count / totalUsers) * 100;

                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{distributionLabels[range] || range}</span>
                        <div className="text-right">
                          <span className="text-sm font-medium">{count.toLocaleString()}</span>
                          <span className="text-xs text-gray-500 ml-2">({percentage.toFixed(1)}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-500 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {t.admin.creditsAnalytics.noDistributionData}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Issue Stats and Top Consumers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Issue Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              {t.admin.creditsAnalytics.issuanceSource}
            </CardTitle>
            <CardDescription>
              {t.admin.creditsAnalytics.whereCreditsFrom}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.issue_stats && stats.issue_stats.length > 0 ? (
              <div className="space-y-3">
                {stats.issue_stats.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-xs text-gray-500">
                        {item.count} {t.admin.creditsAnalytics.timesIssued}
                      </p>
                    </div>
                    <Badge className="bg-green-100 text-green-800 text-lg">
                      +{item.total.toLocaleString()}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {t.admin.creditsAnalytics.noIssuanceData}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Consumers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-rose-500" />
              {t.admin.creditsAnalytics.topConsumers}
            </CardTitle>
            <CardDescription>
              {t.admin.creditsAnalytics.topConsumersDesc}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.top_consumers && stats.top_consumers.length > 0 ? (
              <div className="space-y-3">
                {stats.top_consumers.map((user, index) => (
                  <div
                    key={index}
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
                      -{user.total_consumed.toLocaleString()}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {t.admin.creditsAnalytics.noConsumerData}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Stats Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-amber-500" />
            {t.admin.creditsAnalytics.dailyFlow}
          </CardTitle>
          <CardDescription>
            {t.admin.creditsAnalytics.dailyFlowDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.daily_stats && stats.daily_stats.length > 0 ? (
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">{t.admin.creditsAnalytics.date}</th>
                    <th className="text-right py-2 px-4 text-green-600">
                      {t.admin.creditsAnalytics.issued}
                    </th>
                    <th className="text-right py-2 px-4 text-red-600">
                      {t.admin.creditsAnalytics.consumed}
                    </th>
                    <th className="text-right py-2 px-4">
                      {t.admin.creditsAnalytics.netChange}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.daily_stats.slice().reverse().map((day, index) => (
                    <tr key={index} className="border-b last:border-0">
                      <td className="py-2 px-4 font-medium">{day.date}</td>
                      <td className="text-right py-2 px-4 text-green-600">
                        +{day.issued.toLocaleString()}
                      </td>
                      <td className="text-right py-2 px-4 text-red-600">
                        -{day.consumed.toLocaleString()}
                      </td>
                      <td className={`text-right py-2 px-4 font-medium ${day.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {day.net >= 0 ? '+' : ''}{day.net.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {t.admin.creditsAnalytics.noDailyData}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
