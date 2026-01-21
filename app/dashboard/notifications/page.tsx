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
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';

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
  const { user, session } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = useTranslations(language);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user || !session) {
      router.push('/auth/login');
      return;
    }

    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, session]);

  const loadNotifications = async () => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/user/notifications', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
        cache: 'no-store',
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
        setUnreadCount(data.notifications.filter((n: Notification) => !n.is_read).length);
      }
    } catch (error) {
      toast({
        title: t.dashboardNotifications.operationFailed,
        description: t.dashboardNotifications.markAsReadFailed,
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
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
        cache: 'no-store',
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
        title: t.dashboardNotifications.operationFailed,
        description: t.dashboardNotifications.markAsReadFailed,
        variant: 'destructive',
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/user/notifications', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
        cache: 'no-store',
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
        toast({
          title: t.dashboardNotifications.allMarkedAsRead,
        });
      }
    } catch (error) {
      toast({
        title: t.dashboardNotifications.operationFailed,
        description: t.dashboardNotifications.markAllReadFailed,
        variant: 'destructive',
      });
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    const targetUrl =
      notification.action_url ||
      (notification.type === 'payment'
        ? '/dashboard/orders'
        : notification.type === 'match'
          ? '/matching?likedYou=1'
          : null);

    if (targetUrl) {
      router.push(targetUrl);
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
        return <Badge variant="destructive" className="bg-red-100 text-red-800">{t.dashboardNotifications.typeMatch}</Badge>;
      case 'message':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">{t.dashboardNotifications.typeMessage}</Badge>;
      case 'payment':
        return <Badge variant="default" className="bg-green-100 text-green-800">{t.dashboardNotifications.typePayment}</Badge>;
      default:
        return <Badge variant="secondary">{t.dashboardNotifications.typeSystem}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return t.dashboardNotifications.timeJustNow;
    } else if (diffInHours < 24) {
      return t.dashboardNotifications.timeHoursAgo.replace('{hours}', String(Math.floor(diffInHours)));
    } else if (diffInHours < 168) {
      return t.dashboardNotifications.timeDaysAgo.replace('{days}', String(Math.floor(diffInHours / 24)));
    } else {
      return date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 min-h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t.dashboardNotifications.title}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {t.dashboardNotifications.subtitle}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <Button variant="outline" onClick={markAllAsRead}>
                <Check className="h-4 w-4 mr-2" />
                {t.dashboardNotifications.markAllAsRead}
              </Button>
            )}
            <Link href="/dashboard">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t.dashboardNotifications.backToDashboard}
              </Button>
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          {notifications.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {t.dashboardNotifications.noNotifications}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {t.dashboardNotifications.noNotificationsDesc}
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
