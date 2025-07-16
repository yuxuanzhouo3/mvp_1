'use client';

import { usePathname } from 'next/navigation';
import { GlobalHeader } from './global-header';

export function ConditionalHeader() {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/auth/');
  
  if (isAuthPage) {
    return null;
  }
  
  return <GlobalHeader />;
} 