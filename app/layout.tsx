import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster } from '@/components/ui/toaster'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { ConditionalHeader } from '@/components/ui/conditional-header'
import { cookies, headers } from 'next/headers'
import type { Language } from '@/lib/i18n'

// Get deployment region from environment
const isIntlRegion = process.env.NEXT_PUBLIC_DEPLOYMENT_REGION === 'INTL';
const isChinaRegion = !isIntlRegion;
const locale = isChinaRegion ? 'zh-CN' : 'en-US';
const themeClass = isChinaRegion ? 'theme-cn' : 'theme-intl-modern';

// 使用系统字体栈，避免在中国区构建时无法访问 Google Fonts 的问题
const systemFontClass = 'font-sans';

export const metadata: Metadata = {
  title: isChinaRegion ? '邻客 - AI社交匹配' : 'PersonaLink - AI Friend Matcher',
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
    title: isChinaRegion ? '邻客 - AI社交匹配' : 'PersonaLink - AI Friend Matcher',
    description: isChinaRegion
      ? '基于个性兼容性找到你的完美AI朋友匹配'
      : 'Find your perfect AI friend match based on personality compatibility',
    type: 'website',
    locale: locale,
  },
  twitter: {
    card: 'summary_large_image',
    title: isChinaRegion ? '邻客 - AI社交匹配' : 'PersonaLink - AI Friend Matcher',
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
  const cookieStore = cookies()
  const cookieLang = cookieStore.get('lang')?.value
  const headerStore = headers()
  const headerLang = headerStore.get('x-lang')
  const acceptLanguage = headerStore.get('accept-language') || ''

  const initialLanguage: Language =
    cookieLang === 'zh' || cookieLang === 'en'
      ? (cookieLang as Language)
      : headerLang === 'zh' || headerLang === 'en'
        ? (headerLang as Language)
        : acceptLanguage.toLowerCase().includes('zh')
          ? 'zh'
          : (isChinaRegion ? 'zh' : 'en')

  const htmlLang = initialLanguage === 'zh' ? 'zh-CN' : 'en'

  return (
    <html lang={htmlLang} suppressHydrationWarning>
      <body className={`${systemFontClass} ${themeClass}`}>
        <ErrorBoundary>
          <Providers initialLanguage={initialLanguage}>
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
