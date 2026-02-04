'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, Settings, Globe, Sun, Moon, ChevronDown, LogOut, HelpCircle, Download } from 'lucide-react';
import { useTheme } from '@/context/ThemeProvider';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
import Link from 'next/link';
import { useAuth } from '@/app/providers/AuthProvider';
import { usePathname, useRouter } from 'next/navigation';
import { NotificationDropdown } from '@/components/dashboard/NotificationDropdown';
import { isChinaDeployment } from '@/lib/config/deployment.config';
import { getDownloadUrl } from '@/lib/config/download.config';
import type { PlatformType, MacOSArchType } from '@/lib/config/download.config';

export function GlobalHeader() {
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const downloadRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const openDownload = (platform: PlatformType, arch?: MacOSArchType) => {
    const url = getDownloadUrl(platform, isChinaDeployment(), arch);
    if (url && url !== '#') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      router.push('/download');
    }
    setShowDownload(false);
  };

  // Handle theme context safely
  let theme: 'blue' = 'blue';
  let colorMode: 'light' | 'dark' = 'light';
  let setColorMode: (mode: 'light' | 'dark') => void = () => {};

  try {
    const themeContext = useTheme();
    theme = themeContext.theme;
    colorMode = themeContext.colorMode;
    setColorMode = themeContext.setColorMode;
  } catch (error) {
    // Fallback values if theme context is not available
    // Values are already set above
  }

  const { language, setLanguage, toggleLanguage } = useLanguage();
  const t = useTranslations(language);
  const navItems = [
    { href: '/', label: t.header.nav?.home ?? '首页' },
    { href: '/algorithms', label: t.header.nav?.algorithms ?? '匹配算法' },
    { href: '/about', label: t.header.nav?.about ?? '关于我们' },
    { href: '/contact', label: t.header.nav?.contact ?? '联系我们' },
  ];

  const isActiveHref = (href: string) => {
    if (!pathname) return false;
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  // Handle logout with proper error handling
  const handleSignOut = async () => {
    console.log('🚪 Attempting to sign out...');
    setShowUserMenu(false);
    await signOut();
    // signOut already handles cache cleanup and redirect to root
  };

  // Set mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close settings dropdown when clicking outside
  useEffect(() => {
    // Only run on client side
    if (typeof document === 'undefined') {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (downloadRef.current && !downloadRef.current.contains(event.target as Node)) {
        setShowDownload(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
  ];

  // Prevent hydration mismatch
  if (!mounted) {
    return <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950" suppressHydrationWarning />;
  }

  return (
    <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 fixed top-0 left-0 right-0 z-40">
      <div className="container mx-auto px-2 py-2 md:px-4 md:py-4">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2 md:space-x-3">
            <Link href="/" className="flex items-center space-x-2 md:space-x-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-primary rounded-lg flex items-center justify-center">
                <Heart className="h-4 w-4 md:h-6 md:w-6 text-white" />
              </div>
              <span className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
                {isChinaDeployment() ? '摩尔相亲' : 'PersonaLink'}
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = isActiveHref(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center space-x-1 md:space-x-4">
            {/* Download Button - PC navigates to download page, mobile shows dropdown */}
            <div className="relative" ref={downloadRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // On PC (md breakpoint and above), navigate to download page
                  if (window.innerWidth >= 768) {
                    router.push('/download');
                  } else {
                    // On mobile, show dropdown
                    setShowDownload(!showDownload);
                  }
                }}
                className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 px-2 md:px-3"
              >
                <Download className="h-4 w-4 md:h-5 md:w-5 md:mr-2" />
                <span className="hidden md:inline">{language === 'zh' ? '下载' : 'Download'}</span>
                <ChevronDown className={`h-3 w-3 md:h-4 md:w-4 ml-0.5 md:ml-1 transition-transform md:hidden ${showDownload ? 'rotate-180' : ''}`} />
              </Button>

              {/* Download Dropdown - Only shown on mobile */}
              {showDownload && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 md:hidden">
                  <div className="p-2">
                    {/* APP Section */}
                    <div className="mb-2">
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                        {language === 'zh' ? 'APP应用' : 'APP'}
                      </div>
                      <button
                        onClick={() => openDownload('windows')}
                        className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <span className="mr-2">🪟</span>
                        Windows APP
                      </button>
                      <button
                        onClick={() => openDownload('macos', 'apple-silicon')}
                        className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <span className="mr-2">🍎</span>
                        Mac APP
                      </button>
                    </div>

                    {/* Desktop Section */}
                    <div className="mb-2 border-t border-gray-200 dark:border-gray-700 pt-2">
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                        {language === 'zh' ? '桌面端' : 'Desktop'}
                      </div>
                      <button
                        onClick={() => openDownload('windows')}
                        className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <span className="mr-2">🪟</span>
                        Windows {language === 'zh' ? '桌面端' : 'Desktop'}
                      </button>
                      <button
                        onClick={() => openDownload('macos', 'apple-silicon')}
                        className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <span className="mr-2">🍎</span>
                        Mac {language === 'zh' ? '桌面端' : 'Desktop'}
                      </button>
                    </div>

                    {/* HarmonyOS Section */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                        {language === 'zh' ? '鸿蒙端' : 'HarmonyOS'}
                      </div>
                      <button
                        onClick={() => openDownload('android')}
                        className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <span className="mr-2">🔷</span>
                        {language === 'zh' ? '鸿蒙应用' : 'HarmonyOS App'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Settings Button */}
            <div className="relative" ref={settingsRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 px-2 md:px-3"
              >
                <Settings className="h-4 w-4 md:h-5 md:w-5 md:mr-2" />
                <span className="hidden md:inline">{t.header.settings}</span>
                <ChevronDown className={`h-3 w-3 md:h-4 md:w-4 ml-0.5 md:ml-1 transition-transform ${showSettings ? 'rotate-180' : ''}`} />
              </Button>

              {/* Settings Dropdown */}
              {showSettings && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                  <div className="p-4">
                    {/* Language Settings */}
                    <div className="mb-4">
                      <div className="flex items-center mb-2">
                        <Globe className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{t.header.language}</span>
                      </div>
                      <div className="space-y-1">
                        {languages.map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => setLanguage(lang.code as any)}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                              language === lang.code
                                ? 'bg-primary text-white'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            <span className="mr-2">{lang.flag}</span>
                            {lang.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Color Mode Settings */}
                    <div>
                      <div className="flex items-center mb-2">
                        {colorMode === 'dark' ? (
                          <Moon className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-400" />
                        ) : (
                          <Sun className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-400" />
                        )}
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{t.header.theme}</span>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setColorMode('light')}
                          className={`flex-1 px-3 py-2 rounded-md text-sm transition-colors ${
                            colorMode === 'light'
                              ? 'bg-primary text-white'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          <Sun className="h-4 w-4 mr-2 inline" />
                          {t.header.light}
                        </button>
                        <button
                          onClick={() => setColorMode('dark')}
                          className={`flex-1 px-3 py-2 rounded-md text-sm transition-colors ${
                            colorMode === 'dark'
                              ? 'bg-primary text-white'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          <Moon className="h-4 w-4 mr-2 inline" />
                          {t.header.dark}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Auth Buttons */}
            {!user ? (
              <>
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm" className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs md:text-sm px-2 md:px-3">
                    {t.header.signIn}
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button size="sm" className="btn-primary text-xs md:text-sm px-2 md:px-3">
                    {t.header.getStarted}
                  </Button>
                </Link>
              </>
            ) : (
              <div className="flex items-center space-x-1 md:space-x-3">
                {/* Help Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 md:h-9 md:w-9 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                  asChild
                >
                  <Link href="/help">
                    <HelpCircle className="h-4 w-4 md:h-5 md:w-5 text-gray-600 dark:text-gray-400" />
                  </Link>
                </Button>

                {/* Notification Dropdown */}
                <NotificationDropdown />

                {/* User Info Dropdown */}
                <div className="relative" ref={userMenuRef}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 px-1 md:px-3"
                  >
                    <span className="hidden md:inline mr-2">
                      {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
                    </span>
                    <ChevronDown className={`h-3 w-3 md:h-4 md:w-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                  </Button>

                  {/* User Dropdown Menu */}
                  {showUserMenu && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.user_metadata?.full_name || 'User'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {user.email}
                        </div>
                      </div>
                      <div className="p-1">
                        <Link href="/dashboard">
                          <Button
                            variant="ghost"
                            className="w-full justify-start text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            {t.header.dashboard}
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSignOut}
                          className="w-full justify-start text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          {t.header.logout}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}

