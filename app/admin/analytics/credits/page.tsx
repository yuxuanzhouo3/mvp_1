'use client';

import { useState, useEffect } from 'react';
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
  Coins,
  TrendingUp,
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

type CreditsRegion = 'CN' | 'INTL';

const emptyStats: CreditsStats = {
  overview: {
    total_credits_issued: 0,
    total_credits_consumed: 0,
    total_current_credits: 0,
    total_users: 0,
    users_with_credits: 0,
    average_credits_per_user: 0,
  },
  issue_stats: [],
  consume_stats: [],
  distribution: {
    zero: 0,
    '1-50': 0,
    '51-100': 0,
    '101-200': 0,
    '201-500': 0,
    '500+': 0,
  },
  daily_stats: [],
  top_consumers: [],
};

export default function CreditsAnalyticsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = useTranslations(language);

  const [selectedRegion, setSelectedRegion] = useState<CreditsRegion>(() =>
    isChinaDeployment() ? 'CN' : 'INTL'
  );

  const [cnStats, setCnStats] = useState<CreditsStats | null>(null);
  const [intlStats, setIntlStats] = useState<CreditsStats | null>(null);
  const [cnError, setCnError] = useState<string | null>(null);
  const [intlError, setIntlError] = useState<string | null>(null);
  const [cnLoading, setCnLoading] = useState(false);
  const [intlLoading, setIntlLoading] = useState(false);

  const loadStatsForRegion = async (region: CreditsRegion) => {
    try {
      if (region === 'CN') {
        setCnLoading(true);
        setCnError(null);
      } else {
        setIntlLoading(true);
        setIntlError(null);
      }

      const response = await fetch(`/api/admin/credits/stats?region=${region}`, {
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
        title: t.admin.creditsAnalytics.error,
        description: t.admin.creditsAnalytics.loadFailed,
        variant: 'destructive',
      });
    } finally {
      if (region === 'CN') {
        setCnLoading(false);
      } else {
        setIntlLoading(false);
      }
    }
  };

  const loadAll = async () => {
    await Promise.all([loadStatsForRegion('CN'), loadStatsForRegion('INTL')]);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const distributionLabels: Record<string, string> = {
    zero: t.admin.creditsAnalytics.zeroCredits,
    '1-50': '1-50',
    '51-100': '51-100',
    '101-200': '101-200',
    '201-500': '201-500',
    '500+': '500+',
  };

  const renderStats = (stats: CreditsStats | null, isLoading: boolean, error: string | null) => {
    const safeStats = stats ?? emptyStats;

    return (
      <div className="space-y-6">
        {error ? (
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="py-4">
              <CardTitle className="text-sm text-red-700">{t.admin.creditsAnalytics.error}</CardTitle>
              <CardDescription className="text-red-600 break-all">{error}</CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t.common.loading}
          </div>
        ) : null}

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t.admin.creditsAnalytics.totalIssued}
              </CardTitle>
              <ArrowUpRight className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {safeStats.overview.total_credits_issued?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {t.admin.creditsAnalytics.totalCreditsIssued}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t.admin.creditsAnalytics.totalConsumed}
              </CardTitle>
              <ArrowDownRight className="h-5 w-5 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {safeStats.overview.total_credits_consumed?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {t.admin.creditsAnalytics.totalCreditsConsumed}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t.admin.creditsAnalytics.inCirculation}
              </CardTitle>
              <Wallet className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {safeStats.overview.total_current_credits?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {t.admin.creditsAnalytics.heldByUsers}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t.admin.creditsAnalytics.usersWithCredits}
              </CardTitle>
              <Users className="h-5 w-5 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                {safeStats.overview.users_with_credits?.toLocaleString() || 0}
                <span className="text-lg font-normal text-gray-500 ml-1">
                  / {safeStats.overview.total_users?.toLocaleString() || 0}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {t.admin.creditsAnalytics.average}: {safeStats.overview.average_credits_per_user || 0} {t.admin.creditsAnalytics.avgPerUser}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              {safeStats.consume_stats && safeStats.consume_stats.length > 0 ? (
                <div className="space-y-4">
                  {safeStats.consume_stats.map((item, index) => (
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
              {safeStats.distribution ? (
                <div className="space-y-4">
                  {Object.entries(safeStats.distribution).map(([range, count], index) => {
                    const totalUsers = safeStats.overview.total_users || 1;
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              {safeStats.issue_stats && safeStats.issue_stats.length > 0 ? (
                <div className="space-y-3">
                  {safeStats.issue_stats.map((item, index) => (
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
              {safeStats.top_consumers && safeStats.top_consumers.length > 0 ? (
                <div className="space-y-3">
                  {safeStats.top_consumers.map((user, index) => (
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
                            {user.user_id?.slice(0, 8) || 'unknown'}...
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
            {safeStats.daily_stats && safeStats.daily_stats.length > 0 ? (
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
                    {safeStats.daily_stats.slice().reverse().map((day, index) => (
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
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
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
          <Button variant="outline" onClick={loadAll}>
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

      <Tabs value={selectedRegion} onValueChange={(v) => setSelectedRegion(v as CreditsRegion)}>
        <TabsList className="mb-6">
          <TabsTrigger value="CN" className="gap-2">
            CN
            {cnLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          </TabsTrigger>
          <TabsTrigger value="INTL" className="gap-2">
            INTL
            {intlLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="CN">
          {renderStats(cnStats, cnLoading, cnError)}
        </TabsContent>

        <TabsContent value="INTL">
          {renderStats(intlStats, intlLoading, intlError)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
