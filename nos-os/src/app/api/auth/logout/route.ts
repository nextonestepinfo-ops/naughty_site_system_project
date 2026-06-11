import { NextResponse } from "next/server";
import { sessionCookieName } from "@/lib/data/request";

export async function POST() {
  const response = NextResponse.json({ data: { ok: true } });
  response.cookies.set(sessionCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
