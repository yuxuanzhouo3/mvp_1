'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Heart,
  MessageSquare,
  Users,
  TrendingUp,
  Calendar,
  Clock,
  Star
} from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { useTranslations, interpolate } from '@/lib/i18n';

interface DashboardStatsProps {
  stats: {
    totalMatches: number;
    totalMessages: number;
    activeChats: number;
    profileCompletion: number;
    weeklyMatches: number;
    averageResponseTime: number;
    topInterests: string[];
    recentActivity: {
      type: string;
      description: string;
      timestamp: string;
    }[];
  };
}

export default function DashboardStats({ stats }: DashboardStatsProps) {
  const { language } = useLanguage();
  const t = useTranslations(language);

  const getResponseTimeColor = (time: number) => {
    if (time < 1) return 'text-green-600';
    if (time < 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getResponseTimeText = (time: number) => {
    if (time < 24) return interpolate(t.dashboardStats.hours, { time: time.toString() });
    return interpolate(t.dashboardStats.days, { time: Math.floor(time / 24).toString() });
  };

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Heart className="h-8 w-8 text-red-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t.dashboardStats.totalMatches}
                </p>
                <p className="text-2xl font-bold">{stats.totalMatches}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t.dashboardStats.messageCount}
                </p>
                <p className="text-2xl font-bold">{stats.totalMessages}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t.dashboardStats.activeChats}
                </p>
                <p className="text-2xl font-bold">{stats.activeChats}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t.dashboardStats.profileCompletion}
                </p>
                <p className="text-2xl font-bold">{stats.profileCompletion}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              {t.dashboardStats.weeklyActivity}
            </CardTitle>
            <CardDescription>
              {t.dashboardStats.weeklyActivityDesc}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t.dashboardStats.newMatches}
              </span>
              <span className="font-medium">{stats.weeklyMatches}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t.dashboardStats.avgResponseTime}
              </span>
              <span className={`font-medium ${getResponseTimeColor(stats.averageResponseTime)}`}>
                {getResponseTimeText(stats.averageResponseTime)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t.dashboardStats.onlineDuration}
              </span>
              <span className="font-medium">{interpolate(t.dashboardStats.hours, { time: '12.5' })}</span>
            </div>
          </CardContent>
        </Card>

        {/* Top Interests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Star className="h-5 w-5 mr-2" />
              {t.dashboardStats.topInterests}
            </CardTitle>
            <CardDescription>
              {t.dashboardStats.topInterestsDesc}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.topInterests.map((interest, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="text-xs"
                >
                  {interest}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            {t.dashboardStats.recentActivity}
          </CardTitle>
          <CardDescription>
            {t.dashboardStats.recentActivityDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">{activity.description}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {activity.type}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
