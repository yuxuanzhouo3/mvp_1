'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
import {
  LayoutDashboard,
  Image,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Shield,
  DollarSign,
  Coins,
  Brain,
} from 'lucide-react';

interface Stats {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  avgReviewTime: number;
}

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = getSupabaseClient();
  const { language } = useLanguage();
  const t = useTranslations(language);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          return;
        }

        const response = await fetch('/api/admin/photos/stats', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          cache: 'no-store',
        });

        if (response.ok) {
          const data = await response.json();
          setStats(data.stats);
        }
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [supabase.auth]);

  const quickActions = [
    {
      title: t.admin.dashboard.photoReviewTitle,
      description: t.admin.dashboard.photoReviewDesc,
      icon: Image,
      path: '/admin/photo-review',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: t.admin.dashboard.analyticsTitle,
      description: t.admin.dashboard.analyticsDesc,
      icon: TrendingUp,
      path: '/admin/analytics/photos',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: language === 'zh' ? '支付统计' : 'Payment Stats',
      description: language === 'zh' ? '查看收入和支付数据' : 'View revenue and payment data',
      icon: DollarSign,
      path: '/admin/analytics/payments',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    {
      title: language === 'zh' ? '积分统计' : 'Credits Stats',
      description: language === 'zh' ? '查看积分发行和消费数据' : 'View credits issuance and consumption',
      icon: Coins,
      path: '/admin/analytics/credits',
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
    {
      title: language === 'zh' ? 'AI预算控制' : 'AI Budget',
      description: language === 'zh' ? '监控AI功能Token使用和预算' : 'Monitor AI token usage and budget',
      icon: Brain,
      path: '/admin/analytics/ai-budget',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Welcome Section */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <Shield className="h-6 sm:h-8 w-6 sm:w-8 text-blue-600" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t.admin.dashboard.title}</h1>
        </div>
        <p className="text-sm sm:text-base text-gray-600">
          {t.admin.dashboard.welcomeBack}, {user?.email}
        </p>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {t.admin.dashboard.pendingReview}
              </CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{stats.totalPending}</div>
              <p className="text-xs text-gray-500 mt-1">{t.admin.dashboard.photosAwaitingReview}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {t.admin.dashboard.totalApproved}
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.totalApproved}</div>
              <p className="text-xs text-gray-500 mt-1">{t.admin.dashboard.approvedPhotos}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {t.admin.dashboard.totalRejected}
              </CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats.totalRejected}</div>
              <p className="text-xs text-gray-500 mt-1">{t.admin.dashboard.rejectedPhotos}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {t.admin.dashboard.avgReviewTime}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {stats.avgReviewTime.toFixed(1)}h
              </div>
              <p className="text-xs text-gray-500 mt-1">{t.admin.dashboard.averageReviewTime}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t.admin.dashboard.quickActions}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action) => (
            <Card
              key={action.path}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push(action.path)}
            >
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-lg ${action.bgColor}`}>
                    <action.icon className={`h-6 w-6 ${action.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      {action.description}
                    </p>
                    <div className="flex items-center text-blue-600 text-sm font-medium">
                      {t.admin.dashboard.open} <ArrowRight className="ml-1 h-4 w-4" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Pending Review Alert */}
      {stats && stats.totalPending > 0 && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:space-x-3">
              <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-800">
                  {stats.totalPending} {t.admin.dashboard.photosNeedReview}
                </h3>
                <p className="text-sm text-yellow-700">
                  {t.admin.dashboard.reviewPrompt}
                </p>
              </div>
              <button
                onClick={() => router.push('/admin/photo-review')}
                className="w-full sm:w-auto px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-center"
              >
                {t.admin.dashboard.reviewNow}
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
