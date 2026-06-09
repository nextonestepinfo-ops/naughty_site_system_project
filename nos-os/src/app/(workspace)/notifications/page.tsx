"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, BellRing, Check, Smartphone } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { LoadingPanel } from "@/components/domain/loading";
import { PageHeader } from "@/components/domain/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch, useScopedPath, useScopedQuery } from "@/lib/hooks/use-api";
import type { Notification as AppNotification } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

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

  if (notifications.isLoading || !notifications.data) return <LoadingPanel label="通知を読み込み中" />;

  return (
    <>
      <PageHeader
        title="通知"
        description="本日、明日、期限超過のタスクを自動で確認します。通知許可後は、アプリを開いている間にOS通知でも知らせます。"
        actions={
          <Button variant="secondary" onClick={requestPush}>
            <Smartphone className="h-4 w-4" />
            PWA通知 {permission}
          </Button>
        }
      />
      {pushStatus ? <p className="mb-3 rounded-panel bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:bg-blue-500/15 dark:text-blue-100">{pushStatus}</p> : null}

      <section className="space-y-3">
        {notifications.data.map((notice) => (
          <Card key={notice.id}>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="grid h-10 w-10 place-items-center rounded-panel bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
                <BellRing className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{notice.title}</p>
                  <Badge tone={notice.severity === "danger" ? "red" : notice.severity === "warning" ? "amber" : "blue"}>{notice.type}</Badge>
                  {notice.readAt ? <Badge tone="green">既読</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-slate-500">{notice.body}</p>
                <p className="mt-1 text-xs text-slate-400">{formatDateTime(notice.createdAt)}</p>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                {notice.targetHref ? (
                  <Link href={notice.targetHref}>
                    <Button variant="secondary">
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
        ))}
      </section>
    </>
  );
}
