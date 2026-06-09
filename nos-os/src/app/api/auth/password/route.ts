import { NextResponse } from "next/server";
import { changePassword } from "@/lib/data/repository";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const user = await changePassword({
    userId: body.userId,
    currentPassword: body.currentPassword,
    newPassword: body.newPassword,
  });

  if (!user) {
    return NextResponse.json({ error: "Password change failed" }, { status: 400 });
  }

  return NextResponse.json({ data: user });
}
