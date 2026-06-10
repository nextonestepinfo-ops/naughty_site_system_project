"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, BellRing, CalendarClock, Check, Home, Smartphone } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { LoadingPanel } from "@/components/domain/loading";
import { PageHeader } from "@/components/domain/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch, useScopedPath, useScopedQuery } from "@/lib/hooks/use-api";
import type { Notification as AppNotification } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";

type PushConfig = {
  enabled: boolean;
  publicKey: string;
  needsVapidKeys: boolean;
};

type PushSubscriptionResult = {
  ok: boolean;
  stored: boolean;
  enabled: boolean;
  reason?: string;
};

const notificationTypeLabels: Record<AppNotification["type"], string> = {
  task_created: "タスク追加",
  due_tomorrow: "明日期限",
  due_today: "本日期限",
  overdue: "期限超過",
  attendance_missing: "勤怠確認",
  admin: "管理",
};

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(window.atob(base64), (char) => char.charCodeAt(0));
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const notifications = useScopedQuery<AppNotification[]>(["notifications"], "/api/notifications");
  const pushPath = useScopedPath("/api/notifications/push-subscription");
  const [permission, setPermission] = useState(typeof Notification !== "undefined" ? Notification.permission : "default");
  const [pushStatus, setPushStatus] = useState("");

  const markRead = useMutation({
    mutationFn: (id: string) => apiFetch<AppNotification>(`/api/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  async function requestPush() {
    if (!("Notification" in window)) {
      setPushStatus("このブラウザは通知に未対応です。");
      return;
    }
    const result = await window.Notification.requestPermission();
    setPermission(result);
    if (result !== "granted") {
      setPushStatus("通知が許可されていません。");
      return;
    }

    const config = await apiFetch<PushConfig>(pushPath).catch(() => ({ enabled: false, publicKey: "", needsVapidKeys: true }));
    if (!config.enabled || !config.publicKey || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      const response = await apiFetch<PushSubscriptionResult>(pushPath, {
        method: "POST",
        body: JSON.stringify({ permission: result }),
      }).catch(() => null);
      setPushStatus(response?.enabled ? "通知許可を保存しました。" : "通知許可OK。サーバーPushはVAPID設定後に有効になります。");
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.publicKey),
      }));
    const response = await apiFetch<PushSubscriptionResult>(pushPath, {
      method: "POST",
      body: JSON.stringify({ permission: result, subscription: subscription.toJSON() }),
    });
    setPushStatus(response.stored ? "バックグラウンド通知を登録しました。" : "通知許可OK。購読保存はまだ未完了です。");
  }

  if (notifications.isLoading || !notifications.data) return <LoadingPanel label="通知を準備中" />;

  const unread = notifications.data.filter((notice) => !notice.readAt);
  const summary = {
    overdue: unread.filter((notice) => notice.type === "overdue").length,
    today: unread.filter((notice) => notice.type === "due_today").length,
    tomorrow: unread.filter((notice) => notice.type === "due_tomorrow").length,
    unread: unread.length,
  };

  return (
    <>
      <PageHeader
        title="通知"
        description="期限、本日対応、勤怠の確認をここに集約します。"
        kicker="NOTIFICATIONS"
        actions={
          <Button variant="ghost" onClick={requestPush}>
            <Smartphone className="h-4 w-4" />
            PWA通知 {permission}
          </Button>
        }
      />
      {pushStatus ? <p className="mb-3 rounded-panel bg-indigo-50 px-3 py-2 text-sm text-indigo-800">{pushStatus}</p> : null}

      <section className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <NoticeMetric icon={<CalendarClock className="h-4 w-4" />} label="本日期限" value={summary.today} tone={summary.today ? "amber" : "green"} />
        <NoticeMetric icon={<CalendarClock className="h-4 w-4" />} label="明日期限" value={summary.tomorrow} tone={summary.tomorrow ? "blue" : "green"} />
        <NoticeMetric icon={<AlertTriangle className="h-4 w-4" />} label="超過" value={summary.overdue} tone={summary.overdue ? "red" : "green"} />
        <NoticeMetric icon={<BellRing className="h-4 w-4" />} label="未読" value={summary.unread} tone={summary.unread ? "blue" : "green"} />
      </section>

      <section className="mb-5 grid gap-3 lg:grid-cols-3">
        <SetupCard
          icon={<Home className="h-4 w-4" />}
          title="ホーム画面に追加"
          body="iPhoneは共有メニューからホーム画面に追加。追加後はアプリのように開けます。"
          badge="スマホ推奨"
        />
        <SetupCard
          icon={<Smartphone className="h-4 w-4" />}
          title="通知許可"
          body={permission === "granted" ? "このブラウザは通知許可済みです。" : "ボタンから通知を許可すると、期限通知の準備ができます。"}
          badge={permission === "granted" ? "許可済み" : "未許可"}
          tone={permission === "granted" ? "green" : "amber"}
        />
        <SetupCard
          icon={<CalendarClock className="h-4 w-4" />}
          title="期限の確認"
          body="毎朝、期限超過・本日期限・明日期限を確認できます。対象タスクは開くボタンから直接移動できます。"
          badge="社員テスト"
        />
      </section>

      <section className="space-y-3">
        {notifications.data.length ? notifications.data.map((notice) => (
          <Card key={notice.id} className={cn(notice.readAt && "opacity-60")}>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className={cn("grid h-10 w-10 place-items-center rounded-full", severityClass(notice.severity))}>
                <BellRing className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-extrabold text-[#0B1226]">{notice.title}</p>
                  <Badge tone={notice.severity === "danger" ? "red" : notice.severity === "warning" ? "amber" : "blue"}>{notificationTypeLabels[notice.type]}</Badge>
                  {notice.readAt ? <Badge tone="green">既読</Badge> : null}
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-500">{notice.body}</p>
                <p className="mt-1 text-xs text-slate-400">{formatDateTime(notice.createdAt)}</p>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                {notice.targetHref ? (
                  <Link href={notice.targetHref}>
                    <Button variant="ghost">
                      <ArrowRight className="h-4 w-4" />
                      開く
                    </Button>
                  </Link>
                ) : null}
                <Button variant="ghost" disabled={Boolean(notice.readAt) || markRead.isPending} onClick={() => markRead.mutate(notice.id)}>
                  <Check className="h-4 w-4" />
                  既読
                </Button>
              </div>
            </CardContent>
          </Card>
        )) : (
          <Card>
            <CardContent className="p-4 text-sm text-slate-500">通知はありません。期限が近づくとここに表示されます。</CardContent>
          </Card>
        )}
      </section>
    </>
  );
}

function NoticeMetric({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "blue" | "green" | "red" | "amber";
}) {
  const toneClass = {
    blue: "bg-indigo-50 text-indigo-700",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-700",
  }[tone];

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-3">
          <span className={`grid h-8 w-8 place-items-center rounded-full ${toneClass}`}>{icon}</span>
          <span className="text-2xl font-extrabold text-[#0B1226]">{value}</span>
        </div>
        <p className="mt-2 text-xs font-bold text-slate-500">{label}</p>
      </CardContent>
    </Card>
  );
}

function SetupCard({
  icon,
  title,
  body,
  badge,
  tone = "blue",
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  badge: string;
  tone?: "blue" | "green" | "amber";
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-700">{icon}</span>
            <p className="font-extrabold text-[#0B1226]">{title}</p>
          </div>
          <Badge tone={tone}>{badge}</Badge>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-500">{body}</p>
      </CardContent>
    </Card>
  );
}

function severityClass(severity: AppNotification["severity"]) {
  if (severity === "danger") return "bg-red-50 text-red-600";
  if (severity === "warning") return "bg-amber-50 text-amber-700";
  if (severity === "success") return "bg-emerald-50 text-emerald-700";
  return "bg-indigo-50 text-indigo-700";
}
