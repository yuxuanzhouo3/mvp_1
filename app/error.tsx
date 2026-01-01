'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const { language } = useLanguage();
  const t = useTranslations(language);

  useEffect(() => {
    setMounted(true);
    // Log the error to an error reporting service
    console.error('Application Error:', error);
  }, [error]);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-red-50 to-orange-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center max-w-md mx-auto">
        {/* Error Icon */}
        <div className="mb-8">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
        </div>

        {/* Error Message */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {t.errorPage.somethingWentWrong}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error.message || t.errorPage.unexpectedError}
          </p>
          {error.digest && (
            <p className="text-xs text-gray-500 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 p-2 rounded">
              {t.errorPage.errorId}: {error.digest}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Button 
            onClick={() => reset()}
            size="lg"
            className="w-full md:w-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {t.errorPage.tryAgain}
          </Button>
          
          <Button 
            asChild 
            variant="outline" 
            size="lg"
            className="w-full md:w-auto"
          >
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              {t.errorPage.returnHome}
            </Link>
          </Button>
        </div>

        {/* Help Section */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            {t.errorPage.needHelp}
          </h3>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>{t.errorPage.ifProblemPersists}</p>
            <ul className="list-disc list-inside space-y-1">
              <li>{t.errorPage.checkInternet}</li>
              <li>{t.errorPage.clearCache}</li>
              <li>{t.errorPage.refreshPage}</li>
              <li>
                <Link 
                  href="/contact" 
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                >
                  {t.errorPage.contactSupport}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Technical Details (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <summary className="cursor-pointer text-sm font-medium text-gray-900 dark:text-white mb-2">
              {t.errorPage.technicalDetails}
            </summary>
            <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
} 