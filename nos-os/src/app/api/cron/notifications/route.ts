import { NextRequest, NextResponse } from "next/server";
import { deleteRows, patchRows, selectRows } from "@/lib/data/supabase-rest";
import { getNotifications } from "@/lib/data/repository";
import { isWebPushConfigured, sendWebPush, type PushSubscriptionPayload } from "@/lib/notifications/web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PushSubscriptionRow = {
  id: string;
  user_id: string | null;
  endpoint: string;
  subscription: PushSubscriptionPayload;
  delivered_notice_ids: unknown;
};

const pushTypes = new Set(["due_today", "due_tomorrow", "overdue", "admin"]);

function deliveredIds(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function authorized(request: NextRequest) {
  const secret = process.env.NOS_OS_CRON_SECRET;
  if (!secret) return true;
  return request.nextUrl.searchParams.get("secret") === secret || request.headers.get("x-nos-os-cron-secret") === secret;
}

function isExpiredPushError(error: unknown) {
  const statusCode = typeof error === "object" && error !== null && "statusCode" in error ? Number((error as { statusCode?: number }).statusCode) : 0;
  return statusCode === 404 || statusCode === 410;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isWebPushConfigured()) {
    return NextResponse.json({ data: { enabled: false, sent: 0, subscriptions: 0, reason: "web_push_not_configured" } });
  }

  const notices = (await getNotifications("admin")).filter((notice) => !notice.readAt && pushTypes.has(notice.type));
  const subscriptions = await selectRows<PushSubscriptionRow>("push_subscriptions", { order: "created_at.asc" }).catch(() => []);
  let sent = 0;
  let removed = 0;

  for (const subscription of subscriptions) {
    const alreadyDelivered = new Set(deliveredIds(subscription.delivered_notice_ids));
    const targets = notices.filter((notice) => notice.userId === subscription.user_id && !alreadyDelivered.has(notice.id)).slice(0, 3);
    if (!targets.length) continue;

    const delivered = new Set(alreadyDelivered);
    for (const notice of targets) {
      try {
        await sendWebPush(subscription.subscription, {
          id: notice.id,
          tag: notice.id,
          title: notice.title,
          body: notice.body,
          url: notice.targetHref ?? "/notifications",
          targetHref: notice.targetHref,
        });
        delivered.add(notice.id);
        sent += 1;
      } catch (error) {
        if (isExpiredPushError(error)) {
          await deleteRows<PushSubscriptionRow>("push_subscriptions", { id: `eq.${subscription.id}` });
          removed += 1;
        }
        break;
      }
    }

    if (delivered.size !== alreadyDelivered.size) {
      await patchRows<PushSubscriptionRow>(
        "push_subscriptions",
        { id: `eq.${subscription.id}` },
        { delivered_notice_ids: [...delivered].slice(-120), last_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      );
    }
  }

  return NextResponse.json({ data: { enabled: true, sent, removed, subscriptions: subscriptions.length, notices: notices.length } });
}
