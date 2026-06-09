import { NextRequest, NextResponse } from "next/server";
import { getRequestScope } from "@/lib/data/request";
import { isSupabaseDataMode, stableUuid, upsertRows } from "@/lib/data/supabase-rest";
import { getVapidPublicKey, isWebPushConfigured, type PushSubscriptionPayload } from "@/lib/notifications/web-push";

type PushSubscriptionRow = {
  id: string;
  user_id: string | null;
  employee_id: string | null;
  endpoint: string;
  subscription: PushSubscriptionPayload;
  user_agent: string | null;
  delivered_notice_ids: string[];
  created_at?: string;
  updated_at?: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function uuidOrNull(value?: string) {
  return value && uuidPattern.test(value) ? value : null;
}

export async function GET() {
  const publicKey = getVapidPublicKey();
  return NextResponse.json({
    data: {
      enabled: isWebPushConfigured(),
      publicKey,
      needsVapidKeys: !isWebPushConfigured(),
    },
  });
}

export async function POST(request: NextRequest) {
  const { userId, employeeId } = getRequestScope(request);
  const body = await request.json().catch(() => ({}));
  const subscription = (body.subscription ?? body) as Partial<PushSubscriptionPayload>;
  const endpoint = typeof subscription.endpoint === "string" ? subscription.endpoint : "";

  if (!endpoint) {
    return NextResponse.json({
      data: {
        ok: true,
        stored: false,
        enabled: isWebPushConfigured(),
        reason: "notification_permission_recorded_without_push_subscription",
      },
    });
  }

  if (!isSupabaseDataMode()) {
    return NextResponse.json({
      data: {
        ok: true,
        stored: false,
        enabled: isWebPushConfigured(),
        subscriptionPreview: endpoint.slice(0, 64),
        reason: "mock_mode_does_not_persist_push_subscriptions",
      },
    });
  }

  try {
    await upsertRows<PushSubscriptionRow>(
      "push_subscriptions",
      [
        {
          id: stableUuid(`push-subscription:${endpoint}`),
          user_id: uuidOrNull(userId),
          employee_id: uuidOrNull(employeeId),
          endpoint,
          subscription: subscription as PushSubscriptionPayload,
          user_agent: request.headers.get("user-agent"),
          delivered_notice_ids: [],
          updated_at: new Date().toISOString(),
        },
      ],
      "endpoint",
    );

    return NextResponse.json({
      data: {
        ok: true,
        stored: true,
        enabled: isWebPushConfigured(),
        subscriptionPreview: endpoint.slice(0, 64),
      },
    });
  } catch (error) {
    return NextResponse.json({
      data: {
        ok: true,
        stored: false,
        enabled: isWebPushConfigured(),
        subscriptionPreview: endpoint.slice(0, 64),
        reason: error instanceof Error ? error.message : "push_subscription_storage_failed",
      },
    });
  }
}
