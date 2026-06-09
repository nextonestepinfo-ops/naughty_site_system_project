import webpush, { type PushSubscription } from "web-push";

export type PushSubscriptionPayload = PushSubscription & {
  expirationTime?: number | null;
};

export function getVapidPublicKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || "";
}

export function isWebPushConfigured() {
  return Boolean(getVapidPublicKey() && process.env.VAPID_PRIVATE_KEY);
}

export function configureWebPush() {
  const publicKey = getVapidPublicKey();
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@nos-tech.com", publicKey, privateKey);
  return true;
}

export async function sendWebPush(subscription: PushSubscriptionPayload, payload: unknown) {
  if (!configureWebPush()) return { ok: false, reason: "web_push_not_configured" };
  await webpush.sendNotification(subscription, JSON.stringify(payload));
  return { ok: true };
}
