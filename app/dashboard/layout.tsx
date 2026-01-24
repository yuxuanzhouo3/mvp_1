'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { isChinaDeployment } from '@/lib/config/deployment.config';

// Force no-cache for dashboard layout to prevent stale auth state
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Cache-Control';
    meta.content = 'no-cache, no-store, must-revalidate';
    document.head.appendChild(meta);
  });
}

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = getSupabaseClient();
  const { toast } = useToast();
  
  // 防止重复重定向
  const hasRedirectedRef = useRef(false);

  // FCM initialization ref to prevent duplicate initialization
  const fcmInitializedRef = useRef(false);
  // Store unsubscribe function for cleanup
  const fcmUnsubscribeRef = useRef<(() => void) | null>(null);

  // Check if we're on the settings page
  const isSettingsPage = pathname === '/dashboard/settings';
  // Check if we're in a chat room page
  const isChatRoomPage = pathname?.startsWith('/dashboard/messages/') && pathname !== '/dashboard/messages';

  // Check admin status (skip for CN environment as it uses different auth)
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;
      
      // CN 环境：跳过 Supabase session 检查，使用自定义 token
      if (isChinaDeployment()) {
        try {
          const response = await fetch('/api/admin/check', {
            method: 'GET',
            cache: 'no-store',
          });

          if (response.ok) {
            const data = await response.json();
            setIsAdmin(data.isAdmin || false);
          }
        } catch (error) {
          setIsAdmin(false);
        }
        return;
      }

      // INTL 环境：使用 Supabase session
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) return;

        const response = await fetch('/api/admin/check', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });

        if (response.ok) {
          const data = await response.json();
          setIsAdmin(data.isAdmin || false);
        }
      } catch (error) {
        setIsAdmin(false);
      }
    };

    if (user) {
      checkAdminStatus();
    }
  }, [user, supabase.auth]);

  // 认证检查：确保用户已登录
  // 关键：不依赖 isChinaDeployment()，直接检查 localStorage 和 cookie
  // 这样即使环境变量配置错误也能正常工作
  useEffect(() => {
    // 获取所有可能的认证数据
    const cnUserData = localStorage.getItem('cn_user');
    const isCN = isChinaDeployment();
    
    console.log(`🛡️ DashboardLayout auth check: loading=${loading}, user=${!!user}, isCN=${isCN}, cnUserData=${!!cnUserData}`);
    
    // 如果 AuthProvider 正在加载，等待
    if (loading) {
      console.log('⏳ DashboardLayout: AuthProvider loading, waiting...');
      return;
    }
    
    // 如果已经重定向过，不再重复
    if (hasRedirectedRef.current) return;
    
    // 如果有用户状态，一切正常
    if (user) {
      hasRedirectedRef.current = false;
      return;
    }
    
    // 用户状态为空，但需要检查是否有持久化的认证数据
    // 关键：不管是 CN 还是 INTL 环境，都检查这些数据
    // 这样可以防止环境变量配置错误导致的问题
    
    if (cnUserData) {
      // localStorage 中有用户数据，说明用户确实登录过
      // AuthProvider 可能还没完成状态恢复，继续等待
      console.log('🔄 DashboardLayout: cn_user exists in localStorage, waiting for AuthProvider...');
      // 不重定向，继续等待
      return;
    }
    
    // 没有任何认证数据，确认用户未登录，执行重定向
    console.log('🚫 DashboardLayout: No user and no auth data found, redirecting to login...');
    hasRedirectedRef.current = true;
    router.replace('/auth/login');
  }, [user, loading, router]);

  // Initialize Firebase Cloud Messaging for push notifications (INTL only)
  useEffect(() => {
    const initializeFCM = async () => {
      // Skip if already initialized or no user
      if (fcmInitializedRef.current || !user?.id) return;

      // Skip FCM in CN environment
      if (process.env.NEXT_PUBLIC_DEPLOYMENT_REGION === 'CN') {
        console.log('[FCM] Skipped - CN environment does not use Firebase');
        return;
      }

      try {
        // Dynamically import Firebase notifications to avoid SSR issues
        const { initializePushNotifications, setupForegroundNotifications, showLocalNotification } =
          await import('@/lib/firebase/notifications');

        // Initialize push notifications (request permission and get token)
        const success = await initializePushNotifications(user.id);

        if (success) {
          fcmInitializedRef.current = true;
          console.log('[FCM] Push notifications initialized for user:', user.id);

          // Setup foreground message listener
          const unsubscribe = setupForegroundNotifications((payload) => {
            console.log('[FCM] Foreground message received:', payload);

            // Show toast notification
            toast({
              title: payload.title,
              description: payload.body,
            });

            // Also show browser notification if app is in focus
            showLocalNotification(payload);
          });

          // Store unsubscribe function for cleanup
          fcmUnsubscribeRef.current = unsubscribe;
        }
      } catch (error) {
        console.warn('[FCM] Failed to initialize push notifications:', error);
      }
    };

    initializeFCM();

    // Cleanup on unmount
    return () => {
      if (fcmUnsubscribeRef.current) {
        fcmUnsubscribeRef.current();
        fcmUnsubscribeRef.current = null;
      }
    };
  }, [user?.id, toast]);

  // Show loading state while checking authentication
  // 或者当有认证数据但 user 状态还未恢复时
  const cnUserData = typeof window !== 'undefined' ? localStorage.getItem('cn_user') : null;
  const hasAuthData = !!cnUserData;
  
  if (loading || (!user && hasAuthData)) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // 没有用户且没有认证数据，不渲染内容（useEffect 会处理重定向）
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardSidebar user={user} isAdmin={isAdmin} />
      {/* 主内容区域：移动端顶部边距避开 mobile header，桌面端左边距和顶部边距避开固定侧边栏和 header */}
      <main className={`pt-16 pb-14 md:pb-0 md:pt-[73px] md:pl-64 transition-all duration-200 ${isChatRoomPage ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
        <div className={`${isSettingsPage || isChatRoomPage ? 'p-0 h-full' : 'p-4 sm:p-6'}`}>
          {children}
        </div>
      </main>
    </div>
  );
} 
