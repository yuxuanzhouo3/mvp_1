'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { ThemeProvider } from '@/context/ThemeProvider'
import { LanguageProvider } from '@/components/language-provider'
import { DeviceTracker } from '@/components/analytics/DeviceTracker'
import { useState } from 'react'
import type { Language } from '@/lib/i18n'
import { enablePassiveEventListeners } from '@/lib/utils/passive-events'

if (typeof window !== 'undefined') {
  enablePassiveEventListeners()
}

export function Providers({
  children,
  initialLanguage,
  languageScope,
}: {
  children: React.ReactNode;
  initialLanguage: Language;
  languageScope?: 'app' | 'admin';
}) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        retry: 1,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider initialLanguage={initialLanguage} scope={languageScope}>
        <ThemeProvider>
          <AuthProvider>
            {languageScope !== 'admin' ? <DeviceTracker /> : null}
            {children}
          </AuthProvider>
        </ThemeProvider>
      </LanguageProvider>
    </QueryClientProvider>
  )
} 
