'use client';

import { usePathname } from 'next/navigation';
import { GlobalHeader } from './global-header';

export function ConditionalHeader({ brandName }: { brandName: string }) {
  const pathname = usePathname() || '';
  const isAuthPage = pathname.startsWith('/auth/');
  const isChatRoomPage =
    pathname.startsWith('/dashboard/messages/') &&
    pathname !== '/dashboard/messages' &&
    pathname !== '/dashboard/messages/cn-chat';
  const isDashboardPage = pathname.startsWith('/dashboard');

  if (isAuthPage || isChatRoomPage) {
    return null;
  }

  return (
    <>
      <GlobalHeader brandName={brandName} />
      {!isDashboardPage && <div className="h-[calc(env(safe-area-inset-top)+3.5rem)] md:h-[73px]" />}
    </>
  );
}
