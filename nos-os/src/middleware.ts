import { NextRequest, NextResponse } from "next/server";

const cookieName = "nos_os_session";
const publicApiPrefixes = ["/api/auth/accounts", "/api/auth/login", "/api/auth/logout", "/api/health", "/api/cron/notifications"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    !pathname.startsWith("/api/") ||
    publicApiPrefixes.some((prefix) => pathname.startsWith(prefix)) ||
    /^\/api\/users\/[^/]+\/password\/reset$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(cookieName)?.value;
  if (!(await verifyCookie(cookie))) {
    return NextResponse.json({ error: { message: "ログインが必要です。" } }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};

async function verifyCookie(value?: string) {
  if (!value) return false;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return false;
  const expected = await sign(payload);
  if (signature !== expected) return false;

  try {
    const parsed = JSON.parse(base64UrlDecode(payload)) as { exp?: number };
    return typeof parsed.exp === "number" && parsed.exp >= Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

async function sign(payload: string) {
  const secret = process.env.NOS_OS_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.URATA_LOGIN_PASSWORD || "nos-os-dev-session-secret";
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return base64UrlEncode(new Uint8Array(digest));
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`.replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(
    Array.from(atob(padded))
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
      .join(""),
  );
}
