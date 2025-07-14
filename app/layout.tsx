import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster } from '@/components/ui/toaster'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { MonitoringDashboard } from '@/components/ui/monitoring-dashboard'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PersonaLink - AI-Powered Friend Matcher',
  description: 'Find your perfect AI friend match based on personality compatibility',
  keywords: ['AI', 'friendship', 'matching', 'personality', 'chat'],
  authors: [{ name: 'PersonaLink Team' }],
  openGraph: {
    title: 'PersonaLink - AI-Powered Friend Matcher',
    description: 'Find your perfect AI friend match based on personality compatibility',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PersonaLink - AI-Powered Friend Matcher',
    description: 'Find your perfect AI friend match based on personality compatibility',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ErrorBoundary>
          <Providers>
            <div className="min-h-screen bg-background">
              {children}
              <Toaster />
              
              {/* 生产环境监控面板 */}
              {process.env.NODE_ENV === 'production' && (
                <MonitoringDashboard />
              )}
            </div>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  )
} 