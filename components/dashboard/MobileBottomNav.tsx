"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageSquare, Heart, User } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { isChinaDeployment } from "@/lib/config/deployment.config";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { language } = useLanguage();

  const chatHref = isChinaDeployment() ? "/dashboard/messages/cn-chat" : "/dashboard/messages";

  const items = [
    { name: language === "zh" ? "首页" : "Home", href: "/dashboard", icon: Home },
    { name: language === "zh" ? "匹配" : "Match", href: "/matching", icon: Heart },
    { name: language === "zh" ? "赞" : "Likes", href: "/matching/history", icon: Heart },
    { name: language === "zh" ? "消息" : "Messages", href: chatHref, icon: MessageSquare },
    { name: language === "zh" ? "个人资料" : "Profile", href: "/dashboard/settings", icon: User },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-50 safe-area-bottom">
      <nav className="flex items-center justify-around h-14">
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs mt-1">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

