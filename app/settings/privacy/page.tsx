'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield, Search, Bell, Loader2, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
import { useAuth } from '@/app/providers/AuthProvider';
import {
  PrivacySwitch,
  RangeSlider,
  RadiusSlider,
  EducationSelect,
  IncomeSelect,
} from '@/components/settings';
import { useSettings } from '@/hooks/useSettings';
import { updateAIChatConsent } from '@/lib/services/ai-service';

export default function PrivacySettingsPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = useTranslations(language);
  const { session, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('privacy');
  const [aiChatConsent, setAiChatConsent] = useState(false);
  const [aiConsentLoading, setAiConsentLoading] = useState(false);

  const { privacy, preferences, notifications, isLoading, isSaving } = useSettings();

  // Load AI chat consent status
  useEffect(() => {
    const loadAiConsent = async () => {
      if (!session?.user?.id) return;
      try {
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const data = await response.json();
          setAiChatConsent(data.ai_chat_consent ?? false);
        }
      } catch (error) {
        console.error('Failed to load AI consent:', error);
      }
    };
    loadAiConsent();
  }, [session?.user?.id]);

  const handleAiConsentChange = async (checked: boolean) => {
    setAiConsentLoading(true);
    try {
      await updateAIChatConsent(checked);
      setAiChatConsent(checked);
    } catch (error) {
      console.error('Failed to update AI consent:', error);
    } finally {
      setAiConsentLoading(false);
    }
  };

  // Redirect if not authenticated
  if (!authLoading && !session) {
    router.push('/auth/login');
    return null;
  }

  const renderSkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center justify-between py-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-6 w-12" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard')}
            aria-label={t.common.back}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {t.settingsPage.title}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t.settingsPage.subtitle}
            </p>
          </div>
          {isSaving && (
            <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t.common.saving}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">{t.settingsPage.privacy.title}</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">{t.settingsPage.preferences.title}</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">{t.settingsPage.notifications.title}</span>
            </TabsTrigger>
          </TabsList>

          {/* Privacy Tab */}
          <TabsContent value="privacy">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-pink-500" />
                  {t.settingsPage.privacy.title}
                </CardTitle>
                <CardDescription>
                  {t.settingsPage.privacy.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {privacy.isLoading ? (
                  renderSkeleton()
                ) : (
                  <div className="space-y-2">
                    <PrivacySwitch
                      id="show-income"
                      label={t.settingsPage.privacy.showIncome}
                      description={t.settingsPage.privacy.showIncomeDesc}
                      checked={privacy.privacy.show_income ?? true}
                      onCheckedChange={(checked) =>
                        privacy.updatePrivacy({ show_income: checked })
                      }
                      disabled={privacy.isSaving}
                    />

                    <PrivacySwitch
                      id="show-location"
                      label={t.settingsPage.privacy.showExactLocation}
                      description={t.settingsPage.privacy.showExactLocationDesc}
                      checked={privacy.privacy.show_exact_location ?? false}
                      onCheckedChange={(checked) =>
                        privacy.updatePrivacy({ show_exact_location: checked })
                      }
                      disabled={privacy.isSaving}
                    />

                    <PrivacySwitch
                      id="show-online"
                      label={t.settingsPage.privacy.showOnlineStatus}
                      description={t.settingsPage.privacy.showOnlineStatusDesc}
                      checked={privacy.privacy.show_online_status ?? true}
                      onCheckedChange={(checked) =>
                        privacy.updatePrivacy({ show_online_status: checked })
                      }
                      disabled={privacy.isSaving}
                    />

                    <PrivacySwitch
                      id="show-last-active"
                      label={t.settingsPage.privacy.showLastActive}
                      description={t.settingsPage.privacy.showLastActiveDesc}
                      checked={privacy.privacy.show_last_active ?? true}
                      onCheckedChange={(checked) =>
                        privacy.updatePrivacy({ show_last_active: checked })
                      }
                      disabled={privacy.isSaving}
                    />

                    <div className="py-4 border-b border-gray-100 dark:border-gray-800">
                      <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {t.settingsPage.privacy.allowMessagesFrom}
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        {t.settingsPage.privacy.allowMessagesFromDesc}
                      </p>
                      <Select
                        value={privacy.privacy.allow_messages_from ?? 'matches'}
                        onValueChange={(value: 'everyone' | 'matches' | 'none') =>
                          privacy.updatePrivacy({ allow_messages_from: value })
                        }
                        disabled={privacy.isSaving}
                      >
                        <SelectTrigger className="w-full sm:w-64">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="everyone">
                            {t.settingsPage.privacy.messagesEveryone}
                          </SelectItem>
                          <SelectItem value="matches">
                            {t.settingsPage.privacy.messagesMatches}
                          </SelectItem>
                          <SelectItem value="none">
                            {t.settingsPage.privacy.messagesNone}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="py-4">
                      <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {t.settingsPage.privacy.showProfileTo}
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        {t.settingsPage.privacy.showProfileToDesc}
                      </p>
                      <Select
                        value={privacy.privacy.show_profile_to ?? 'everyone'}
                        onValueChange={(value: 'everyone' | 'matches' | 'none') =>
                          privacy.updatePrivacy({ show_profile_to: value })
                        }
                        disabled={privacy.isSaving}
                      >
                        <SelectTrigger className="w-full sm:w-64">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="everyone">
                            {t.settingsPage.privacy.profileEveryone}
                          </SelectItem>
                          <SelectItem value="matches">
                            {t.settingsPage.privacy.profileMatches}
                          </SelectItem>
                          <SelectItem value="none">
                            {t.settingsPage.privacy.profileNone}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* AI Chat Consent */}
                    <div className="py-4 border-t border-gray-100 dark:border-gray-800">
                      <div className="flex items-start gap-3 mb-2">
                        <Bot className="h-5 w-5 text-purple-500 mt-0.5" />
                        <div className="flex-1">
                          <PrivacySwitch
                            id="ai-chat-consent"
                            label={language === 'zh' ? '允许AI模拟对话' : 'Allow AI Chat Simulation'}
                            description={language === 'zh'
                              ? '允许其他用户使用AI模拟与您的对话风格进行练习。这是一个Beta功能，AI回复仅供参考。'
                              : 'Allow other users to practice conversations with an AI that simulates your chat style. This is a Beta feature, AI responses are for reference only.'}
                            checked={aiChatConsent}
                            onCheckedChange={handleAiConsentChange}
                            disabled={aiConsentLoading}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-pink-500" />
                  {t.settingsPage.preferences.title}
                </CardTitle>
                <CardDescription>
                  {t.settingsPage.preferences.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {preferences.isLoading ? (
                  renderSkeleton()
                ) : (
                  <>
                    <RadiusSlider
                      id="search-radius"
                      label={t.settingsPage.preferences.searchRadius}
                      min={5}
                      max={200}
                      step={5}
                      value={preferences.preferences.search_radius_km ?? 50}
                      onValueChange={(value) =>
                        preferences.debouncedUpdatePreferences({ search_radius_km: value })
                      }
                      disabled={preferences.isSaving}
                    />

                    <RangeSlider
                      id="age-range"
                      label={t.settingsPage.preferences.ageRange}
                      min={18}
                      max={100}
                      step={1}
                      value={[
                        preferences.preferences.age_range_min ?? 18,
                        preferences.preferences.age_range_max ?? 60,
                      ]}
                      onValueChange={([min, max]) =>
                        preferences.debouncedUpdatePreferences({
                          age_range_min: min,
                          age_range_max: max,
                        })
                      }
                      unit={t.common.age}
                      disabled={preferences.isSaving}
                    />

                    <RangeSlider
                      id="height-range"
                      label={t.settingsPage.preferences.heightRange}
                      min={100}
                      max={250}
                      step={1}
                      value={[
                        preferences.preferences.height_range_min ?? 140,
                        preferences.preferences.height_range_max ?? 220,
                      ]}
                      onValueChange={([min, max]) =>
                        preferences.debouncedUpdatePreferences({
                          height_range_min: min,
                          height_range_max: max,
                        })
                      }
                      unit="cm"
                      disabled={preferences.isSaving}
                    />

                    <EducationSelect
                      id="education-requirement"
                      label={t.settingsPage.preferences.educationRequirement}
                      value={preferences.preferences.education_requirement ?? 'any'}
                      onValueChange={(value) =>
                        preferences.updatePreferences({ education_requirement: value as any })
                      }
                      disabled={preferences.isSaving}
                    />

                    <IncomeSelect
                      id="income-requirement"
                      label={t.settingsPage.preferences.incomeRequirement}
                      value={preferences.preferences.income_requirement ?? 'any'}
                      onValueChange={(value) =>
                        preferences.updatePreferences({ income_requirement: value as any })
                      }
                      disabled={preferences.isSaving}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-pink-500" />
                  {t.settingsPage.notifications.title}
                </CardTitle>
                <CardDescription>
                  {t.settingsPage.notifications.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {notifications.isLoading ? (
                  renderSkeleton()
                ) : (
                  <div className="space-y-2">
                    <PrivacySwitch
                      id="new-match"
                      label={t.settingsPage.notifications.newMatch}
                      description={t.settingsPage.notifications.newMatchDesc}
                      checked={notifications.notifications.new_match ?? true}
                      onCheckedChange={(checked) =>
                        notifications.updateNotifications({ new_match: checked })
                      }
                      disabled={notifications.isSaving}
                    />

                    <PrivacySwitch
                      id="new-message"
                      label={t.settingsPage.notifications.newMessage}
                      description={t.settingsPage.notifications.newMessageDesc}
                      checked={notifications.notifications.new_message ?? true}
                      onCheckedChange={(checked) =>
                        notifications.updateNotifications({ new_message: checked })
                      }
                      disabled={notifications.isSaving}
                    />

                    <PrivacySwitch
                      id="system-notifications"
                      label={t.settingsPage.notifications.systemNotifications}
                      description={t.settingsPage.notifications.systemNotificationsDesc}
                      checked={notifications.notifications.system_notifications ?? true}
                      onCheckedChange={(checked) =>
                        notifications.updateNotifications({ system_notifications: checked })
                      }
                      disabled={notifications.isSaving}
                    />

                    <PrivacySwitch
                      id="email-notifications"
                      label={t.settingsPage.notifications.emailNotifications}
                      description={t.settingsPage.notifications.emailNotificationsDesc}
                      checked={notifications.notifications.email_notifications ?? true}
                      onCheckedChange={(checked) =>
                        notifications.updateNotifications({ email_notifications: checked })
                      }
                      disabled={notifications.isSaving}
                    />

                    <PrivacySwitch
                      id="weekly-digest"
                      label={t.settingsPage.notifications.weeklyDigest}
                      description={t.settingsPage.notifications.weeklyDigestDesc}
                      checked={notifications.notifications.weekly_digest ?? false}
                      onCheckedChange={(checked) =>
                        notifications.updateNotifications({ weekly_digest: checked })
                      }
                      disabled={notifications.isSaving}
                    />

                    <div className="py-4">
                      <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {t.settingsPage.notifications.pushChannel}
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        {t.settingsPage.notifications.pushChannelDesc}
                      </p>
                      <Select
                        value={notifications.notifications.push_channel ?? 'all'}
                        onValueChange={(value: 'all' | 'app' | 'web' | 'none') =>
                          notifications.updateNotifications({ push_channel: value })
                        }
                        disabled={notifications.isSaving}
                      >
                        <SelectTrigger className="w-full sm:w-64">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            {t.settingsPage.notifications.channelAll}
                          </SelectItem>
                          <SelectItem value="app">
                            {t.settingsPage.notifications.channelApp}
                          </SelectItem>
                          <SelectItem value="web">
                            {t.settingsPage.notifications.channelWeb}
                          </SelectItem>
                          <SelectItem value="none">
                            {t.settingsPage.notifications.channelNone}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
