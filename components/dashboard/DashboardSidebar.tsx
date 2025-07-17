"use client";

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/app/providers/AuthProvider'
import { useToast } from '@/hooks/use-toast'
import { 
  Home, 
  MessageSquare, 
  Heart, 
  CreditCard, 
  Settings, 
  User,
  LogOut,
  Bell
} from 'lucide-react'
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Chat', href: '/chat', icon: MessageSquare },
  { name: 'Matching', href: '/matching', icon: Heart },
  { name: 'Recharge', href: '/payment/recharge', icon: CreditCard },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

interface UserData {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
    credits?: number;
  };
}

interface DashboardSidebarProps {
  user: UserData | null;
}

export const DashboardSidebar = ({ user }: DashboardSidebarProps) => {
  const [open, setOpen] = useState(true);
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useAuth()
  const { toast } = useToast()

  const handleSignOut = async () => {
    try {
      await signOut();
      // Force redirect to login page and clear all state
      window.location.href = '/auth/login';
      toast({
        title: '已退出登录',
        description: '期待您的再次光临！',
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: '退出失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="relative">
      {/* Toggle button positioned 99% to the left */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="absolute -left-12 top-4 z-50 p-2 rounded-md bg-background border shadow-md hover:bg-muted focus:outline-none transition-colors"
        title={open ? '收起侧边栏' : '展开侧边栏'}
      >
        {open ? (
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        ) : (
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        )}
      </button>

      <div className={`flex flex-col ${open ? 'w-64' : 'w-20'} bg-background border-r transition-all duration-200`}>
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
                  {open && 'Notifications'}
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`w-full justify-start text-destructive hover:text-destructive ${!open ? 'px-2' : ''}`}
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {open && 'Sign Out'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 