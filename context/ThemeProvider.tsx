'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'blue';
type Language = 'en' | 'zh' | 'ja' | 'ko';
type ColorMode = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  language: Language;
  colorMode: ColorMode;
  setLanguage: (language: Language) => void;
  setColorMode: (mode: ColorMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [colorMode, setColorModeState] = useState<ColorMode>('light');
  const [mounted, setMounted] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as Language;
    const savedColorMode = localStorage.getItem('colorMode') as ColorMode;
    
    if (savedLanguage) setLanguageState(savedLanguage);
    if (savedColorMode) setColorModeState(savedColorMode);
    
    setMounted(true);
  }, []);

  // Apply color mode to document
  useEffect(() => {
    if (!mounted) return;
    
    if (colorMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [colorMode, mounted]);

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
    localStorage.setItem('language', newLanguage);
  };

  const setColorMode = (newMode: ColorMode) => {
    setColorModeState(newMode);
    localStorage.setItem('colorMode', newMode);
  };

  const value: ThemeContextType = {
    theme: 'blue',
    language,
    colorMode,
    setLanguage,
    setColorMode,
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return <div suppressHydrationWarning>{children}</div>;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 