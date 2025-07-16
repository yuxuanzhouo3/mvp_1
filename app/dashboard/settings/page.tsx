'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  Bell, 
  Shield, 
  Globe, 
  Palette,
  Save,
  ArrowLeft
} from 'lucide-react';

interface UserSettings {
  notifications: {
    newMatches: boolean;
    messages: boolean;
    weeklyDigest: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'friends' | 'private';
    showOnlineStatus: boolean;
    allowMessages: boolean;
  };
  preferences: {
    language: string;
    theme: 'light' | 'dark' | 'auto';
    timezone: string;
  };
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<UserSettings>({
    notifications: {
      newMatches: true,
      messages: true,
      weeklyDigest: false,
    },
    privacy: {
      profileVisibility: 'public',
      showOnlineStatus: true,
      allowMessages: true,
    },
    preferences: {
      language: 'zh-CN',
      theme: 'auto',
      timezone: 'Asia/Shanghai',
    },
  });
  
  const [loading, setLoading] = useState(false);
  const [authSettled, setAuthSettled] = useState(false);

  useEffect(() => {
    // Add a delay to allow auth state to settle
    const timer = setTimeout(() => {
      setAuthSettled(true);
      if (!user) {
        console.log('❌ No user found in settings, redirecting to login');
        router.replace('/auth/login');
        return;
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [user, router]);

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // In a real app, you would save to the database
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast({
        title: '设置已保存',
        description: '您的设置已成功更新',
      });
    } catch (error) {
      toast({
        title: '保存失败',
        description: '无法保存设置，请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
      toast({
        title: '已退出登录',
        description: '期待您的再次光临！',
      });
    } catch (error) {
      toast({
        title: '退出失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  // Show loading skeleton while auth is settling
  if (!authSettled) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-6">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4 animate-pulse"></div>
                  <div className="space-y-3">
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="flex items-center justify-between">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-12 animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>返回</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">设置</h1>
              <p className="text-gray-600 dark:text-gray-400">管理您的账户和偏好设置</p>
            </div>
          </div>
          <Button onClick={handleSaveSettings} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? '保存中...' : '保存设置'}
          </Button>
        </div>

        {/* Profile Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>个人资料</span>
            </CardTitle>
            <CardDescription>管理您的个人信息和头像</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback>
                  {user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">
                  {user?.user_metadata?.full_name || user?.email}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">{user?.email}</p>
              </div>
              <Button variant="outline">编辑资料</Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>通知设置</span>
              </CardTitle>
              <CardDescription>管理您接收的通知类型</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="new-matches">新匹配通知</Label>
                <Switch
                  id="new-matches"
                  checked={settings.notifications.newMatches}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, newMatches: checked }
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="messages">消息通知</Label>
                <Switch
                  id="messages"
                  checked={settings.notifications.messages}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, messages: checked }
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="weekly-digest">每周摘要</Label>
                <Switch
                  id="weekly-digest"
                  checked={settings.notifications.weeklyDigest}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, weeklyDigest: checked }
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Privacy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>隐私设置</span>
              </CardTitle>
              <CardDescription>控制您的隐私和可见性</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="online-status">显示在线状态</Label>
                <Switch
                  id="online-status"
                  checked={settings.privacy.showOnlineStatus}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({
                      ...prev,
                      privacy: { ...prev.privacy, showOnlineStatus: checked }
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="allow-messages">允许接收消息</Label>
                <Switch
                  id="allow-messages"
                  checked={settings.privacy.allowMessages}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({
                      ...prev,
                      privacy: { ...prev.privacy, allowMessages: checked }
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="h-5 w-5" />
                <span>偏好设置</span>
              </CardTitle>
              <CardDescription>自定义您的使用体验</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="language">语言</Label>
                <select
                  id="language"
                  value={settings.preferences.language}
                  onChange={(e) =>
                    setSettings(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, language: e.target.value }
                    }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                >
                  <option value="zh-CN">中文 (简体)</option>
                  <option value="en-US">English</option>
                </select>
              </div>
              <div>
                <Label htmlFor="theme">主题</Label>
                <select
                  id="theme"
                  value={settings.preferences.theme}
                  onChange={(e) =>
                    setSettings(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, theme: e.target.value as 'light' | 'dark' | 'auto' }
                    }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                >
                  <option value="auto">跟随系统</option>
                  <option value="light">浅色</option>
                  <option value="dark">深色</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Account */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>账户管理</span>
              </CardTitle>
              <CardDescription>管理您的账户设置</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full">
                更改密码
              </Button>
              <Button variant="outline" className="w-full">
                删除账户
              </Button>
              <Button 
                variant="destructive" 
                className="w-full"
                onClick={handleSignOut}
              >
                退出登录
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 