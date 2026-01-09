'use client';

import { useAuth } from '@/app/providers/AuthProvider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NotificationDropdown } from './NotificationDropdown';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface DashboardTopBarProps {
  className?: string;
}

export function DashboardTopBar({ className }: DashboardTopBarProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = useTranslations(language);

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const avatarUrl = user?.user_metadata?.avatar_url;

  return (
    <div className={`flex items-center justify-end gap-3 px-6 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 ${className}`}>
      {/* Help Button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
        asChild
      >
        <Link href="/help">
          <HelpCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </Link>
      </Button>

      {/* Notification Dropdown */}
      <NotificationDropdown />

      {/* User Avatar */}
      <Link href="/dashboard/settings" className="flex items-center">
        <Avatar className="h-9 w-9 border-2 border-primary/20 hover:border-primary/50 transition-colors cursor-pointer">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {userName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Link>
    </div>
  );
}

export default DashboardTopBar;
