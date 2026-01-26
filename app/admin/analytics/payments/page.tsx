'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
import {
  DollarSign,
  CreditCard,
  TrendingUp,
  Package,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
  ArrowLeft,
  Coins,
  BarChart3,
} from 'lucide-react';
import Link from 'next/link';

interface PaymentStats {
  overview: {
    total_payments: number;
    total_revenue_cny: number;
    total_revenue_usd: number;
    total_credits_issued: number;
    pending_payments: number;
    failed_payments: number;
    success_rate: number;
  };
  daily_revenue: Array<{
    date: string;
    amount_cny: number;
    amount_usd: number;
    count: number;
  }>;
  monthly_revenue: Array<{
    month: string;
    amount_cny: number;
    amount_usd: number;
    count: number;
  }>;
  package_stats: Array<{
    package_id: string;
    package_name: string;
    credits: number;
    count: number;
    revenue_cny: number;
    revenue_usd: number;
  }>;
  payment_method_stats: Array<{
    method: string;
    count: number;
    revenue_cny: number;
    revenue_usd: number;
  }>;
}

type PaymentsRegion = 'ALL' | 'CN' | 'INTL';

type PaymentStatsResponse = PaymentStats & {
  success: boolean;
  regions?: {
    cn: PaymentStats;
    intl: PaymentStats;
  };
};

const paymentMethodLabels: Record<string, string> = {
  stripe: 'Stripe',
  paypal: 'PayPal',
  alipay: '支付宝',
};

export default function PaymentAnalyticsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = useTranslations(language);

  const [region, setRegion] = useState<PaymentsRegion>('ALL');
  const [stats, setStats] = useState<PaymentStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = async (targetRegion: PaymentsRegion) => {
    try {
      setIsLoading(true);

      const response = await fetch(`/api/admin/payments/stats?region=${targetRegion}`, {
        credentials: 'include',
        cache: 'no-store',
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push('/admin/login');
          return;
        }
        throw new Error('Failed to load stats');
      }

      const data = await response.json();
      if (data.success) {
        setStats(data as PaymentStatsResponse);
      }
    } catch (error) {
      console.error('Load stats error:', error);
      toast({
        title: t.admin.paymentsAnalytics.error,
        description: t.admin.paymentsAnalytics.loadFailed,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats(region);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-gray-900">
              {t.admin.paymentsAnalytics.title}
            </h1>
            <Badge variant="secondary">
              {region === 'ALL' ? 'CN + INTL' : region}
            </Badge>
          </div>
          <p className="text-gray-600 mt-1">
            {t.admin.paymentsAnalytics.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-1 bg-white">
            {(['ALL', 'CN', 'INTL'] as const).map((r) => (
              <Button
                key={r}
                variant={region === r ? 'default' : 'ghost'}
                onClick={() => setRegion(r)}
                className="h-8 px-3"
              >
                {r}
              </Button>
            ))}
          </div>
          <Button variant="outline" onClick={() => loadStats(region)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t.admin.paymentsAnalytics.refresh}
          </Button>
          <Link href="/admin">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t.admin.paymentsAnalytics.back}
            </Button>
          </Link>
        </div>
      </div>

      {region === 'ALL' && stats?.regions ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span>{language === 'zh' ? 'CN 概览' : 'CN Overview'}</span>
                <Badge variant="outline">CN</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{t.admin.paymentsAnalytics.totalRevenueCNY}</span>
                <span className="font-medium text-green-700">¥{stats.regions.cn.overview.total_revenue_cny.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{t.admin.paymentsAnalytics.totalRevenueUSD}</span>
                <span className="font-medium text-blue-700">${stats.regions.cn.overview.total_revenue_usd.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{t.admin.paymentsAnalytics.payments}</span>
                <span className="font-medium">{stats.regions.cn.overview.total_payments}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{t.admin.paymentsAnalytics.creditsIssued}</span>
                <span className="font-medium">{stats.regions.cn.overview.total_credits_issued.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span>{language === 'zh' ? 'INTL 概览' : 'INTL Overview'}</span>
                <Badge variant="outline">INTL</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{t.admin.paymentsAnalytics.totalRevenueCNY}</span>
                <span className="font-medium text-green-700">¥{stats.regions.intl.overview.total_revenue_cny.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{t.admin.paymentsAnalytics.totalRevenueUSD}</span>
                <span className="font-medium text-blue-700">${stats.regions.intl.overview.total_revenue_usd.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{t.admin.paymentsAnalytics.payments}</span>
                <span className="font-medium">{stats.regions.intl.overview.total_payments}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{t.admin.paymentsAnalytics.creditsIssued}</span>
                <span className="font-medium">{stats.regions.intl.overview.total_credits_issued.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Revenue CNY */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t.admin.paymentsAnalytics.totalRevenueCNY}
            </CardTitle>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              ¥{stats?.overview.total_revenue_cny?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats?.overview.total_payments || 0} {t.admin.paymentsAnalytics.payments}
            </p>
          </CardContent>
        </Card>

        {/* Total Revenue USD */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t.admin.paymentsAnalytics.totalRevenueUSD}
            </CardTitle>
            <DollarSign className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              ${stats?.overview.total_revenue_usd?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {t.admin.paymentsAnalytics.usdRevenue}
            </p>
          </CardContent>
        </Card>

        {/* Total Credits Issued */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t.admin.paymentsAnalytics.creditsIssued}
            </CardTitle>
            <Coins className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {stats?.overview.total_credits_issued?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {t.admin.paymentsAnalytics.issuedViaPurchases}
            </p>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t.admin.paymentsAnalytics.successRate}
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {stats?.overview.success_rate?.toFixed(1) || 0}%
            </div>
            <div className="flex items-center gap-2 text-xs mt-1">
              <span className="text-green-600">
                <CheckCircle className="inline h-3 w-3 mr-1" />
                {stats?.overview.total_payments || 0}
              </span>
              <span className="text-red-600">
                <XCircle className="inline h-3 w-3 mr-1" />
                {stats?.overview.failed_payments || 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Package Sales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-indigo-500" />
              {t.admin.paymentsAnalytics.packageSales}
            </CardTitle>
            <CardDescription>
              {t.admin.paymentsAnalytics.packageSalesDesc}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.package_stats && stats.package_stats.length > 0 ? (
              <div className="space-y-4">
                {stats.package_stats.map((pkg, index) => {
                  const totalCount = stats.package_stats.reduce((sum, p) => sum + p.count, 0);
                  const percentage = totalCount > 0 ? ((pkg.count / totalCount) * 100) : 0;

                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium">{pkg.package_name}</span>
                          <span className="text-xs text-gray-500 ml-2">({pkg.credits} {t.admin.paymentsAnalytics.credits})</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium">{pkg.count} {t.admin.paymentsAnalytics.sales}</span>
                          <span className="text-xs text-gray-500 ml-2">({percentage.toFixed(1)}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-500 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 text-right">
                        ¥{pkg.revenue_cny.toFixed(2)} / ${pkg.revenue_usd.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {t.admin.paymentsAnalytics.noSalesData}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-teal-500" />
              {t.admin.paymentsAnalytics.paymentMethods}
            </CardTitle>
            <CardDescription>
              {t.admin.paymentsAnalytics.paymentMethodsDesc}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.payment_method_stats && stats.payment_method_stats.length > 0 ? (
              <div className="space-y-4">
                {stats.payment_method_stats.map((method, index) => {
                  const totalCount = stats.payment_method_stats.reduce((sum, m) => sum + m.count, 0);
                  const percentage = totalCount > 0 ? ((method.count / totalCount) * 100) : 0;

                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                          <CreditCard className="h-5 w-5 text-teal-600" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {paymentMethodLabels[method.method] || method.method}
                          </p>
                          <p className="text-xs text-gray-500">
                            {method.count} {t.admin.paymentsAnalytics.payments} ({percentage.toFixed(1)}%)
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-600">¥{method.revenue_cny.toFixed(2)}</p>
                        <p className="text-xs text-blue-600">${method.revenue_usd.toFixed(2)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {t.admin.paymentsAnalytics.noPaymentData}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Revenue Table */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-cyan-500" />
            {t.admin.paymentsAnalytics.monthlyTrend}
          </CardTitle>
          <CardDescription>
            {t.admin.paymentsAnalytics.monthlyTrendDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.monthly_revenue && stats.monthly_revenue.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">{t.admin.paymentsAnalytics.month}</th>
                    <th className="text-right py-2 px-4">{t.admin.paymentsAnalytics.orders}</th>
                    <th className="text-right py-2 px-4 text-green-600">CNY</th>
                    <th className="text-right py-2 px-4 text-blue-600">USD</th>
                    <th className="text-right py-2 px-4">{t.admin.paymentsAnalytics.total}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.monthly_revenue.map((month, index) => (
                    <tr key={index} className="border-b last:border-0">
                      <td className="py-2 px-4 font-medium">{month.month}</td>
                      <td className="text-right py-2 px-4">{month.count}</td>
                      <td className="text-right py-2 px-4 text-green-600">¥{month.amount_cny.toFixed(2)}</td>
                      <td className="text-right py-2 px-4 text-blue-600">${month.amount_usd.toFixed(2)}</td>
                      <td className="text-right py-2 px-4 font-medium">
                        ¥{(month.amount_cny + month.amount_usd * 7.2).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {t.admin.paymentsAnalytics.noMonthlyData}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Revenue Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            {t.admin.paymentsAnalytics.dailyTrend}
          </CardTitle>
          <CardDescription>
            {t.admin.paymentsAnalytics.dailyTrendDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.daily_revenue && stats.daily_revenue.length > 0 ? (
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">{t.admin.creditsAnalytics.date}</th>
                    <th className="text-right py-2 px-4">{t.admin.paymentsAnalytics.orders}</th>
                    <th className="text-right py-2 px-4 text-green-600">CNY</th>
                    <th className="text-right py-2 px-4 text-blue-600">USD</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.daily_revenue.slice().reverse().map((day, index) => (
                    <tr key={index} className="border-b last:border-0">
                      <td className="py-2 px-4 font-medium">{day.date}</td>
                      <td className="text-right py-2 px-4">{day.count}</td>
                      <td className="text-right py-2 px-4 text-green-600">¥{day.amount_cny.toFixed(2)}</td>
                      <td className="text-right py-2 px-4 text-blue-600">${day.amount_usd.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {t.admin.paymentsAnalytics.noDailyData}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
