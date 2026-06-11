import { NextResponse } from "next/server";
import { loginUser } from "@/lib/data/repository";
import { createSessionCookieValue, sessionCookieName } from "@/lib/data/request";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const user = await loginUser({
    employeeId: body.employeeId,
    email: body.email,
    password: body.password,
    role: body.role,
    provider: body.provider,
  });
  if (!user) {
    return NextResponse.json({ error: "Login failed" }, { status: 401 });
  }
  const response = NextResponse.json({ data: user });
  response.cookies.set(sessionCookieName, createSessionCookieValue(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return response;
}
