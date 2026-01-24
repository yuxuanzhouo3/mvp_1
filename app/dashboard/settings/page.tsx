'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Receipt,
  Settings,
  CheckCircle2,
  Star,
  Zap,
  Flame
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

// Helper to convert language provider format to select option format
const languageToSelectValue = (lang: string): string => {
  return lang === 'zh' ? 'zh-CN' : 'en-US';
};

// Helper to convert select option format to language provider format
const selectValueToLanguage = (value: string): 'en' | 'zh' => {
  return value === 'zh-CN' ? 'zh' : 'en';
};

export default function SettingsPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { language, setLanguage } = useLanguage();
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
      language: languageToSelectValue(language),
      theme: 'auto',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    },
  });

  // Sync settings language with language provider when it changes
  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        language: languageToSelectValue(language),
      },
    }));
  }, [language]);
  
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
    await signOut();
    // signOut already handles cache cleanup and redirect to root
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-16 md:pb-0">
      <div className="max-w-4xl mx-auto px-0 py-0 md:px-4 md:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 md:mb-8 px-3 pt-4 md:px-0 md:pt-0">
          <div className="flex items-center space-x-3 md:space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="items-center space-x-2 hidden md:flex"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t.dashboardSettings.back}</span>
            </Button>
            <div>
              <h1 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white">{language === 'zh' ? '个人资料' : 'Profile'}</h1>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">{t.dashboardSettings.subtitle}</p>
            </div>
          </div>
          <Button onClick={handleSaveSettings} disabled={loading} size="sm" className="h-8 px-3 md:flex hidden">
            <Save className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">{loading ? t.dashboardSettings.saving : t.dashboardSettings.saveSettings}</span>
          </Button>
        </div>

        {/* Profile Card - Mobile Optimized */}
        <Card className="mb-4 md:mb-8 md:hidden mx-3">
          <CardContent className="px-4 py-6">
            <div className="flex flex-col items-center">
              {/* Avatar with Progress Ring */}
              <div className="relative mb-4">
                <div className="relative">
                  <Avatar className="h-24 w-24 border-4 border-white dark:border-gray-800">
                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                    <AvatarFallback className="text-2xl">
                      {user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {/* Progress Indicator */}
                  <div className="absolute -bottom-2 -left-2 bg-gradient-to-r from-pink-500 to-red-500 rounded-full px-3 py-1 flex items-center space-x-1">
                    <span className="text-white text-xs font-bold">23%</span>
                  </div>
                </div>
              </div>

              {/* User Info */}
              <div className="text-center mb-4">
                <div className="flex items-center justify-center space-x-2 mb-1">
                  <h3 className="text-2xl font-bold">
                    {user?.user_metadata?.full_name?.split(' ')[0] || 'User'}, 21
                  </h3>
                  <CheckCircle2 className="h-5 w-5 text-blue-500" />
                </div>
              </div>

              {/* Edit Profile Button */}
              <Button className="w-full bg-black hover:bg-gray-800 text-white rounded-full py-6 text-base font-semibold">
                ✏️ {language === 'zh' ? '编辑个人资料' : 'Edit Profile'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Feature Cards - Mobile Only */}
        <div className="grid grid-cols-3 gap-3 mb-4 md:hidden px-3">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="bg-white dark:bg-gray-800 rounded-full p-3 mb-2">
                <Star className="h-8 w-8 text-blue-500" fill="currentColor" />
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                0 {language === 'zh' ? '个' : ''}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                Super Like
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                {language === 'zh' ? '获得更多' : 'Get More'}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="bg-white dark:bg-gray-800 rounded-full p-3 mb-2">
                <Zap className="h-8 w-8 text-purple-500" fill="currentColor" />
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                {language === 'zh' ? '我的' : 'My'} Boost
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                &nbsp;
              </div>
              <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                {language === 'zh' ? '获得更多' : 'Get More'}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="bg-white dark:bg-gray-800 rounded-full p-3 mb-2">
                <Flame className="h-8 w-8 text-red-500" fill="currentColor" />
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                {language === 'zh' ? '订阅' : 'Subscribe'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                {language === 'zh' ? '套餐' : 'Plans'}
              </div>
              <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                &nbsp;
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mobile Quick Actions - Only visible on mobile */}
        <Card className="mb-4 md:hidden mx-3">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>{language === 'zh' ? '快捷功能' : 'Quick Actions'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-4 gap-2 px-4 pb-4">
            <Button variant="ghost" className="h-auto py-2 px-1 flex flex-col items-center justify-center" asChild>
              <Link href="/profile/score-details">
                <TrendingUp className="h-5 w-5 mb-1 text-blue-500" />
                <span className="text-[10px]">{language === 'zh' ? '市场价值' : 'Value'}</span>
              </Link>
            </Button>
            <Button variant="ghost" className="h-auto py-2 px-1 flex flex-col items-center justify-center" asChild>
              <Link href="/payment/recharge">
                <CreditCard className="h-5 w-5 mb-1 text-green-500" />
                <span className="text-[10px]">{language === 'zh' ? '充值' : 'Recharge'}</span>
              </Link>
            </Button>
            <Button variant="ghost" className="h-auto py-2 px-1 flex flex-col items-center justify-center" asChild>
              <Link href="/dashboard/orders">
                <Receipt className="h-5 w-5 mb-1 text-orange-500" />
                <span className="text-[10px]">{language === 'zh' ? '订单' : 'Orders'}</span>
              </Link>
            </Button>
            <Button variant="ghost" className="h-auto py-2 px-1 flex flex-col items-center justify-center" asChild>
              <Link href="/dashboard/notifications">
                <Bell className="h-5 w-5 mb-1 text-red-500" />
                <span className="text-[10px]">{language === 'zh' ? '通知' : 'Notify'}</span>
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Desktop Profile Card */}
        <Card className="mb-4 md:mb-8 hidden md:block">
          <CardHeader className="py-3 px-4 md:p-6">
            <CardTitle className="text-sm md:text-base flex items-center space-x-2">
              <User className="h-4 w-4 md:h-5 md:w-5" />
              <span>{t.dashboardSettings.profile}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 md:p-6 md:pt-0">
            <div className="flex items-center space-x-3 md:space-x-4">
              <Avatar className="h-12 w-12 md:h-16 md:w-16">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="text-sm md:text-base">
                  {user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm md:text-lg font-semibold truncate">
                  {user?.user_metadata?.full_name || user?.email}
                </h3>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate">{user?.email}</p>
              </div>
              <Button variant="outline" size="sm" className="text-xs md:text-sm shrink-0">
                {language === 'zh' ? '编辑' : 'Edit'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 px-3 md:px-0">
          <Card>
            <CardHeader className="py-3 px-4 md:p-6">
              <CardTitle className="text-sm md:text-base flex items-center space-x-2">
                <Bell className="h-4 w-4 md:h-5 md:w-5" />
                <span>{t.dashboardSettings.notificationSettings}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 md:p-6 md:pt-0 space-y-3 md:space-y-4">
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
            <CardHeader className="py-3 px-4 md:p-6">
              <CardTitle className="text-sm md:text-base flex items-center space-x-2">
                <Shield className="h-4 w-4 md:h-5 md:w-5" />
                <span>{t.dashboardSettings.privacySettings}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 md:p-6 md:pt-0 space-y-3 md:space-y-4">
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
              <div className="pt-2 border-t">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/settings/privacy" className="flex items-center justify-between">
                    <span>{t.dashboardSettings.viewFullPrivacySettings}</span>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3 px-4 md:p-6">
              <CardTitle className="text-sm md:text-base flex items-center space-x-2">
                <Palette className="h-4 w-4 md:h-5 md:w-5" />
                <span>{t.dashboardSettings.preferences}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 md:p-6 md:pt-0 space-y-3 md:space-y-4">
              <div>
                <Label htmlFor="language">{t.dashboardSettings.language}</Label>
                <select
                  id="language"
                  value={settings.preferences.language}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setSettings(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, language: newValue }
                    }));
                    // Also update the actual language provider
                    setLanguage(selectValueToLanguage(newValue));
                  }}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                >
                  <option value="en-US">English</option>
                  <option value="zh-CN">中文 (简体)</option>
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
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                >
                  <option value="auto">{t.dashboardSettings.themeAuto}</option>
                  <option value="light">{t.dashboardSettings.themeLight}</option>
                  <option value="dark">{t.dashboardSettings.themeDark}</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3 px-4 md:p-6">
              <CardTitle className="text-sm md:text-base flex items-center space-x-2">
                <Globe className="h-4 w-4 md:h-5 md:w-5" />
                <span>{t.dashboardSettings.accountManagement}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 md:p-6 md:pt-0 space-y-2 md:space-y-4">
              <Button variant="outline" className="w-full text-sm" size="sm">
                {t.dashboardSettings.changePassword}
              </Button>
              <Button variant="outline" className="w-full text-sm" size="sm">
                {t.dashboardSettings.deleteAccount}
              </Button>
              <Button
                variant="destructive"
                className="w-full text-sm"
                size="sm"
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