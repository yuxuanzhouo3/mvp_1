'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
import {
  LogOut,
  LayoutDashboard,
  Image,
  BarChart3,
  Shield,
  Home,
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, signOut, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const supabase = getSupabaseClient();
  const { language } = useLanguage();
  const t = useTranslations(language);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (authLoading || !user) {
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          router.push('/auth/login');
          return;
        }

        const response = await fetch('/api/admin/check', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok || response.status === 401) {
          router.push('/auth/login');
          return;
        }

        const data = await response.json();

        if (!data.isAdmin) {
          toast({
            title: t.admin.layout.accessDenied,
            description: t.admin.layout.noPermission,
            variant: 'destructive',
          });
          router.push('/dashboard');
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error('Admin check error:', error);
        router.push('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, [user, authLoading, router, toast, supabase.auth]);

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t.admin.layout.loading}</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const navItems = [
    {
      label: t.admin.layout.dashboard,
      icon: LayoutDashboard,
      path: '/admin',
    },
    {
      label: t.admin.layout.photoReview,
      icon: Image,
      path: '/admin/photo-review',
    },
    {
      label: t.admin.layout.analytics,
      icon: BarChart3,
      path: '/admin/analytics/photos',
    },
    {
      label: t.admin.layout.backToApp,
      icon: Home,
      path: '/dashboard',
      separator: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <Shield className="h-6 w-6 text-blue-600 mr-2" />
          <span className="text-lg font-bold text-blue-600">{t.admin.layout.title}</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.path;

            if (item.separator) {
              return (
                <div key={item.path} className="pt-4 mt-4 border-t border-gray-200">
                  <button
                    onClick={() => router.push(item.path)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    <span>{item.label}</span>
                  </button>
                </div>
              );
            }

            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <item.icon className="h-5 w-5 mr-3" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.email}
              </p>
              <p className="text-xs text-gray-500">{t.admin.layout.administrator}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t.admin.layout.logout}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center px-6">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">
              {t.admin.layout.panelTitle}
            </h1>
          </div>
          <div className="ml-auto">
            <span className="text-sm text-gray-500">
              {pathname.split('/').pop()?.replace('-', ' ') || 'Dashboard'}
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
