'use client';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application Error:', error);
  }, [error]);

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
            Something went wrong!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error.message || 'An unexpected error occurred while loading this page.'}
          </p>
          {error.digest && (
            <p className="text-xs text-gray-500 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 p-2 rounded">
              Error ID: {error.digest}
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
            Try Again
          </Button>
          
          <Button 
            asChild 
            variant="outline" 
            size="lg"
            className="w-full md:w-auto"
          >
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              Return Home
            </Link>
          </Button>
        </div>

        {/* Help Section */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            Need Help?
          </h3>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>If this problem persists, please:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Check your internet connection</li>
              <li>Clear your browser cache</li>
              <li>Try refreshing the page</li>
              <li>
                <Link 
                  href="/contact" 
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                >
                  Contact our support team
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Technical Details (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <summary className="cursor-pointer text-sm font-medium text-gray-900 dark:text-white mb-2">
              Technical Details (Development)
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