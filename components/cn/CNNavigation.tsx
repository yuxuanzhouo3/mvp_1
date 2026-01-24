/**
 * CN版导航栏组件
 * 简化版导航，适合中老年家长用户
 */

'use client';

import { memo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
import { 
  Menu,
  X,
  Home,
  Users,
  MessageCircle,
  User,
  Settings,
  LogOut,
  Heart,
  HelpCircle,
  Bell
} from 'lucide-react';

// ========================================
// 类型定义
// ========================================

interface CNNavigationProps {
  /** 用户名 */
  username?: string;
  /** 头像URL */
  avatarUrl?: string;
  /** 未读消息数 */
  unreadCount?: number;
  /** 是否已登录 */
  isLoggedIn?: boolean;
  /** 登出回调 */
  onLogout?: () => void;
  /** 自定义类名 */
  className?: string;
}

// ========================================
// 导航链接配置
// ========================================

const navLinks = [
  { href: '/dashboard', label: '首页', icon: Home },
  { href: '/matching', label: '推荐', icon: Heart },
  { href: '/chat', label: '消息', icon: MessageCircle, badge: true },
  { href: '/help', label: '帮助', icon: HelpCircle },
];

// ========================================
// 导航链接组件
// ========================================

interface NavLinkProps {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  badge?: number;
  onClick?: () => void;
}

function NavLink({ href, label, icon: Icon, isActive, badge, onClick }: NavLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "cn-nav-link flex items-center gap-2 relative",
        isActive && "active"
      )}
    >
      <Icon className="w-5 h-5" />
      <span className="text-base">{label}</span>
      {badge !== undefined && badge > 0 && (
        <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-yellow-400 text-xs">
          {badge > 99 ? '99+' : badge}
        </Badge>
      )}
    </Link>
  );
}

// ========================================
// 移动端菜单组件
// ========================================

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  pathname: string;
  unreadCount?: number;
  isLoggedIn?: boolean;
  username?: string;
  onLogout?: () => void;
}

function MobileMenu({ 
  isOpen, 
  onClose, 
  pathname, 
  unreadCount,
  isLoggedIn,
  username,
  onLogout 
}: MobileMenuProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* 菜单面板 */}
      <div className="fixed inset-y-0 right-0 w-64 bg-white shadow-xl">
        <div className="flex flex-col h-full">
          {/* 头部 */}
          <div className="flex items-center justify-between p-4 border-b">
            <span className="text-lg font-semibold text-red-600">菜单</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          {/* 用户信息 */}
          {isLoggedIn && username && (
            <div className="p-4 bg-red-50 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white font-bold">
                  {username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{username}</div>
                  <div className="text-sm text-gray-500">家长模式</div>
                </div>
              </div>
            </div>
          )}
          
          {/* 导航链接 */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg transition-colors",
                    pathname === link.href
                      ? "bg-red-50 text-red-600"
                      : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <link.icon className="w-5 h-5" />
                  <span className="text-base font-medium">{link.label}</span>
                  {link.badge && unreadCount !== undefined && unreadCount > 0 && (
                    <Badge className="ml-auto bg-red-500 text-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                  )}
                </Link>
              ))}
            </div>
          </nav>
          
          {/* 底部操作 */}
          <div className="p-4 border-t space-y-2">
            {isLoggedIn ? (
              <>
                <Link
                  href="/profile"
                  onClick={onClose}
                  className="flex items-center gap-3 p-3 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  <User className="w-5 h-5" />
                  <span>个人资料</span>
                </Link>
                <Link
                  href="/settings"
                  onClick={onClose}
                  className="flex items-center gap-3 p-3 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  <Settings className="w-5 h-5" />
                  <span>设置</span>
                </Link>
                <button
                  onClick={() => {
                    onLogout?.();
                    onClose();
                  }}
                  className="flex items-center gap-3 p-3 rounded-lg text-red-600 hover:bg-red-50 w-full"
                >
                  <LogOut className="w-5 h-5" />
                  <span>退出登录</span>
                </button>
              </>
            ) : (
              <Link
                href="/auth/login"
                onClick={onClose}
                className="flex items-center justify-center gap-2 p-3 rounded-lg bg-red-500 text-white font-medium"
              >
                登录 / 注册
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ========================================
// 主组件
// ========================================

function CNNavigationComponent({
  username,
  avatarUrl,
  unreadCount = 0,
  isLoggedIn = false,
  onLogout,
  className
}: CNNavigationProps) {
  const { language } = useLanguage();
  const t = useTranslations(language);
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <nav className={cn("theme-cn cn-nav sticky top-0 z-40", className)}>
        <div className="max-w-7xl mx-auto flex items-center justify-between w-full">
          {/* Logo */}
          <Link href="/" className="cn-nav-logo">
            <Heart className="w-6 h-6 fill-white" />
            <span>PersonaLink</span>
            <Badge className="cn-parent-mode-badge ml-2 text-xs py-0.5">
              家长相亲
            </Badge>
          </Link>

          {/* 桌面端导航 */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map(link => (
              <NavLink
                key={link.href}
                {...link}
                isActive={pathname === link.href}
                badge={link.badge ? unreadCount : undefined}
              />
            ))}
          </div>

          {/* 右侧操作区 */}
          <div className="flex items-center gap-3">
            {/* 通知图标 */}
            {isLoggedIn && (
              <button className="relative p-2 text-white/80 hover:text-white transition-colors">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full" />
                )}
              </button>
            )}

            {/* 用户菜单（桌面端） */}
            {isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                      {avatarUrl ? (
                        <Image src={avatarUrl} alt={username || 'User'} width={32} height={32} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        username?.charAt(0).toUpperCase() || 'U'
                      )}
                    </div>
                    <span className="text-white text-sm">{username}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      个人资料
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      设置
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={onLogout}
                    className="text-red-600 focus:text-red-600"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link 
                href="/auth/login"
                className="hidden lg:block px-4 py-2 bg-white text-red-600 rounded-full font-medium hover:bg-gray-100 transition-colors"
              >
                登录 / 注册
              </Link>
            )}

            {/* 移动端菜单按钮 */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-white hover:bg-white/10"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </nav>

      {/* 移动端菜单 */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        pathname={pathname || '/'}
        unreadCount={unreadCount}
        isLoggedIn={isLoggedIn}
        username={username}
        onLogout={onLogout}
      />
    </>
  );
}

export const CNNavigation = memo(CNNavigationComponent);
export default CNNavigation;

