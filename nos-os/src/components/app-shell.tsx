"use client";

import {
  Bell,
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  Home,
  LogOut,
  Moon,
  Settings,
  Sun,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AssistantDock } from "@/components/domain/assistant-dock";
import { BrandMark, BrandText, nosBrand } from "@/components/domain/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { roleLabels } from "@/lib/data/labels";
import { useAppStore } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";

const navItems: Array<{ href: string; label: string; icon: LucideIcon; adminOnly?: boolean }> = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/projects", label: "案件", icon: BriefcaseBusiness },
  { href: "/tasks", label: "タスク", icon: ClipboardList },
  { href: "/customers", label: "顧客", icon: Building2, adminOnly: true },
  { href: "/employees", label: "社員", icon: Users, adminOnly: true },
  { href: "/attendance", label: "勤怠", icon: CalendarClock },
  { href: "/assistant", label: "AI", icon: Bot },
];

const mobileItems = navItems.filter((item) => ["/", "/projects", "/tasks", "/attendance", "/assistant"].includes(item.href));

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const session = useAppStore((state) => state.session);
  const hydrated = useAppStore((state) => state.hydrated);
  const hydrateSession = useAppStore((state) => state.hydrateSession);
  const logout = useAppStore((state) => state.logout);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  useEffect(() => {
    if (hydrated && !session) router.replace("/login");
  }, [hydrated, router, session]);

  if (!hydrated || !session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <BrandMark className="h-12 w-12 animate-pulse" />
      </main>
    );
  }

  const filteredNav = navItems.filter((item) => !item.adminOnly || session.role === "admin");

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-card px-4 py-5 lg:block">
        <Link href="/" className="flex items-center gap-3">
          <BrandMark className="h-12 w-12 shrink-0" />
          <div>
            <BrandText />
            <p className="mt-1 text-[10px] font-semibold uppercase text-accent">{nosBrand.tagline}</p>
          </div>
        </Link>

        <nav className="mt-8 space-y-1">
          {filteredNav.map((item) => (
            <NavLink key={item.href} item={item} active={pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))} />
          ))}
        </nav>

        <div className="absolute bottom-5 left-4 right-4 space-y-3">
          <Link
            href="/notifications"
            className={cn(
              "flex h-11 items-center gap-3 rounded-panel px-3 text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-white/10",
              pathname.startsWith("/notifications") && "bg-slate-100 dark:bg-white/10",
            )}
          >
            <Bell className="h-4 w-4" />
            通知
            <ChevronRight className="ml-auto h-4 w-4 text-slate-400" />
          </Link>
          <Link
            href="/settings"
            className={cn(
              "flex h-11 items-center gap-3 rounded-panel px-3 text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-white/10",
              pathname.startsWith("/settings") && "bg-slate-100 dark:bg-white/10",
            )}
          >
            <Settings className="h-4 w-4" />
            設定
            <ChevronRight className="ml-auto h-4 w-4 text-slate-400" />
          </Link>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-border bg-background/88 px-4 py-3 backdrop-blur lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <Link href="/" className="flex min-w-0 items-center gap-2 lg:hidden">
              <BrandMark className="h-10 w-10 shrink-0" />
              <BrandText compact />
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <Badge tone={session.role === "admin" ? "blue" : "green"}>{roleLabels[session.role]}</Badge>
              <Button
                aria-label="テーマ切替"
                title="テーマ切替"
                variant="ghost"
                size="icon"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              >
                {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Link href="/notifications" className="grid h-10 w-10 place-items-center rounded-panel hover:bg-slate-100 dark:hover:bg-white/10" title="通知">
                <Bell className="h-4 w-4" />
              </Link>
              <Link href="/settings" className="hidden h-10 items-center gap-2 rounded-panel px-2 text-sm hover:bg-slate-100 dark:hover:bg-white/10 sm:flex">
                <UserRound className="h-4 w-4" />
                <span className="max-w-28 truncate">{session.name}</span>
              </Link>
              <Button
                aria-label="ログアウト"
                title="ログアウト"
                variant="ghost"
                size="icon"
                onClick={() => {
                  logout();
                  router.replace("/login");
                }}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 pb-28 pt-5 lg:px-8 lg:pb-10">{children}</main>
      </div>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-2 py-2 backdrop-blur lg:hidden">
        <div className="grid grid-cols-5 gap-1">
          {mobileItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-14 flex-col items-center justify-center gap-1 rounded-panel text-[11px] font-medium text-slate-500",
                (pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))) && "bg-slate-100 text-primary dark:bg-white/10 dark:text-white",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
      <AssistantDock />
    </div>
  );
}

function NavLink({
  item,
  active,
}: {
  item: { href: string; label: string; icon: LucideIcon };
  active: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex h-11 items-center gap-3 rounded-panel px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10",
        active && "bg-slate-100 text-primary dark:bg-white/10 dark:text-white",
      )}
    >
      <item.icon className="h-4 w-4" />
      {item.label}
    </Link>
  );
}
