'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { getSupabaseClient } from '@/lib/supabase/client';

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