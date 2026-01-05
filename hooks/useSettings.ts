'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
import {
  type PrivacySettings,
  type SearchPreferences,
  type NotificationSettings,
  defaultPrivacySettings,
  defaultSearchPreferences,
  defaultNotificationSettings,
} from '@/lib/validations/settings';

// Debounce utility
function useDebouncedCallback<T extends (...args: Parameters<T>) => ReturnType<T>>(
  callback: T,
  delay: number
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

// API helper
async function fetchWithAuth(url: string, token: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// ========================================
// Privacy Settings Hook
// ========================================

export function usePrivacySettings() {
  const { session } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = useTranslations(language);
  const [privacy, setPrivacy] = useState<PrivacySettings>(defaultPrivacySettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch privacy settings
  const fetchPrivacy = useCallback(async () => {
    if (!session?.access_token) return;

    try {
      setIsLoading(true);
      const data = await fetchWithAuth('/api/settings/privacy', session.access_token);
      setPrivacy(data.privacy);
    } catch (error) {
      console.error('Error fetching privacy settings:', error);
      toast({
        title: t.common.error,
        description: t.settingsPage.loadFailed,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token, toast, t]);

  // Update privacy settings
  const updatePrivacy = useCallback(
    async (updates: Partial<PrivacySettings>) => {
      if (!session?.access_token) return;

      // Optimistic update
      setPrivacy((prev) => ({ ...prev, ...updates }));
      setIsSaving(true);

      try {
        const data = await fetchWithAuth('/api/settings/privacy', session.access_token, {
          method: 'PATCH',
          body: JSON.stringify(updates),
        });
        setPrivacy(data.privacy);
        toast({
          title: t.common.success,
          description: t.settingsPage.settingsSavedDesc,
        });
      } catch (error) {
        // Revert on error
        fetchPrivacy();
        toast({
          title: t.common.error,
          description: t.settingsPage.saveFailedDesc,
          variant: 'destructive',
        });
      } finally {
        setIsSaving(false);
      }
    },
    [session?.access_token, toast, t, fetchPrivacy]
  );

  useEffect(() => {
    fetchPrivacy();
  }, [fetchPrivacy]);

  return {
    privacy,
    isLoading,
    isSaving,
    updatePrivacy,
    refetch: fetchPrivacy,
  };
}

// ========================================
// Search Preferences Hook
// ========================================

export function useSearchPreferences() {
  const { session } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = useTranslations(language);
  const [preferences, setPreferences] = useState<SearchPreferences>(defaultSearchPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch search preferences
  const fetchPreferences = useCallback(async () => {
    if (!session?.access_token) return;

    try {
      setIsLoading(true);
      const data = await fetchWithAuth('/api/settings/preferences', session.access_token);
      setPreferences(data.preferences);
    } catch (error) {
      console.error('Error fetching search preferences:', error);
      toast({
        title: t.common.error,
        description: t.settingsPage.loadFailed,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token, toast, t]);

  // Update preferences (debounced for sliders - 500ms)
  const updatePreferences = useCallback(
    async (updates: Partial<SearchPreferences>) => {
      if (!session?.access_token) return;

      // Optimistic update
      setPreferences((prev) => ({ ...prev, ...updates }));
      setIsSaving(true);

      try {
        const data = await fetchWithAuth('/api/settings/preferences', session.access_token, {
          method: 'PATCH',
          body: JSON.stringify(updates),
        });
        setPreferences(data.preferences);
      } catch (error) {
        // Revert on error
        fetchPreferences();
        toast({
          title: t.common.error,
          description: t.settingsPage.saveFailedDesc,
          variant: 'destructive',
        });
      } finally {
        setIsSaving(false);
      }
    },
    [session?.access_token, toast, t, fetchPreferences]
  );

  // Debounced version for sliders
  const debouncedUpdatePreferences = useDebouncedCallback(updatePreferences, 500);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    isLoading,
    isSaving,
    updatePreferences,
    debouncedUpdatePreferences,
    refetch: fetchPreferences,
  };
}

// ========================================
// Notification Settings Hook
// ========================================

export function useNotificationSettings() {
  const { session } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = useTranslations(language);
  const [notifications, setNotifications] = useState<NotificationSettings>(
    defaultNotificationSettings
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch notification settings
  const fetchNotifications = useCallback(async () => {
    if (!session?.access_token) return;

    try {
      setIsLoading(true);
      const data = await fetchWithAuth('/api/settings/notifications', session.access_token);
      setNotifications(data.notifications);
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      toast({
        title: t.common.error,
        description: t.settingsPage.loadFailed,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token, toast, t]);

  // Update notifications (immediate for switches)
  const updateNotifications = useCallback(
    async (updates: Partial<NotificationSettings>) => {
      if (!session?.access_token) return;

      // Optimistic update
      setNotifications((prev) => ({ ...prev, ...updates }));
      setIsSaving(true);

      try {
        const data = await fetchWithAuth('/api/settings/notifications', session.access_token, {
          method: 'PATCH',
          body: JSON.stringify(updates),
        });
        setNotifications(data.notifications);
        toast({
          title: t.common.success,
          description: t.settingsPage.settingsSavedDesc,
        });
      } catch (error) {
        // Revert on error
        fetchNotifications();
        toast({
          title: t.common.error,
          description: t.settingsPage.saveFailedDesc,
          variant: 'destructive',
        });
      } finally {
        setIsSaving(false);
      }
    },
    [session?.access_token, toast, t, fetchNotifications]
  );

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    isLoading,
    isSaving,
    updateNotifications,
    refetch: fetchNotifications,
  };
}

// ========================================
// Combined Settings Hook
// ========================================

export function useSettings() {
  const privacyHook = usePrivacySettings();
  const preferencesHook = useSearchPreferences();
  const notificationsHook = useNotificationSettings();

  const isLoading =
    privacyHook.isLoading || preferencesHook.isLoading || notificationsHook.isLoading;

  const isSaving =
    privacyHook.isSaving || preferencesHook.isSaving || notificationsHook.isSaving;

  return {
    privacy: privacyHook,
    preferences: preferencesHook,
    notifications: notificationsHook,
    isLoading,
    isSaving,
  };
}

export default useSettings;
