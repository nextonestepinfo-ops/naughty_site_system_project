import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { changePassword } from "@/lib/data/repository";
import { getRequestScope } from "@/lib/data/request";

export async function POST(request: NextRequest) {
  const { userId } = getRequestScope(request);
  const body = await request.json().catch(() => ({}));
  const user = await changePassword({
    userId,
    currentPassword: body.currentPassword,
    newPassword: body.newPassword,
  });

  if (!user) {
    return NextResponse.json({ error: "Password change failed" }, { status: 400 });
  }

  return NextResponse.json({ data: user });
}
