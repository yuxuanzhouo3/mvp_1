'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Bell, 
  Shield, 
  CreditCard, 
  Globe,
  Moon,
  Sun
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState({
    notifications: true,
    emailUpdates: true,
    darkMode: false,
    language: 'zh-CN',
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
  }, [user, router]);

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      // Save settings to backend
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast({
          title: '设置已保存',
          description: '您的设置已成功更新',
        });
      }
    } catch (error) {
      toast({
        title: '保存失败',
        description: '无法保存设置，请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            设置
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            管理您的账户设置和偏好
          </p>
        </div>

        <div className="grid gap-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                个人资料
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">显示名称</label>
                  <Input 
                    defaultValue={user.user_metadata?.full_name || ''}
                    placeholder="输入显示名称"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">邮箱</label>
                  <Input 
                    defaultValue={user.email || ''}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>
              <Button onClick={() => router.push('/profile/edit')}>
                编辑完整资料
              </Button>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                通知设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">推送通知</p>
                  <p className="text-sm text-gray-600">接收新消息和匹配通知</p>
                </div>
                <Switch
                  checked={settings.notifications}
                  onCheckedChange={(checked) => handleSettingChange('notifications', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">邮件更新</p>
                  <p className="text-sm text-gray-600">接收重要更新和活动通知</p>
                </div>
                <Switch
                  checked={settings.emailUpdates}
                  onCheckedChange={(checked) => handleSettingChange('emailUpdates', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                隐私设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">在线状态</p>
                  <p className="text-sm text-gray-600">允许其他用户看到您的在线状态</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">位置信息</p>
                  <p className="text-sm text-gray-600">在匹配中显示您的位置</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          {/* Payment Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                支付设置
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => router.push('/payment/recharge')}>
                管理支付方式
              </Button>
            </CardContent>
          </Card>

          {/* Language Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                语言设置
              </CardTitle>
            </CardHeader>
            <CardContent>
              <select 
                value={settings.language}
                onChange={(e) => handleSettingChange('language', e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="zh-CN">中文 (简体)</option>
                <option value="en-US">English (US)</option>
                <option value="ja-JP">日本語</option>
              </select>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => router.push('/dashboard')}
            >
              返回仪表盘
            </Button>
            <div className="space-x-2">
              <Button 
                variant="outline" 
                onClick={handleSaveSettings}
                disabled={isLoading}
              >
                {isLoading ? '保存中...' : '保存设置'}
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleSignOut}
              >
                退出登录
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 