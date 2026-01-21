'use client';

import { usePathname } from 'next/navigation';
import { GlobalHeader } from './global-header';

export function ConditionalHeader() {
  const pathname = usePathname() || '';
  const isAuthPage = pathname.startsWith('/auth/');
  // 聊天室页面不显示全局 header（但 cn-chat 页面除外）
  const isChatRoomPage = pathname?.startsWith('/dashboard/messages/')
    && pathname !== '/dashboard/messages'
    && pathname !== '/dashboard/messages/cn-chat';
  // dashboard 页面有自己的侧边栏布局，不需要额外的顶部间距
  const isDashboardPage = pathname?.startsWith('/dashboard');

  if (isAuthPage || isChatRoomPage) {
    return null;
  }

  return (
    <>
      <GlobalHeader />
      {/* 为 fixed header 添加占位空间，dashboard 页面除外 */}
      {!isDashboardPage && <div className="h-[73px]" />}
    </>
  );
} 
