import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster } from '@/components/ui/toaster'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { MonitoringDashboard } from '@/components/ui/monitoring-dashboard'
import { ConditionalHeader } from '@/components/ui/conditional-header'
import { memo } from 'react'

// Get deployment region from environment
const isChinaRegion = process.env.NEXT_PUBLIC_DEPLOYMENT_REGION === 'CN';
const locale = isChinaRegion ? 'zh-CN' : 'en-US';
const defaultLanguage = isChinaRegion ? 'zh' : 'en';

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: isChinaRegion ? 'PersonaLink - AI社交匹配' : 'PersonaLink - AI Friend Matcher',
  description: isChinaRegion
    ? '基于个性兼容性找到你的完美AI朋友匹配'
    : 'Find your perfect AI friend match based on personality compatibility',
  keywords: ['AI', 'friendship', 'matching', 'personality', 'chat', '社交', '匹配', '个性', '聊天'],
  authors: [{ name: 'PersonaLink Team' }],
  openGraph: {
    title: isChinaRegion ? 'PersonaLink - AI社交匹配' : 'PersonaLink - AI Friend Matcher',
    description: isChinaRegion
      ? '基于个性兼容性找到你的完美AI朋友匹配'
      : 'Find your perfect AI friend match based on personality compatibility',
    type: 'website',
    locale: locale,
  },
  twitter: {
    card: 'summary_large_image',
    title: isChinaRegion ? 'PersonaLink - AI社交匹配' : 'PersonaLink - AI Friend Matcher',
    description: isChinaRegion
      ? '基于个性兼容性找到你的完美AI朋友匹配'
      : 'Find your perfect AI friend match based on personality compatibility',
  },
}

// Memoize monitoring dashboard to prevent unnecessary re-renders
const MemoizedMonitoringDashboard = memo(MonitoringDashboard);

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={inter.className}>
        <ErrorBoundary>
          <Providers>
            <div className="min-h-screen bg-background">
              <ConditionalHeader />
              {children}
              <Toaster />

              {/* Only render monitoring dashboard in development */}
              {isDevelopment && (
                <MemoizedMonitoringDashboard />
              )}
            </div>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  )
}
