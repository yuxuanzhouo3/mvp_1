"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import type { Language } from "@/lib/i18n";
import { isChinaDeployment } from "@/lib/config/deployment.config";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

const STORAGE_KEY = "preferred-language";

/**
 * 语言提供者组件
 * Language Provider Component
 *
 * 功能：
 * 1. 管理全局语言状态
 * 2. 持久化到 localStorage
 * 3. 根据部署区域自动设置默认语言（中国区域=中文，国际区域=英文）
 * 4. 允许用户手动切换语言偏好
 * 5. 提供语言切换功能
 * 6. 部署区域变更时自动重置语言选择
 *
 * 优先级：
 * 1. 检查部署区域是否变更，如有变更则重置为新区域默认语言
 * 2. localStorage 中的用户选择（若未变更）
 * 3. 部署区域设置（DEPLOYMENT_REGION）
 *    - 中国区域 (CN)：默认中文
 *    - 国际区域 (INTL)：默认英文
 */
export function LanguageProvider({ children, initialLanguage }: { children: ReactNode; initialLanguage: Language }) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  useEffect(() => {
    const readCookie = (): Language | null => {
      if (typeof document === "undefined") return null;
      const parts = document.cookie.split(";").map((p) => p.trim());
      const match = parts.find((p) => p.startsWith("lang="));
      if (!match) return null;
      const value = match.slice("lang=".length);
      return value === "zh" || value === "en" ? value : null;
    };

    const cookieLang = readCookie();
    if (cookieLang) {
      setLanguageState(cookieLang);
      localStorage.setItem(STORAGE_KEY, cookieLang);
      return;
    }

    const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
    const resolved: Language =
      saved && (saved === "zh" || saved === "en")
        ? saved
        : initialLanguage || (isChinaDeployment() ? "zh" : "en");

    setLanguageState(resolved);
    localStorage.setItem(STORAGE_KEY, resolved);
    document.cookie = `lang=${resolved}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  }, [initialLanguage]);

  // 设置语言（带持久化）
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    if (typeof document !== "undefined") {
      document.cookie = `lang=${lang}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    }
  };

  // 切换语言（中英文互换）
  const toggleLanguage = () => {
    const newLang: Language = language === "zh" ? "en" : "zh";
    setLanguage(newLang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * 使用语言的 Hook
 * Use Language Hook
 */
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
