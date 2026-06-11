import type { NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import type { Role } from "@/lib/types";

export const sessionCookieName = "nos_os_session";

type SignedSession = {
  userId: string;
  employeeId: string;
  role: Role;
  name: string;
  exp: number;
};

export class UnauthorizedRequestError extends Error {
  constructor(message = "ログインが必要です。") {
    super(message);
    this.name = "UnauthorizedRequestError";
  }
}

function sessionSecret() {
  return process.env.NOS_OS_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.URATA_LOGIN_PASSWORD || "nos-os-dev-session-secret";
}

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function sign(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createSessionCookieValue(input: { id: string; employeeId: string; role: Role; name: string }) {
  const payload = base64Url(
    JSON.stringify({
      userId: input.id,
      employeeId: input.employeeId,
      role: input.role,
      name: input.name,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 14,
    } satisfies SignedSession),
  );
  return `${payload}.${sign(payload)}`;
}

export function readSessionCookie(value?: string) {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature || !safeEqual(sign(payload), signature)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SignedSession;
    if (!parsed.userId || !parsed.employeeId || !parsed.role || parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getRequestScope(request: NextRequest) {
  const session = readSessionCookie(request.cookies.get(sessionCookieName)?.value);
  if (!session) throw new UnauthorizedRequestError();
  return { role: session.role, employeeId: session.employeeId, userId: session.userId, name: session.name };
}

export function isUnauthorizedRequest(error: unknown) {
  return error instanceof UnauthorizedRequestError;
}
