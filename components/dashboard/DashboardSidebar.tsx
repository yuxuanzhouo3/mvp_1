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
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useAuth()
  const { toast } = useToast()

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: '已退出登录',
        description: '期待您的再次光临！',
      });
    } catch (error) {
      toast({
        title: '退出失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="flex flex-col w-64 bg-background border-r">
      <div className="flex items-center justify-center h-16 border-b px-4">
        <h1 className="text-xl font-bold text-primary">PersonaLink</h1>
      </div>
      
      <div className="flex-1 flex flex-col">
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>
        
        <div className="border-t p-4">
          <div className="flex items-center space-x-3 mb-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback>
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.user_metadata?.full_name || user?.email}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.user_metadata?.credits || 0} credits
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              asChild
            >
              <Link href="/dashboard/notifications">
                <Bell className="mr-2 h-4 w-4" />
                Notifications
              </Link>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-destructive hover:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 