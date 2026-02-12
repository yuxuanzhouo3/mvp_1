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
import { isChinaDeployment } from '@/lib/config/deployment.config';

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

const CN_MOBILE_AVATAR_STORAGE_KEY = 'cn_mobile_settings_avatar';

type CartoonHairStyle = 'short' | 'bob' | 'curly' | 'pony' | 'spiky' | 'wave';
type CartoonEyeStyle = 'dot' | 'oval' | 'smile';
type CartoonMouthStyle = 'smile' | 'neutral' | 'open';

interface CnCartoonAvatarPreset {
  bgStart: string;
  bgEnd: string;
  skin: string;
  hair: string;
  shirt: string;
  eye: string;
  blush: string;
  seed: string;
  hairStyle: CartoonHairStyle;
  eyeStyle: CartoonEyeStyle;
  mouthStyle: CartoonMouthStyle;
}

const getHairBackMarkup = (preset: CnCartoonAvatarPreset): string => {
  if (preset.hairStyle === 'bob') {
    return `<path d='M29 60c2-23 15-35 35-35s33 12 35 35v26c-6-8-12-11-18-11-7 0-11 3-17 3s-10-3-17-3c-6 0-12 3-18 11V60z' fill='${preset.hair}' />`;
  }
  if (preset.hairStyle === 'curly') {
    return `<g fill='${preset.hair}'><circle cx='38' cy='49' r='10'/><circle cx='51' cy='39' r='13'/><circle cx='64' cy='36' r='13'/><circle cx='78' cy='39' r='13'/><circle cx='90' cy='49' r='10'/></g>`;
  }
  if (preset.hairStyle === 'pony') {
    return `<g><circle cx='94' cy='40' r='10' fill='${preset.hair}' /><path d='M35 58c0-19 12-31 29-31s29 12 29 31v11H35z' fill='${preset.hair}'/></g>`;
  }
  if (preset.hairStyle === 'spiky') {
    return `<path d='M33 61v-7l9-12 7 6 8-11 7 9 8-10 9 12 8-6 8 13v6H33z' fill='${preset.hair}' />`;
  }
  if (preset.hairStyle === 'wave') {
    return `<path d='M31 59c2-20 13-33 33-33 9 0 15 3 21 9 5 5 8 13 10 24v9H31v-9z' fill='${preset.hair}' />`;
  }
  return `<path d='M34 59c0-20 12-32 30-32s30 12 30 32v8H34v-8z' fill='${preset.hair}' />`;
};

const getHairFrontMarkup = (preset: CnCartoonAvatarPreset): string => {
  if (preset.hairStyle === 'bob') {
    return `<path d='M37 45c5-6 15-9 27-9s22 3 27 9c-4 2-9 4-14 4-4 0-8-1-13-1s-9 1-13 1c-5 0-10-2-14-4z' fill='${preset.hair}' />`;
  }
  if (preset.hairStyle === 'curly') {
    return `<path d='M41 52c6-8 14-11 23-11s17 3 23 11c-4 2-8 3-12 3-4 0-7-1-11-1s-8 1-11 1c-4 0-8-1-12-3z' fill='${preset.hair}' />`;
  }
  if (preset.hairStyle === 'pony') {
    return `<path d='M40 47c4-5 12-8 24-8 13 0 21 3 24 8-3 2-7 4-12 4-4 0-8-1-12-1s-8 1-12 1c-5 0-9-2-12-4z' fill='${preset.hair}' />`;
  }
  if (preset.hairStyle === 'spiky') {
    return `<path d='M39 50c4-7 13-11 25-11s21 4 25 11c-4 2-8 3-13 3-4 0-8-1-12-1s-8 1-12 1c-5 0-9-1-13-3z' fill='${preset.hair}' />`;
  }
  if (preset.hairStyle === 'wave') {
    return `<path d='M37 51c2-8 12-13 27-13 14 0 24 5 27 13-4 2-8 3-13 3-4 0-8-1-14-1-5 0-9 1-13 1-5 0-10-1-14-3z' fill='${preset.hair}' />`;
  }
  return `<path d='M40 49c4-6 12-10 24-10s20 4 24 10c-4 2-8 3-12 3-4 0-8-1-12-1s-8 1-12 1c-4 0-8-1-12-3z' fill='${preset.hair}' />`;
};

const getEyesMarkup = (preset: CnCartoonAvatarPreset): string => {
  if (preset.eyeStyle === 'oval') {
    return `<g fill='${preset.eye}'><ellipse cx='54' cy='59' rx='3.2' ry='4'/><ellipse cx='74' cy='59' rx='3.2' ry='4'/></g>`;
  }
  if (preset.eyeStyle === 'smile') {
    return `<g stroke='${preset.eye}' stroke-width='2.2' stroke-linecap='round' fill='none'><path d='M49 59c1.6 2.3 4.4 2.3 6 0'/><path d='M69 59c1.6 2.3 4.4 2.3 6 0'/></g>`;
  }
  return `<g fill='${preset.eye}'><circle cx='54' cy='59' r='2.8'/><circle cx='74' cy='59' r='2.8'/></g>`;
};

const getMouthMarkup = (preset: CnCartoonAvatarPreset): string => {
  if (preset.mouthStyle === 'open') {
    return `<ellipse cx='64' cy='74' rx='6' ry='4' fill='#9f1239' />`;
  }
  if (preset.mouthStyle === 'neutral') {
    return `<path d='M59 74h10' stroke='#8b5e3c' stroke-width='2.2' stroke-linecap='round' />`;
  }
  return `<path d='M57 72c2.5 3.5 7.5 3.5 10 0' stroke='#b45309' stroke-width='2.2' stroke-linecap='round' fill='none' />`;
};

const createCnAvatarPreset = (preset: CnCartoonAvatarPreset): string => {
  const hairBack = getHairBackMarkup(preset);
  const hairFront = getHairFrontMarkup(preset);
  const eyes = getEyesMarkup(preset);
  const mouth = getMouthMarkup(preset);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'>
    <defs>
      <linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'>
        <stop offset='0%' stop-color='${preset.bgStart}' />
        <stop offset='100%' stop-color='${preset.bgEnd}' />
      </linearGradient>
    </defs>
    <rect width='128' height='128' rx='64' fill='url(#g)' />
    <circle cx='64' cy='64' r='56' fill='rgba(255,255,255,0.14)' />
    <ellipse cx='64' cy='116' rx='28' ry='8' fill='rgba(0,0,0,0.08)' />
    ${hairBack}
    <circle cx='36' cy='64' r='6' fill='${preset.skin}' />
    <circle cx='92' cy='64' r='6' fill='${preset.skin}' />
    <circle cx='64' cy='61' r='27' fill='${preset.skin}' />
    ${hairFront}
    <rect x='56' y='79' width='16' height='15' rx='7' fill='${preset.skin}' />
    <path d='M22 128c4-21 19-31 42-31s38 10 42 31' fill='${preset.shirt}' />
    ${eyes}
    <circle cx='46' cy='68' r='4.2' fill='${preset.blush}' opacity='0.45' />
    <circle cx='82' cy='68' r='4.2' fill='${preset.blush}' opacity='0.45' />
    ${mouth}
    <circle cx='53' cy='57' r='1.2' fill='white' opacity='0.75' />
    <circle cx='73' cy='57' r='1.2' fill='white' opacity='0.75' />
    <text x='64' y='121' text-anchor='middle' font-size='10' fill='rgba(255,255,255,0.55)'>${preset.seed}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const CN_MOBILE_AVATAR_PRESETS = [
  createCnAvatarPreset({
    bgStart: '#fda4af',
    bgEnd: '#fb7185',
    skin: '#f6d2b2',
    hair: '#3f2a21',
    shirt: '#7c3aed',
    eye: '#1f2937',
    blush: '#f9a8d4',
    seed: 'A1',
    hairStyle: 'short',
    eyeStyle: 'dot',
    mouthStyle: 'smile',
  }),
  createCnAvatarPreset({
    bgStart: '#f9a8d4',
    bgEnd: '#fb7185',
    skin: '#f7d9bb',
    hair: '#7c3f2a',
    shirt: '#0ea5e9',
    eye: '#111827',
    blush: '#fb7185',
    seed: 'A2',
    hairStyle: 'bob',
    eyeStyle: 'oval',
    mouthStyle: 'smile',
  }),
  createCnAvatarPreset({
    bgStart: '#c4b5fd',
    bgEnd: '#818cf8',
    skin: '#f2caa8',
    hair: '#2b2a4a',
    shirt: '#f97316',
    eye: '#111827',
    blush: '#fda4af',
    seed: 'A3',
    hairStyle: 'curly',
    eyeStyle: 'smile',
    mouthStyle: 'open',
  }),
  createCnAvatarPreset({
    bgStart: '#93c5fd',
    bgEnd: '#22d3ee',
    skin: '#f4cfad',
    hair: '#1f2937',
    shirt: '#16a34a',
    eye: '#111827',
    blush: '#fbcfe8',
    seed: 'A4',
    hairStyle: 'pony',
    eyeStyle: 'dot',
    mouthStyle: 'neutral',
  }),
  createCnAvatarPreset({
    bgStart: '#86efac',
    bgEnd: '#2dd4bf',
    skin: '#eec49d',
    hair: '#3f3f46',
    shirt: '#2563eb',
    eye: '#111827',
    blush: '#f9a8d4',
    seed: 'A5',
    hairStyle: 'spiky',
    eyeStyle: 'oval',
    mouthStyle: 'smile',
  }),
  createCnAvatarPreset({
    bgStart: '#fcd34d',
    bgEnd: '#f59e0b',
    skin: '#f3cfab',
    hair: '#4c1d95',
    shirt: '#dc2626',
    eye: '#1f2937',
    blush: '#fda4af',
    seed: 'A6',
    hairStyle: 'wave',
    eyeStyle: 'dot',
    mouthStyle: 'smile',
  }),
];

const getRandomPresetIndex = (): number => {
  return Math.floor(Math.random() * CN_MOBILE_AVATAR_PRESETS.length);
};

export default function SettingsPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { language, setLanguage } = useLanguage();
  const t = useTranslations(language);
  const isCN = isChinaDeployment();

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
  const [avatarUrl, setAvatarUrl] = useState<string>(user?.user_metadata?.avatar_url || '');
  const [avatarPresetIndex, setAvatarPresetIndex] = useState<number>(0);
  const [avatarSaving, setAvatarSaving] = useState(false);

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

  useEffect(() => {
    const currentAvatar = user?.user_metadata?.avatar_url || '';
    if (!isCN || !user?.id) {
      setAvatarUrl(currentAvatar);
      return;
    }

    if (currentAvatar) {
      setAvatarUrl(currentAvatar);
      const matchedIndex = CN_MOBILE_AVATAR_PRESETS.indexOf(currentAvatar);
      if (matchedIndex >= 0) {
        setAvatarPresetIndex(matchedIndex);
      }
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const storageKey = `${CN_MOBILE_AVATAR_STORAGE_KEY}:${user.id}`;
    const storedAvatar = localStorage.getItem(storageKey);
    const isStoredPreset = storedAvatar ? CN_MOBILE_AVATAR_PRESETS.includes(storedAvatar) : false;
    const nextAvatar =
      isStoredPreset && storedAvatar ? storedAvatar : CN_MOBILE_AVATAR_PRESETS[getRandomPresetIndex()];
    const nextIndex = CN_MOBILE_AVATAR_PRESETS.indexOf(nextAvatar);

    if (!isStoredPreset) {
      localStorage.setItem(storageKey, nextAvatar);
    }

    setAvatarUrl(nextAvatar);
    setAvatarPresetIndex(nextIndex >= 0 ? nextIndex : 0);
  }, [isCN, user?.id, user?.user_metadata?.avatar_url]);

  const persistCnAvatar = async (nextAvatarUrl: string): Promise<boolean> => {
    if (!isCN || !user?.id) return false;

    setAvatarSaving(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ avatar_url: nextAvatarUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to save avatar');
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(`${CN_MOBILE_AVATAR_STORAGE_KEY}:${user.id}`, nextAvatarUrl);

        const cnUserRaw = localStorage.getItem('cn_user');
        if (cnUserRaw) {
          const cnUser = JSON.parse(cnUserRaw);
          const updatedCnUser = {
            ...cnUser,
            user_metadata: {
              ...cnUser.user_metadata,
              avatar_url: nextAvatarUrl,
            },
          };
          localStorage.setItem('cn_user', JSON.stringify(updatedCnUser));
        }
      }
      return true;
    } catch (error) {
      toast({
        title: t.dashboardSettings.saveFailed,
        description: t.dashboardSettings.saveFailedDesc,
        variant: 'destructive',
      });
      return false;
    } finally {
      setAvatarSaving(false);
    }
  };

  const applyCnAvatar = async (nextAvatarUrl: string, nextIndex: number) => {
    const previousAvatar = avatarUrl || user?.user_metadata?.avatar_url || '';
    const previousIndex = avatarPresetIndex;
    setAvatarUrl(nextAvatarUrl);
    setAvatarPresetIndex(nextIndex);
    const saved = await persistCnAvatar(nextAvatarUrl);
    if (!saved) {
      setAvatarUrl(previousAvatar);
      setAvatarPresetIndex(previousIndex);
    }
  };

  const handleRotateAvatar = async () => {
    const nextIndex = (avatarPresetIndex + 1) % CN_MOBILE_AVATAR_PRESETS.length;
    await applyCnAvatar(CN_MOBILE_AVATAR_PRESETS[nextIndex], nextIndex);
  };

  const handleRandomAvatar = async () => {
    let nextIndex = getRandomPresetIndex();
    if (CN_MOBILE_AVATAR_PRESETS.length > 1 && nextIndex === avatarPresetIndex) {
      nextIndex = (nextIndex + 1) % CN_MOBILE_AVATAR_PRESETS.length;
    }
    await applyCnAvatar(CN_MOBILE_AVATAR_PRESETS[nextIndex], nextIndex);
  };

  const handlePickAvatar = async (index: number) => {
    if (index < 0 || index >= CN_MOBILE_AVATAR_PRESETS.length) {
      return;
    }
    await applyCnAvatar(CN_MOBILE_AVATAR_PRESETS[index], index);
  };

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
                    <AvatarImage src={avatarUrl || user?.user_metadata?.avatar_url} />
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

              {isCN && (
                <div className="w-full mb-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {CN_MOBILE_AVATAR_PRESETS.map((presetAvatar, index) => {
                      const isActive = presetAvatar === (avatarUrl || user?.user_metadata?.avatar_url);
                      return (
                        <button
                          key={presetAvatar}
                          type="button"
                          onClick={() => handlePickAvatar(index)}
                          disabled={avatarSaving}
                          className={`rounded-full border-2 p-0.5 transition ${
                            isActive ? 'border-pink-500' : 'border-transparent hover:border-gray-300'
                          } disabled:opacity-60`}
                          aria-label={
                            language === 'zh' ? `选择头像 ${index + 1}` : `Select avatar ${index + 1}`
                          }
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={presetAvatar} />
                            <AvatarFallback>{index + 1}</AvatarFallback>
                          </Avatar>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRandomAvatar}
                      disabled={avatarSaving}
                      className="h-8 px-3 text-xs"
                    >
                      {language === 'zh' ? '随机头像' : 'Random'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRotateAvatar}
                      disabled={avatarSaving}
                      className="h-8 px-3 text-xs"
                    >
                      {language === 'zh' ? '换一个' : 'Rotate'}
                    </Button>
                  </div>
                </div>
              )}

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
              <Button
                asChild
                className="w-full bg-black hover:bg-gray-800 text-white rounded-full py-6 text-base font-semibold"
              >
                <Link href="/profile/edit">
                  ✏️ {language === 'zh' ? '编辑个人资料' : 'Edit Profile'}
                </Link>
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
              <Button variant="outline" size="sm" className="text-xs md:text-sm shrink-0" asChild>
                <Link href="/profile/edit">
                  {language === 'zh' ? '编辑' : 'Edit'}
                </Link>
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
