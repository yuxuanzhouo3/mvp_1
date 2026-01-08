'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
import { useState, useEffect } from 'react';

export default function NotFound() {
  const [mounted, setMounted] = useState(false);
  const { language } = useLanguage();
  const t = useTranslations(language);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return <div suppressHydrationWarning />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center max-w-md mx-auto">
        {/* 404 Number */}
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-primary bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            404
          </h1>
        </div>

        {/* Error Message */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {t.errors.notFound.title}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {t.errors.notFound.description}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Button asChild size="lg" className="w-full md:w-auto">
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              {t.errors.notFound.backHome}
            </Link>
          </Button>

          <Button asChild variant="outline" size="lg" className="w-full md:w-auto">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t.header.dashboard}
            </Link>
          </Button>
        </div>

        {/* Helpful Links */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            {t.errors.notFound.popularPages}
          </h3>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link
              href="/matching"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {t.matching.title}
            </Link>
            <Link
              href="/dashboard/messages"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {t.chat.title}
            </Link>
            <Link
              href="/dashboard/settings"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {t.dashboardSettings.title}
            </Link>
            <Link
              href="/contact"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {t.contact.title}
            </Link>
          </div>
        </div>

        {/* Search Suggestion */}
        <div className="mt-8 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Search className="h-4 w-4" />
            <span>
              {t.errors.notFound.searchSuggestion}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
