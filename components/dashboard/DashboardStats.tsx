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
  MapPin,
  Star
} from 'lucide-react';

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
  const getResponseTimeColor = (time: number) => {
    if (time < 1) return 'text-green-600';
    if (time < 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getResponseTimeText = (time: number) => {
    if (time < 1) return `${time} 小时`;
    if (time < 24) return `${time} 小时`;
    return `${Math.floor(time / 24)} 天`;
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
                  总匹配数
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
                  消息数量
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
                  活跃聊天
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
                  资料完整度
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
              本周活动
            </CardTitle>
            <CardDescription>
              过去7天的活跃度统计
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                新匹配
              </span>
              <span className="font-medium">{stats.weeklyMatches}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                平均响应时间
              </span>
              <span className={`font-medium ${getResponseTimeColor(stats.averageResponseTime)}`}>
                {getResponseTimeText(stats.averageResponseTime)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                在线时长
              </span>
              <span className="font-medium">12.5 小时</span>
            </div>
          </CardContent>
        </Card>

        {/* Top Interests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Star className="h-5 w-5 mr-2" />
              热门兴趣
            </CardTitle>
            <CardDescription>
              您最受欢迎的兴趣标签
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
            最近活动
          </CardTitle>
          <CardDescription>
            您的最近操作记录
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