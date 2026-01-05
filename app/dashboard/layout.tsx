'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if we're on the settings page
  const isSettingsPage = pathname === '/dashboard/settings';

  // Check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;

      try {
        const response = await fetch('/api/admin/check');
        if (response.ok) {
          const data = await response.json();
          setIsAdmin(data.isAdmin || false);
        }
      } catch (error) {
        console.error('Failed to check admin status:', error);
        setIsAdmin(false);
      }
    };

    if (user) {
      checkAdminStatus();
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      console.log('❌ No user found in dashboard layout, redirecting to login');
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
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardSidebar user={user} isAdmin={isAdmin} />
      <main className="flex-1 w-full">
        <div className={`${isSettingsPage ? 'p-0' : 'p-6'}`}>
          {children}
        </div>
      </main>
    </div>
  );
} 