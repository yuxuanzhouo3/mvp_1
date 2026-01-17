import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster } from '@/components/ui/toaster'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { ConditionalHeader } from '@/components/ui/conditional-header'

// Get deployment region from environment
const isChinaRegion = process.env.NEXT_PUBLIC_DEPLOYMENT_REGION === 'CN';
const locale = isChinaRegion ? 'zh-CN' : 'en-US';
const defaultLanguage = isChinaRegion ? 'zh' : 'en';

// 使用系统字体栈，避免在中国区构建时无法访问 Google Fonts 的问题
const systemFontClass = 'font-sans';

export const metadata: Metadata = {
  title: isChinaRegion ? 'PersonaLink - AI社交匹配' : 'PersonaLink - AI Friend Matcher',
  description: isChinaRegion
    ? '基于个性兼容性找到你的完美AI朋友匹配'
    : 'Find your perfect AI friend match based on personality compatibility',
  keywords: ['AI', 'friendship', 'matching', 'personality', 'chat', '社交', '匹配', '个性', '聊天'],
  authors: [{ name: 'PersonaLink Team' }],
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={systemFontClass}>
        <ErrorBoundary>
          <Providers>
            <div className="bg-background">
              <ConditionalHeader />
              {children}
              <Toaster />
            </div>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  )
}
