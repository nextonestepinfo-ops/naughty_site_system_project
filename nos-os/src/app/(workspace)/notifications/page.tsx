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
import { apiFetch, useScopedQuery } from "@/lib/hooks/use-api";
import type { Notification as AppNotification } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const notifications = useScopedQuery<AppNotification[]>(["notifications"], "/api/notifications");
  const [permission, setPermission] = useState(typeof Notification !== "undefined" ? Notification.permission : "default");

  const markRead = useMutation({
    mutationFn: (id: string) => apiFetch<AppNotification>(`/api/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  async function requestPush() {
    if (!("Notification" in window)) return;
    const result = await window.Notification.requestPermission();
    setPermission(result);
    await apiFetch("/api/notifications/push-subscription", {
      method: "POST",
      body: JSON.stringify({ endpoint: "phase1-local-demo", permission: result }),
    });
  }

  if (notifications.isLoading || !notifications.data) return <LoadingPanel label="通知を読み込み中" />;

  return (
    <>
      <PageHeader
        title="通知"
        description="タスク追加、期限前日、期限当日、期限超過、勤怠忘れ、管理者通知を扱います。"
        actions={
          <Button variant="secondary" onClick={requestPush}>
            <Smartphone className="h-4 w-4" />
            PWA通知 {permission}
          </Button>
        }
      />

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
