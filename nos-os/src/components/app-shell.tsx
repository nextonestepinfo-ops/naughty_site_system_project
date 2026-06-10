"use client";

import {
  Bell,
  BookOpenCheck,
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  FilePenLine,
  FlaskConical,
  Home,
  LogOut,
  Megaphone,
  Settings,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AssistantDock } from "@/components/domain/assistant-dock";
import { BrandMark, BrandText, nosBrand } from "@/components/domain/brand";
import { ThemeModeControl } from "@/components/domain/theme-mode-control";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { roleLabels } from "@/lib/data/labels";
import { useAppStore } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";

const navItems: Array<{ href: string; label: string; icon: LucideIcon; adminOnly?: boolean }> = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/tasks", label: "タスク", icon: ClipboardList },
  { href: "/assistant", label: "秘書", icon: Bot },
  { href: "/attendance", label: "勤怠", icon: CalendarClock },
  { href: "/reports", label: "日報", icon: FilePenLine },
  { href: "/notifications", label: "通知", icon: Bell },
  { href: "/projects", label: "案件", icon: BriefcaseBusiness },
  { href: "/sales", label: "営業素材", icon: Megaphone },
  { href: "/customers", label: "顧客", icon: Building2, adminOnly: true },
  { href: "/employees", label: "社員", icon: Users, adminOnly: true },
  { href: "/guide", label: "使い方", icon: BookOpenCheck },
  { href: "/test", label: "テスト", icon: FlaskConical, adminOnly: true },
];

const mobileItems = navItems.filter((item) => ["/", "/tasks", "/assistant", "/attendance", "/notifications"].includes(item.href));

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
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
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 bg-[#050816] px-4 py-5 text-white shadow-command lg:block">
        <Link href="/" className="flex items-center gap-3 rounded-panel bg-white/7 p-3 ring-1 ring-white/10">
          <BrandMark className="h-12 w-12 shrink-0" />
          <div className="min-w-0">
            <p className="font-bold leading-tight">{nosBrand.appName}</p>
            <p className="mt-1 truncate text-[11px] font-semibold text-slate-300">{nosBrand.tagline}</p>
          </div>
        </Link>

        <nav className="mt-6 space-y-1">
          {filteredNav.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
          ))}
        </nav>

        <div className="absolute bottom-5 left-4 right-4 rounded-panel bg-white/7 p-3 ring-1 ring-white/10">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#E08F12] text-sm font-extrabold text-white">
              {session.name.slice(0, 1)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{session.name}</p>
              <p className="text-xs text-slate-300">{roleLabels[session.role]}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link href="/settings" className="inline-flex h-10 items-center justify-center gap-2 rounded-control bg-white/10 text-xs font-bold text-white hover:bg-white/15">
              <Settings className="h-4 w-4" />
              設定
            </Link>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-control bg-white/10 text-xs font-bold text-white hover:bg-white/15"
              onClick={() => {
                logout();
                router.replace("/login");
              }}
            >
              <LogOut className="h-4 w-4" />
              退出
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-white/80 bg-[#F4F6FA]/88 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-[#030711]/90 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <Link href="/" className="flex min-w-0 items-center gap-2 lg:hidden">
              <BrandMark className="h-10 w-10 shrink-0" />
              <BrandText compact />
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <ThemeModeControl compact />
              <Badge className="hidden sm:inline-flex" tone={session.role === "admin" ? "blue" : "green"}>{roleLabels[session.role]}</Badge>
              <Link href={`/employees/${session.employeeId}`} className="hidden h-11 items-center gap-2 rounded-panel bg-white px-3 text-sm font-bold shadow-soft dark:bg-white/10 dark:text-white dark:shadow-none sm:flex">
                <UserRound className="h-4 w-4" />
                <span className="max-w-32 truncate">{session.name}</span>
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

        <main className="mx-auto max-w-7xl px-4 pb-32 pt-5 lg:px-8 lg:pb-10">{children}</main>
      </div>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-white/80 px-2 py-2 frosted-tabbar lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 items-end gap-1">
          {mobileItems.map((item) => (
            <MobileNavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
          ))}
        </div>
      </nav>
      <AssistantDock />
    </div>
  );
}

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(href));
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
        "flex h-11 items-center gap-3 rounded-control px-3 text-sm font-bold text-slate-300 transition hover:bg-white/10 hover:text-white",
        active && "bg-white text-[#0B1226] hover:bg-white hover:text-[#0B1226]",
      )}
    >
      <item.icon className="h-4 w-4" />
      {item.label}
      {active ? <ChevronRight className="ml-auto h-4 w-4" /> : null}
    </Link>
  );
}

function MobileNavLink({
  item,
  active,
}: {
  item: { href: string; label: string; icon: LucideIcon };
  active: boolean;
}) {
  const isAssistant = item.href === "/assistant";
  return (
    <Link
      href={item.href}
      className={cn(
        "relative flex h-14 flex-col items-center justify-center gap-1 rounded-panel text-[11px] font-bold text-slate-500",
        active && !isAssistant && "bg-white text-[#0B1226] shadow-soft dark:bg-white/10 dark:text-white dark:shadow-none",
        isAssistant && "-mt-7 h-[72px] text-[#6366F1]",
      )}
      aria-label={item.label}
    >
      <span
        className={cn(
          "grid place-items-center",
          isAssistant
            ? "h-[58px] w-[58px] rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] text-white shadow-[0_12px_26px_rgba(99,102,241,0.28)] ring-[3px] ring-white"
            : "h-6 w-6",
        )}
      >
        <item.icon className={cn(isAssistant ? "h-6 w-6" : "h-5 w-5")} />
      </span>
      <span className={cn(isAssistant && "sr-only")}>{item.label}</span>
    </Link>
  );
}
