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
  Clock,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Users,
  AlertTriangle,
  RefreshCw,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

interface ReviewStats {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  avgReviewTimeHours: number | null;
  approvalRate: number;
  rejectionRate: number;
  topReasons: Array<{ reason: string; count: number }>;
  reviewerStats: Array<{
    reviewerId: string;
    reviewerName: string;
    approvedCount: number;
    rejectedCount: number;
    avgTimeHours: number;
  }>;
  dailyStats: Array<{
    date: string;
    approved: number;
    rejected: number;
    pending: number;
  }>;
}

export default function PhotoAnalyticsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = useTranslations(language);

  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = async () => {
    try {
      setIsLoading(true);

      // Get current session token
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        console.error('No session token available');
        router.push('/auth/login');
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/admin/photos/stats', {
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
      setStats(data);
    } catch (error) {
      console.error('Load stats error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load statistics',
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {language === 'zh' ? '审核统计' : 'Review Analytics'}
          </h1>
          <p className="text-gray-600 mt-1">
            {language === 'zh' ? '照片审核数据概览' : 'Overview of photo review metrics'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadStats}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {language === 'zh' ? '刷新' : 'Refresh'}
          </Button>
          <Link href="/admin/photo-review">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {language === 'zh' ? '返回审核' : 'Back to Review'}
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Pending */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'zh' ? '待审核' : 'Pending'}
            </CardTitle>
            <Clock className="h-5 w-5 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {stats?.totalPending || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {language === 'zh' ? '待处理照片' : 'photos awaiting review'}
            </p>
          </CardContent>
        </Card>

        {/* Approved */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'zh' ? '已通过' : 'Approved'}
            </CardTitle>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats?.totalApproved || 0}
            </div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              {stats?.approvalRate?.toFixed(1) || 0}% {language === 'zh' ? '通过率' : 'approval rate'}
            </div>
          </CardContent>
        </Card>

        {/* Rejected */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'zh' ? '已拒绝' : 'Rejected'}
            </CardTitle>
            <XCircle className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {stats?.totalRejected || 0}
            </div>
            <div className="flex items-center text-xs text-red-600 mt-1">
              <TrendingDown className="h-3 w-3 mr-1" />
              {stats?.rejectionRate?.toFixed(1) || 0}% {language === 'zh' ? '拒绝率' : 'rejection rate'}
            </div>
          </CardContent>
        </Card>

        {/* Avg Review Time */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {language === 'zh' ? '平均审核时长' : 'Avg Review Time'}
            </CardTitle>
            <BarChart3 className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {stats?.avgReviewTimeHours?.toFixed(1) || '-'}
              <span className="text-lg font-normal text-gray-500 ml-1">
                {language === 'zh' ? '小时' : 'hrs'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {language === 'zh' ? '从上传到审核' : 'from upload to review'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Rejection Reasons */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              {language === 'zh' ? '最常见拒绝原因' : 'Top Rejection Reasons'}
            </CardTitle>
            <CardDescription>
              {language === 'zh' ? '照片被拒绝的主要原因' : 'Main reasons for photo rejection'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.topReasons && stats.topReasons.length > 0 ? (
              <div className="space-y-4">
                {stats.topReasons.slice(0, 5).map((item, index) => {
                  const total = stats.topReasons.reduce((sum, r) => sum + r.count, 0);
                  const percentage = ((item.count / total) * 100).toFixed(1);

                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate max-w-[200px]">
                          {item.reason}
                        </span>
                        <span className="text-sm text-gray-500">
                          {item.count} ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-orange-500 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {language === 'zh' ? '暂无拒绝记录' : 'No rejection data available'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reviewer Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              {language === 'zh' ? '审核员统计' : 'Reviewer Statistics'}
            </CardTitle>
            <CardDescription>
              {language === 'zh' ? '各审核员的处理情况' : 'Processing stats by reviewer'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.reviewerStats && stats.reviewerStats.length > 0 ? (
              <div className="space-y-4">
                {stats.reviewerStats.slice(0, 5).map((reviewer, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {reviewer.reviewerName || reviewer.reviewerId.slice(0, 8)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {language === 'zh' ? '平均' : 'Avg'}: {reviewer.avgTimeHours?.toFixed(1) || '-'}h
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {reviewer.approvedCount}
                      </Badge>
                      <Badge className="bg-red-100 text-red-800">
                        <XCircle className="h-3 w-3 mr-1" />
                        {reviewer.rejectedCount}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {language === 'zh' ? '暂无审核员数据' : 'No reviewer data available'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Trend (Simplified without chart library) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-purple-500" />
            {language === 'zh' ? '每日审核趋势' : 'Daily Review Trend'}
          </CardTitle>
          <CardDescription>
            {language === 'zh' ? '过去7天的审核数据' : 'Review data for the past 7 days'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.dailyStats && stats.dailyStats.length > 0 ? (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4">{language === 'zh' ? '日期' : 'Date'}</th>
                      <th className="text-right py-2 px-4 text-green-600">
                        {language === 'zh' ? '通过' : 'Approved'}
                      </th>
                      <th className="text-right py-2 px-4 text-red-600">
                        {language === 'zh' ? '拒绝' : 'Rejected'}
                      </th>
                      <th className="text-right py-2 px-4 text-yellow-600">
                        {language === 'zh' ? '待审核' : 'Pending'}
                      </th>
                      <th className="text-right py-2 px-4">
                        {language === 'zh' ? '总计' : 'Total'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.dailyStats.map((day, index) => (
                      <tr key={index} className="border-b last:border-0">
                        <td className="py-2 px-4 font-medium">{day.date}</td>
                        <td className="text-right py-2 px-4 text-green-600">{day.approved}</td>
                        <td className="text-right py-2 px-4 text-red-600">{day.rejected}</td>
                        <td className="text-right py-2 px-4 text-yellow-600">{day.pending}</td>
                        <td className="text-right py-2 px-4 font-medium">
                          {day.approved + day.rejected + day.pending}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {language === 'zh' ? '暂无趋势数据' : 'No trend data available'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
