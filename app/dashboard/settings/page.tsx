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
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';

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
  const { language } = useLanguage();
  const t = useTranslations(language);

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
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: t.dashboardSettings.settingsSaved,
        description: t.dashboardSettings.settingsSavedDesc,
      });
    } catch (error) {
      toast({
        title: t.dashboardSettings.saveFailed,
        description: t.dashboardSettings.saveFailedDesc,
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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t.dashboardSettings.back}</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t.dashboardSettings.title}</h1>
              <p className="text-gray-600 dark:text-gray-400">{t.dashboardSettings.subtitle}</p>
            </div>
          </div>
          <Button onClick={handleSaveSettings} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? t.dashboardSettings.saving : t.dashboardSettings.saveSettings}
          </Button>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>{t.dashboardSettings.profile}</span>
            </CardTitle>
            <CardDescription>{t.dashboardSettings.profileDesc}</CardDescription>
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
              <Button variant="outline">{t.dashboardSettings.editProfile}</Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>{t.dashboardSettings.notificationSettings}</span>
              </CardTitle>
              <CardDescription>{t.dashboardSettings.notificationSettingsDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="new-matches">{t.dashboardSettings.newMatchNotifications}</Label>
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
                <Label htmlFor="messages">{t.dashboardSettings.messageNotifications}</Label>
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
                <Label htmlFor="weekly-digest">{t.dashboardSettings.weeklyDigest}</Label>
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>{t.dashboardSettings.privacySettings}</span>
              </CardTitle>
              <CardDescription>{t.dashboardSettings.privacySettingsDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="online-status">{t.dashboardSettings.showOnlineStatus}</Label>
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
                <Label htmlFor="allow-messages">{t.dashboardSettings.allowMessages}</Label>
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="h-5 w-5" />
                <span>{t.dashboardSettings.preferences}</span>
              </CardTitle>
              <CardDescription>{t.dashboardSettings.preferencesDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="language">{t.dashboardSettings.language}</Label>
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
                <Label htmlFor="theme">{t.dashboardSettings.theme}</Label>
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
                  <option value="auto">{t.dashboardSettings.themeAuto}</option>
                  <option value="light">{t.dashboardSettings.themeLight}</option>
                  <option value="dark">{t.dashboardSettings.themeDark}</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>{t.dashboardSettings.accountManagement}</span>
              </CardTitle>
              <CardDescription>{t.dashboardSettings.accountManagementDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full">
                {t.dashboardSettings.changePassword}
              </Button>
              <Button variant="outline" className="w-full">
                {t.dashboardSettings.deleteAccount}
              </Button>
              <Button 
                variant="destructive" 
                className="w-full"
                onClick={handleSignOut}
              >
                {t.dashboardSettings.signOut}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 