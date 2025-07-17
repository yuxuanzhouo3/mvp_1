'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, Settings, Globe, Sun, Moon, ChevronDown, LogOut } from 'lucide-react';
import { useTheme } from '@/context/ThemeProvider';
import { getTranslation } from '@/lib/translations';
import Link from 'next/link';
import { useAuth } from '@/app/providers/AuthProvider';
import { useRouter } from 'next/navigation';

export function GlobalHeader() {
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Handle theme context safely
  let theme: 'blue' = 'blue';
  let language: 'en' | 'zh' | 'ja' | 'ko' = 'en';
  let colorMode: 'light' | 'dark' = 'light';
  let setLanguage: (lang: 'en' | 'zh' | 'ja' | 'ko') => void = () => {};
  let setColorMode: (mode: 'light' | 'dark') => void = () => {};
  
  try {
    const themeContext = useTheme();
    theme = themeContext.theme;
    language = themeContext.language;
    colorMode = themeContext.colorMode;
    setLanguage = themeContext.setLanguage;
    setColorMode = themeContext.setColorMode;
  } catch (error) {
    // Fallback values if theme context is not available
    // Values are already set above
  }

  const { user, signOut } = useAuth();
  const t = (key: string) => getTranslation(language, key);

  // Handle logout with proper error handling
  const handleSignOut = async () => {
    try {
      console.log('🚪 Attempting to sign out...');
      await signOut();
      setShowUserMenu(false);
      console.log('✅ Sign out successful, redirecting to login...');
      router.push('/auth/login');
    } catch (error) {
      console.error('💥 Unexpected error during sign out:', error);
    }
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
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
  ];

  // Prevent hydration mismatch
  if (!mounted) {
    return <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950" suppressHydrationWarning />;
  }

  return (
    <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                PersonaLink
              </span>
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Settings Button */}
            <div className="relative" ref={settingsRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Settings className="h-5 w-5 mr-2" />
                {t('settings')}
                <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${showSettings ? 'rotate-180' : ''}`} />
              </Button>
              
              {/* Settings Dropdown */}
              {showSettings && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                  <div className="p-4">
                    {/* Language Settings */}
                    <div className="mb-4">
                      <div className="flex items-center mb-2">
                        <Globe className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{t('language')}</span>
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
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{t('theme')}</span>
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
                          {t('light')}
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
                          {t('dark')}
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
                  <Button variant="ghost" className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                    {t('signIn')}
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button className="btn-primary">
                    {t('getStarted')}
                  </Button>
                </Link>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                {/* User Info Dropdown */}
                <div className="relative" ref={userMenuRef}>
                  <Button
                    variant="ghost"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <span className="mr-2">
                      {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
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
                            Dashboard
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={handleSignOut}
                          className="w-full justify-start text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Logout
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