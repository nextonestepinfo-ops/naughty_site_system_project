import { NextResponse } from "next/server";
import { loginUser } from "@/lib/data/repository";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const user = loginUser({
    email: body.email,
    password: body.password,
    role: body.role,
    provider: body.provider,
  });
  if (!user) {
    return NextResponse.json({ error: "Login failed" }, { status: 401 });
  }
  return NextResponse.json({ data: user });
}
