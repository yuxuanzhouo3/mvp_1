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

const paymentMethodLabels: Record<string, string> = {
  stripe: 'Stripe',
  paypal: 'PayPal',
  alipay: '支付宝',
};

export default function PaymentAnalyticsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { language } = useLanguage();

  const [stats, setStats] = useState<PaymentStats | null>(null);
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

      const response = await fetch('/api/admin/payments/stats', {
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

  const formatCurrency = (amount: number, currency: 'CNY' | 'USD') => {
    if (currency === 'USD') {
      return `$${amount.toFixed(2)}`;
    }
    return `¥${amount.toFixed(2)}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {language === 'zh' ? '支付统计' : 'Payment Analytics'}
          </h1>
          <p className="text-gray-600 mt-1">
            {language === 'zh' ? '收入和支付数据概览' : 'Overview of revenue and payment data'}
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

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Revenue CNY */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'zh' ? '总收入 (CNY)' : 'Total Revenue (CNY)'}
            </CardTitle>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              ¥{stats?.overview.total_revenue_cny?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats?.overview.total_payments || 0} {language === 'zh' ? '笔支付' : 'payments'}
            </p>
          </CardContent>
        </Card>

        {/* Total Revenue USD */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'zh' ? '总收入 (USD)' : 'Total Revenue (USD)'}
            </CardTitle>
            <DollarSign className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              ${stats?.overview.total_revenue_usd?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {language === 'zh' ? '美元收入' : 'USD revenue'}
            </p>
          </CardContent>
        </Card>

        {/* Total Credits Issued */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'zh' ? '已发放积分' : 'Credits Issued'}
            </CardTitle>
            <Coins className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {stats?.overview.total_credits_issued?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {language === 'zh' ? '通过购买发放' : 'issued via purchases'}
            </p>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'zh' ? '支付成功率' : 'Success Rate'}
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
              {language === 'zh' ? '套餐销量' : 'Package Sales'}
            </CardTitle>
            <CardDescription>
              {language === 'zh' ? '各套餐的销售情况' : 'Sales breakdown by package'}
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
                          <span className="text-xs text-gray-500 ml-2">({pkg.credits} {language === 'zh' ? '积分' : 'credits'})</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium">{pkg.count} {language === 'zh' ? '笔' : 'sales'}</span>
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
                {language === 'zh' ? '暂无销售数据' : 'No sales data available'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-teal-500" />
              {language === 'zh' ? '支付方式分布' : 'Payment Methods'}
            </CardTitle>
            <CardDescription>
              {language === 'zh' ? '各支付方式的使用情况' : 'Usage breakdown by payment method'}
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
                            {method.count} {language === 'zh' ? '笔' : 'payments'} ({percentage.toFixed(1)}%)
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
                {language === 'zh' ? '暂无支付数据' : 'No payment data available'}
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
            {language === 'zh' ? '月度收入趋势' : 'Monthly Revenue Trend'}
          </CardTitle>
          <CardDescription>
            {language === 'zh' ? '过去12个月的收入数据' : 'Revenue data for the past 12 months'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.monthly_revenue && stats.monthly_revenue.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">{language === 'zh' ? '月份' : 'Month'}</th>
                    <th className="text-right py-2 px-4">{language === 'zh' ? '订单数' : 'Orders'}</th>
                    <th className="text-right py-2 px-4 text-green-600">CNY</th>
                    <th className="text-right py-2 px-4 text-blue-600">USD</th>
                    <th className="text-right py-2 px-4">{language === 'zh' ? '合计' : 'Total'}</th>
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
              {language === 'zh' ? '暂无月度数据' : 'No monthly data available'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Revenue Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            {language === 'zh' ? '每日收入趋势' : 'Daily Revenue Trend'}
          </CardTitle>
          <CardDescription>
            {language === 'zh' ? '过去30天的收入数据' : 'Revenue data for the past 30 days'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.daily_revenue && stats.daily_revenue.length > 0 ? (
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">{language === 'zh' ? '日期' : 'Date'}</th>
                    <th className="text-right py-2 px-4">{language === 'zh' ? '订单数' : 'Orders'}</th>
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
              {language === 'zh' ? '暂无每日数据' : 'No daily data available'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
