'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

  // FCM initialization ref to prevent duplicate initialization
  const fcmInitializedRef = useRef(false);
  // Store unsubscribe function for cleanup
  const fcmUnsubscribeRef = useRef<(() => void) | null>(null);

  // Check if we're on the settings page
  const isSettingsPage = pathname === '/dashboard/settings';
  // Check if we're in a chat room page
  const isChatRoomPage = pathname?.startsWith('/dashboard/messages/') && pathname !== '/dashboard/messages';

  // Check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;

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

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/login');
    }
  }, [user, loading, router]);

  // Initialize Firebase Cloud Messaging for push notifications
  useEffect(() => {
    const initializeFCM = async () => {
      // Skip if already initialized or no user
      if (fcmInitializedRef.current || !user?.id) return;

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
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Dont render anything if user is not authenticated
  if (!user) {
    return null;
  }

  return (
    <div className={`flex flex-col md:flex-row ${isChatRoomPage ? 'h-screen overflow-hidden' : 'min-h-screen'} bg-gray-50 dark:bg-gray-900`}>
      <DashboardSidebar user={user} isAdmin={isAdmin} />
      <main className={`flex-1 w-full ${isChatRoomPage ? 'h-full overflow-hidden' : ''}`}>
        <div className={`${isSettingsPage || isChatRoomPage ? 'p-0 h-full' : 'p-6'}`}>
          {children}
        </div>
      </main>
    </div>
  );
} 