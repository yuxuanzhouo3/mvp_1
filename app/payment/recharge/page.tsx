'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import CreditRecharge from '@/components/payment/CreditRecharge';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';

export default function PaymentRechargePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const { language } = useLanguage();
  const t = useTranslations(language);

  // Check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;
      try {
        const response = await fetch('/api/admin/check', { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          setIsAdmin(data.isAdmin || false);
        }
      } catch {
        setIsAdmin(false);
      }
    };
    if (user) {
      checkAdminStatus();
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [authLoading, user, router]);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t.payment.recharge.checkingAuth}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardSidebar user={user} isAdmin={isAdmin} />
      <main className="flex-1 w-full pt-14 md:pt-0">
        <CreditRecharge />
      </main>
    </div>
  );
}
