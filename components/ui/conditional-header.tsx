'use client';

import { usePathname } from 'next/navigation';
import { GlobalHeader } from './global-header';

export function ConditionalHeader() {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/auth/');
  // 聊天室页面不显示全局 header
  const isChatRoomPage = pathname?.startsWith('/dashboard/messages/') && pathname !== '/dashboard/messages';

  if (isAuthPage || isChatRoomPage) {
    return null;
  }

  return <GlobalHeader />;
} 