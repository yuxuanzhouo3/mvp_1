"use client";

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/app/providers/AuthProvider'
import { useToast } from '@/hooks/use-toast'
import { useLanguage } from '@/components/language-provider'
import { useTranslations } from '@/lib/i18n'
import {
  Home,
  MessageSquare,
  Heart,
  CreditCard,
  Settings,
  User,
  LogOut,
  Bell,
  Shield,
  TrendingUp,
  Receipt,
  Menu,
  X
} from 'lucide-react'
import { useState, useEffect } from 'react';

interface UserData {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
    credits?: number;
  };
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface DashboardSidebarProps {
  user: UserData | null;
  isAdmin?: boolean;
}

export const DashboardSidebar = ({ user, isAdmin = false }: DashboardSidebarProps) => {
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useAuth()
  const { toast } = useToast()
  const { language } = useLanguage()
  const t = useTranslations(language)

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close mobile menu on window resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navigation: NavigationItem[] = [
    { name: t.dashboard.sidebar.home, href: '/dashboard', icon: Home },
    { name: t.dashboard.sidebar.chat, href: '/dashboard/messages', icon: MessageSquare },
    { name: t.dashboard.sidebar.matching, href: '/matching', icon: Heart },
    { name: t.dashboard.sidebar.marketValue, href: '/profile/score-details', icon: TrendingUp },
    { name: t.dashboard.sidebar.recharge, href: '/payment/recharge', icon: CreditCard },
    { name: t.dashboard.sidebar.orders || (language === 'zh' ? '我的订单' : 'My Orders'), href: '/dashboard/orders', icon: Receipt },
    { name: t.dashboard.sidebar.settings, href: '/dashboard/settings', icon: Settings },
  ]

  // Add admin navigation if user is admin
  if (isAdmin) {
    navigation.push({
      name: t.dashboard.sidebar.adminPanel,
      href: '/admin',
      icon: Shield
    })
  }

  const handleSignOut = async () => {
    await signOut();
    // signOut already handles cache cleanup and redirect to root
  }

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-50 safe-area-bottom">
        <nav className="flex items-center justify-around h-14">
          {[
            { name: language === 'zh' ? '首页' : 'Home', href: '/dashboard', icon: Home },
            { name: language === 'zh' ? '匹配' : 'Match', href: '/matching', icon: Heart },
            { name: language === 'zh' ? '消息' : 'Messages', href: '/dashboard/messages', icon: MessageSquare },
            { name: language === 'zh' ? '我的' : 'Me', href: '/dashboard/settings', icon: User },
          ].map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs mt-1">{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Desktop Sidebar */}
      <div className={`hidden md:block ${open ? 'w-64' : 'w-20'} shrink-0 transition-all duration-200`}>
        {/* Toggle button */}
        <button
          onClick={() => setOpen((v) => !v)}
          className={`fixed top-[85px] z-50 p-1.5 rounded-full bg-background border shadow-md hover:bg-muted focus:outline-none transition-all duration-200 ${open ? 'left-[248px]' : 'left-[68px]'}`}
          title={open ? (language === 'zh' ? '收起侧边栏' : 'Collapse sidebar') : (language === 'zh' ? '展开侧边栏' : 'Expand sidebar')}
        >
          {open ? (
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          ) : (
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          )}
        </button>

        <div className={`flex flex-col ${open ? 'w-64' : 'w-20'} h-[calc(100vh-73px)] bg-background border-r transition-all duration-200 fixed top-[73px] left-0 z-50 overflow-y-auto`}>
      <div className="flex items-center justify-center h-16 border-b px-4">
          <h1 className={`text-xl font-bold text-primary transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>PersonaLink</h1>
      </div>
      <div className="flex-1 flex flex-col">
          <nav className="flex-1 px-2 py-6 space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                    'flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                  <item.icon className="h-5 w-5" />
                  {open && <span className="ml-3">{item.name}</span>}
              </Link>
            )
          })}
        </nav>
          <div className={`border-t p-2 ${open ? '' : 'flex flex-col items-center'}`}>
            <div className={`flex items-center space-x-3 mb-4 ${open ? '' : 'justify-center'}`}>
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback>
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
              {open && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.user_metadata?.full_name || user?.email}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.user_metadata?.credits || 0} credits
              </p>
            </div>
              )}
          </div>
            <div className={`space-y-2 w-full ${open ? '' : 'flex flex-col items-center'}`}>
            <Button
              variant="ghost"
              size="sm"
                className={`w-full justify-start ${!open ? 'px-2' : ''}`}
              asChild
            >
              <Link href="/dashboard/notifications">
                <Bell className="mr-2 h-4 w-4" />
                  {open && t.dashboard.sidebar.notifications}
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
                className={`w-full justify-start text-destructive hover:text-destructive ${!open ? 'px-2' : ''}`}
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
                {open && t.header.logout}
            </Button>
            </div>
          </div>
        </div>
        </div>
      </div>
    </>
  )
} 