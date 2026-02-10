import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster } from '@/components/ui/toaster'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { ConditionalHeader } from '@/components/ui/conditional-header'
import { cookies, headers } from 'next/headers'
import type { Language } from '@/lib/i18n'
import { getBrandName } from '@/lib/config/branding.config'
import { isWechatMiniProgramUserAgent } from '@/lib/utils/miniprogram-compat'

// 使用系统字体栈，避免在中国区构建时无法访问 Google Fonts 的问题
const systemFontClass = 'font-sans';

function resolveDeploymentRegion(headerStore: { get(name: string): string | null }): 'CN' | 'INTL' {
  const headerRegion = headerStore.get('x-deployment-region');
  if (headerRegion === 'CN' || headerRegion === 'INTL') return headerRegion;
  return process.env.NEXT_PUBLIC_DEPLOYMENT_REGION === 'CN' ? 'CN' : 'INTL';
}

export async function generateMetadata(): Promise<Metadata> {
  const headerStore = headers();
  const region = resolveDeploymentRegion(headerStore);
  const host = (headerStore.get('x-forwarded-host') || headerStore.get('host') || '').toLowerCase();
  const isChinaRegion = region === 'CN' || host.includes('mornscience.top');
  const locale = isChinaRegion ? 'zh-CN' : 'en-US';
  const userAgent = headerStore.get('user-agent') || '';
  const isMiniProgram = isWechatMiniProgramUserAgent(userAgent);
  const cnBrandName = getBrandName({ isCN: true, isWechatMiniProgram: isMiniProgram });

  return {
    title: isChinaRegion ? cnBrandName : 'PersonaLink - AI Friend Matcher',
    description: isChinaRegion
      ? '基于个性兼容性找到你的完美AI朋友匹配'
      : 'Find your perfect AI friend match based on personality compatibility',
    keywords: ['AI', 'friendship', 'matching', 'personality', 'chat', '社交', '匹配', '个性', '聊天'],
    authors: [{ name: isChinaRegion ? cnBrandName : 'PersonaLink Team' }],
    icons: {
      icon: '/logo.png',
      apple: '/logo.png',
    },
    openGraph: {
      title: isChinaRegion ? cnBrandName : 'PersonaLink - AI Friend Matcher',
      description: isChinaRegion
        ? '基于个性兼容性找到你的完美AI朋友匹配'
        : 'Find your perfect AI friend match based on personality compatibility',
      type: 'website',
      locale: locale,
    },
    twitter: {
      card: 'summary_large_image',
      title: isChinaRegion ? cnBrandName : 'PersonaLink - AI Friend Matcher',
      description: isChinaRegion
        ? '基于个性兼容性找到你的完美AI朋友匹配'
        : 'Find your perfect AI friend match based on personality compatibility',
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = cookies()
  const headerStore = headers()
  const pathname = headerStore.get('x-pathname') || ''
  const isAdminRoute = pathname.startsWith('/admin')
  const cookieLang = isAdminRoute
    ? cookieStore.get('admin_lang')?.value
    : cookieStore.get('lang')?.value
  const headerLang = headerStore.get('x-lang')
  const acceptLanguage = headerStore.get('accept-language') || ''
  const region = resolveDeploymentRegion(headerStore);
  const host = (headerStore.get('x-forwarded-host') || headerStore.get('host') || '').toLowerCase();
  const isChinaRegion = region === 'CN' || host.includes('mornscience.top');
  const themeClass = isChinaRegion ? 'theme-cn' : 'theme-intl-modern';

  const initialLanguage: Language = isAdminRoute
    ? ((cookieLang === 'zh' || cookieLang === 'en') ? (cookieLang as Language) : 'zh')
    : (cookieLang === 'zh' || cookieLang === 'en'
      ? (cookieLang as Language)
      : headerLang === 'zh' || headerLang === 'en'
        ? (headerLang as Language)
        : acceptLanguage.toLowerCase().includes('zh')
          ? 'zh'
          : (isChinaRegion ? 'zh' : 'en'))

  const htmlLang = initialLanguage === 'zh' ? 'zh-CN' : 'en'

  return (
    <html lang={htmlLang} suppressHydrationWarning>
      <head>
        {/* 微信 JSSDK - 用于小程序 WebView 中调用 wx.miniProgram API */}
        {isChinaRegion && (
          <Script
            src="https://res.wx.qq.com/open/js/jweixin-1.6.0.js"
            strategy="beforeInteractive"
          />
        )}
      </head>
      <body className={`${systemFontClass} ${themeClass}`}>
        {isChinaRegion && <Script src="/wechat-android-bridge.js" strategy="beforeInteractive" />}
        <ErrorBoundary>
          <Providers initialLanguage={initialLanguage} languageScope={isAdminRoute ? 'admin' : 'app'}>
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
