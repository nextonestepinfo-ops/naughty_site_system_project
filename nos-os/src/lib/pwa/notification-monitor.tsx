"use client";

import { useEffect } from "react";
import type { Notification as AppNotification } from "@/lib/types";
import { apiFetch } from "@/lib/hooks/use-api";
import { useAppStore } from "@/lib/store/app-store";

const notifiedStoragePrefix = "nos-os-notified-notices";
const eligibleTypes = new Set(["due_today", "due_tomorrow", "overdue", "admin"]);

function scopedNotificationsPath(session: { id: string; role: string; employeeId: string }) {
  const params = new URLSearchParams({
    role: session.role,
    employeeId: session.employeeId,
    userId: session.id,
  });
  return `/api/notifications?${params.toString()}`;
}

function readNotifiedIds(userId: string) {
  try {
    return new Set(JSON.parse(window.localStorage.getItem(`${notifiedStoragePrefix}:${userId}`) ?? "[]") as string[]);
  } catch {
    return new Set<string>();
  }
}

function writeNotifiedIds(userId: string, ids: Set<string>) {
  window.localStorage.setItem(`${notifiedStoragePrefix}:${userId}`, JSON.stringify([...ids].slice(-120)));
}

async function showNotice(notice: AppNotification) {
  const options: NotificationOptions = {
    body: notice.body,
    icon: "/icons/nos-icon-192.png",
    badge: "/icons/nos-icon-192.png",
    tag: notice.id,
    data: { url: notice.targetHref ?? "/notifications" },
  };
  const registration = "serviceWorker" in navigator ? await navigator.serviceWorker.ready.catch(() => null) : null;
  if (registration?.showNotification) {
    await registration.showNotification(notice.title, options);
    return;
  }
  new window.Notification(notice.title, options);
}

export function NotificationMonitor() {
  const session = useAppStore((state) => state.session);

  useEffect(() => {
    const currentSession = session ? { id: session.id, role: session.role, employeeId: session.employeeId } : null;
    if (!currentSession || typeof window === "undefined" || !("Notification" in window)) return;
    const activeSession = currentSession;
    let cancelled = false;
    const notifiedIds = readNotifiedIds(activeSession.id);

    async function tick() {
      if (cancelled || window.Notification.permission !== "granted") return;
      const notices = await apiFetch<AppNotification[]>(scopedNotificationsPath(activeSession)).catch(() => []);
      for (const notice of notices) {
        if (cancelled) return;
        if (notice.readAt || notifiedIds.has(notice.id) || !eligibleTypes.has(notice.type)) continue;
        await showNotice(notice).catch(() => undefined);
        notifiedIds.add(notice.id);
      }
      writeNotifiedIds(activeSession.id, notifiedIds);
    }

    const timer = window.setInterval(() => void tick(), 60_000);
    const startup = window.setTimeout(() => void tick(), 4_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.clearTimeout(startup);
    };
  }, [session]);

  return null;
}
