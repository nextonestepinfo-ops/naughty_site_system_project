"use client";

import {
  Bell,
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  ChevronRight,
  ClipboardList,
  FilePenLine,
  FlaskConical,
  LogOut,
  Megaphone,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/domain/avatar";
import { PageHeader } from "@/components/domain/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { roleLabels } from "@/lib/data/labels";
import { useScopedQuery } from "@/lib/hooks/use-api";
import { useAppStore } from "@/lib/store/app-store";
import type { Notification as AppNotification } from "@/lib/types";

type MenuItem = {
  href: string;
  label: string;
  helper: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  badge?: string;
};

const baseItems: MenuItem[] = [
  { href: "/notifications", label: "通知", helper: "期限・完了・確認事項を見る", icon: Bell },
  { href: "/reports", label: "日報", helper: "今日の日報を書く、保存済みを見る", icon: FilePenLine },
  { href: "/projects", label: "案件", helper: "案件の進行と担当を見る", icon: BriefcaseBusiness },
  { href: "/tasks", label: "タスク", helper: "一覧で絞り込み、まとめて操作する", icon: ClipboardList },
  { href: "/settings", label: "設定", helper: "パスワード、テーマ、通知設定", icon: Settings },
  { href: "/guide", label: "使い方", helper: "初めて使う人向けの手順", icon: BookOpenCheck },
];

const adminItems: MenuItem[] = [
  { href: "/admin", label: "管理", helper: "チーム状況、完了通知、遅延を確認", icon: ShieldCheck, adminOnly: true },
  { href: "/employees", label: "社員", helper: "社員アカウントと権限を管理", icon: Users, adminOnly: true },
  { href: "/customers", label: "顧客", helper: "顧客情報と案件の入口", icon: Building2, adminOnly: true },
  { href: "/sales", label: "営業素材", helper: "提案・営業用の素材を管理", icon: Megaphone, adminOnly: true },
  { href: "/test", label: "システム診断", helper: "公開準備、Supabase、AIの状態", icon: FlaskConical, adminOnly: true },
];

export default function MenuPage() {
  const router = useRouter();
  const session = useAppStore((state) => state.session);
  const logout = useAppStore((state) => state.logout);
  const notifications = useScopedQuery<AppNotification[]>(["notifications", "menu"], "/api/notifications");
  const unreadCount = notifications.data?.filter((notice) => !notice.readAt).length ?? 0;

  const items = [
    ...baseItems.map((item) => (item.href === "/notifications" && unreadCount ? { ...item, badge: `${unreadCount}` } : item)),
    ...(session?.role === "admin" ? adminItems : []),
  ];

  return (
    <>
      <PageHeader title="メニュー" kicker="MENU" />

      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="overflow-hidden">
          <div className="h-2 bg-[#0B1226] dark:bg-white/20" />
          <CardContent className="p-4">
            <Link href={session ? `/employees/${session.employeeId}` : "/settings"} className="flex min-h-16 items-center gap-3 rounded-panel bg-slate-50 p-3 ring-1 ring-border dark:bg-white/5 dark:ring-white/10">
              <Avatar label={session?.name.slice(0, 1) ?? "N"} />
              <div className="min-w-0">
                <p className="truncate text-lg font-extrabold text-[#0B1226] dark:text-white">{session?.name ?? "ログイン中"}</p>
                <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-300">{session ? roleLabels[session.role] : "NOS OS"}</p>
              </div>
              <ChevronRight className="ml-auto h-5 w-5 shrink-0 text-slate-400" />
            </Link>

            <button
              className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-panel bg-slate-100 text-sm font-extrabold text-[#0B1226] ring-1 ring-border transition active:scale-[.98] dark:bg-white/10 dark:text-white dark:ring-white/10"
              onClick={() => {
                logout();
                router.replace("/login");
              }}
            >
              <LogOut className="h-4 w-4" />
              ログアウト
            </button>
          </CardContent>
        </Card>

        <div className="grid gap-3">
          {items.map((item) => (
            <MenuRow key={item.href} item={item} />
          ))}
        </div>
      </section>
    </>
  );
}

function MenuRow({ item }: { item: MenuItem }) {
  return (
    <Link href={item.href} className="flex min-h-[68px] items-center gap-3 rounded-panel bg-white p-3 shadow-soft ring-1 ring-slate-100 transition active:scale-[.98] dark:bg-card dark:shadow-none dark:ring-white/10">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[16px] bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-100">
        <item.icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-extrabold text-[#0B1226] dark:text-white">{item.label}</span>
          {item.badge ? <Badge tone="red">{item.badge}</Badge> : null}
        </span>
        <span className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500 dark:text-slate-300">{item.helper}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
    </Link>
  );
}
