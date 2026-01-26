"use client";

import Link from "next/link";
import { adminLogout } from "@/actions/admin-auth";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, LogOut, User } from "lucide-react";

interface AdminTopBarProps {
  username: string;
}

export default function AdminTopBar({ username }: AdminTopBarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-50">
      <div className="h-full flex items-center justify-between px-6">
        {/* Logo and Title */}
        <Link href="/admin/stats" className="flex items-center gap-3">
          <LayoutDashboard className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">PersonaLink管理后台</span>
        </Link>

        {/* User Info and Logout */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium hidden sm:block">{username}</span>
          </div>

          <form action={adminLogout}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="text-slate-600 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">退出登录</span>
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
