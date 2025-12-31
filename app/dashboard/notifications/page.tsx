'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { 
  Bell, 
  MessageSquare, 
  Heart, 
  Calendar, 
  ArrowLeft,
  Check,
  X,
  Settings
} from 'lucide-react';
import Link from 'next/link';

interface Notification {
  id: string;
  type: 'match' | 'message' | 'system' | 'payment';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  action_url?: string;
  sender?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    loadNotifications();
  }, [user]);

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/user/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
        setUnreadCount(data.notifications.filter((n: Notification) => !n.is_read).length);
      }
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法加载通知',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/user/notifications/${notificationId}/read`, {
        method: 'PUT',
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, is_read: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      toast({
        title: '操作失败',
        description: '无法标记为已读',
        variant: 'destructive',
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/user/notifications/read-all', {
        method: 'PUT',
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
        toast({
          title: '已全部标记为已读',
        });
      }
    } catch (error) {
      toast({
        title: '操作失败',
        description: '无法标记全部为已读',
        variant: 'destructive',
      });
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    if (notification.action_url) {
      router.push(notification.action_url);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'match':
        return <Heart className="h-5 w-5 text-red-500" />;
      case 'message':
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
      case 'payment':
        return <Bell className="h-5 w-5 text-green-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getNotificationBadge = (type: string) => {
    switch (type) {
      case 'match':
        return <Badge variant="destructive" className="bg-red-100 text-red-800">匹配</Badge>;
      case 'message':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">消息</Badge>;
      case 'payment':
        return <Badge variant="default" className="bg-green-100 text-green-800">支付</Badge>;
      default:
        return <Badge variant="secondary">系统</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return '刚刚';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}小时前`;
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">加载通知中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              通知中心
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              查看您的所有通知和消息
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <Button variant="outline" onClick={markAllAsRead}>
                <Check className="h-4 w-4 mr-2" />
                全部已读
              </Button>
            )}
            <Link href="/dashboard">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回仪表盘
              </Button>
            </Link>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {notifications.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  暂无通知
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  当有新消息、匹配或其他重要事件时，您会在这里看到通知
                </p>
              </CardContent>
            </Card>
          ) : (
            notifications.map((notification) => (
              <Card 
                key={notification.id} 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  !notification.is_read ? 'border-blue-200 bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {notification.title}
                          </h4>
                          {getNotificationBadge(notification.type)}
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">
                            {formatDate(notification.created_at)}
                          </span>
                          
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        {notification.message}
                      </p>
                      
                      {notification.sender && (
                        <div className="flex items-center space-x-2 mt-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={notification.sender.avatar_url} />
                            <AvatarFallback>
                              {notification.sender.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-gray-500">
                            {notification.sender.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 