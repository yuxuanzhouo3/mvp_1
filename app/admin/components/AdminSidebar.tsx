"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminLogout } from "@/actions/admin-auth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  ShoppingCart,
  LogOut,
  User,
  Menu,
  X,
  BarChart3,
  Image,
  CreditCard,
  DollarSign,
  Cpu,
  Settings,
  Tag,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  username: string;
}

const navItems = [
  {
    href: "/admin/users",
    label: "用户",
    fullLabel: "用户管理",
    icon: User,
  },
  {
    href: "/admin/stats",
    label: "统计",
    fullLabel: "数据统计",
    icon: BarChart3,
  },
  {
    href: "/admin/orders",
    label: "订单",
    fullLabel: "交易订单",
    icon: ShoppingCart,
  },
];

const featureManagementItems = [
  {
    href: "/admin/photo-review",
    label: "照片审核",
    icon: Image,
  },
  {
    href: "/admin/algorithm-names",
    label: "算法名称",
    icon: Tag,
  },
  {
    href: "/admin/releases",
    label: "版本管理",
    icon: Package,
  },
  {
    href: "/admin/analytics/photos",
    label: "照片分析",
    icon: Image,
  },
  {
    href: "/admin/analytics/credits",
    label: "积分分析",
    icon: CreditCard,
  },
  {
    href: "/admin/analytics/payments",
    label: "支付分析",
    icon: DollarSign,
  },
  {
    href: "/admin/analytics/ai-budget",
    label: "AI预算",
    icon: Cpu,
  },
];

function SidebarContent({
  pathname,
  onNavClick,
}: {
  pathname: string;
  onNavClick: () => void;
}) {
  return (
    <>
      {/* 导航菜单 */}
      <nav className="flex-1 p-3 md:p-4 space-y-4 overflow-y-auto overscroll-contain mt-4">
        {/* 主要功能 */}
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavClick}
                className={cn(
                  "flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-lg transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm md:text-base">{item.fullLabel}</span>
              </Link>
            );
          })}
        </div>

        {/* 功能管理 */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 px-3 md:px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <Settings className="h-4 w-4" />
            <span>功能管理</span>
          </div>
          {featureManagementItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavClick}
                className={cn(
                  "flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-lg transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm md:text-base">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

    </>
  );
}

export default function AdminSidebar({ username }: AdminSidebarProps) {
  const pathname = usePathname() || "";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 关闭菜单时禁止背景滚动
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const handleNavClick = () => setMobileMenuOpen(false);

  return (
    <>
      {/* 移动端菜单按钮 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden fixed top-4 right-4 h-9 w-9 p-0 z-50"
      >
        {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* 移动端侧边栏抽屉 */}
      {mobileMenuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="md:hidden fixed left-0 top-16 bottom-16 w-72 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col z-50 animate-in slide-in-from-left duration-200 shadow-xl">
            <SidebarContent
              pathname={pathname}
              onNavClick={handleNavClick}
            />
          </aside>
        </>
      )}

      {/* 移动端底部导航栏 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 z-50 safe-area-inset-bottom">
        <div className="flex items-center justify-around h-full px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px]",
                  isActive
                    ? "text-primary"
                    : "text-slate-500 dark:text-slate-400 active:bg-slate-100 dark:active:bg-slate-700"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
                <span className={cn("text-xs", isActive && "font-medium")}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* 桌面端固定侧边栏 */}
      <aside className="hidden md:flex fixed left-0 top-16 bottom-0 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex-col">
        <SidebarContent
          pathname={pathname}
          onNavClick={handleNavClick}
        />
      </aside>
    </>
  );
}
