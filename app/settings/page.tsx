'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
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
  const [mounted, setMounted] = useState(false);
  const { language, toggleLanguage } = useLanguage();
  const t = useTranslations(language);

  const [settings, setSettings] = useState({
    notifications: true,
    emailUpdates: true,
    darkMode: false,
    language: language,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (!user) {
      router.push('/auth/login');
      return;
    }
  }, [user, router, mounted]);

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
        cache: 'no-store',
      });

      if (response.ok) {
        toast({
          title: t.dashboardSettings.settingsSaved,
          description: t.dashboardSettings.settingsSavedDesc,
        });
      }
    } catch (error) {
      toast({
        title: t.dashboardSettings.saveFailed,
        description: t.dashboardSettings.saveFailedDesc,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
      toast({
        title: t.dashboardSettings.signOutSuccess,
        description: t.dashboardSettings.signOutSuccessDesc,
      });
    } catch (error) {
      toast({
        title: t.dashboardSettings.signOutFailed,
        description: t.dashboardSettings.signOutFailedDesc,
        variant: 'destructive',
      });
    }
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return <div suppressHydrationWarning />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t.dashboardSettings.title}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t.dashboardSettings.subtitle}
          </p>
        </div>

        <div className="grid gap-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                {t.dashboardSettings.profile}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">
                    {language === 'zh' ? '显示名称' : 'Display Name'}
                  </label>
                  <Input
                    defaultValue={user.user_metadata?.full_name || ''}
                    placeholder={language === 'zh' ? '输入显示名称' : 'Enter display name'}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">{t.profile.email}</label>
                  <Input
                    defaultValue={user.email || ''}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>
              <Button onClick={() => router.push('/profile/edit')}>
                {t.dashboardSettings.editProfile}
              </Button>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                {t.dashboardSettings.notificationSettings}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {language === 'zh' ? '推送通知' : 'Push Notifications'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {language === 'zh' ? '接收新消息和匹配通知' : 'Receive new messages and match notifications'}
                  </p>
                </div>
                <Switch
                  checked={settings.notifications}
                  onCheckedChange={(checked) => handleSettingChange('notifications', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {language === 'zh' ? '邮件更新' : 'Email Updates'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {language === 'zh' ? '接收重要更新和活动通知' : 'Receive important updates and activity notifications'}
                  </p>
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
                {t.dashboardSettings.privacySettings}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {language === 'zh' ? '在线状态' : 'Online Status'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {language === 'zh' ? '允许其他用户看到您的在线状态' : 'Allow other users to see your online status'}
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {language === 'zh' ? '位置信息' : 'Location Information'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {language === 'zh' ? '在匹配中显示您的位置' : 'Show your location in matches'}
                  </p>
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
                {language === 'zh' ? '支付设置' : 'Payment Settings'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => router.push('/payment/recharge')}>
                {language === 'zh' ? '管理支付方式' : 'Manage Payment Methods'}
              </Button>
            </CardContent>
          </Card>

          {/* Language Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                {t.dashboardSettings.language}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {language === 'zh' ? '当前语言' : 'Current Language'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {language === 'zh' ? '中文（简体）' : 'English (US)'}
                  </p>
                </div>
                <Button variant="outline" onClick={toggleLanguage}>
                  {t.header.switchLanguage}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
            >
              {t.common.back}
            </Button>
            <div className="space-x-2">
              <Button
                variant="outline"
                onClick={handleSaveSettings}
                disabled={isLoading}
              >
                {isLoading ? t.dashboardSettings.saving : t.dashboardSettings.saveSettings}
              </Button>
              <Button
                variant="destructive"
                onClick={handleSignOut}
              >
                {t.dashboardSettings.signOut}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
