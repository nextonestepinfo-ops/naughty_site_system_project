import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { resetUserPassword } from "@/lib/data/repository";

type Context = { params: Promise<{ id: string }> };

function authorized(request: NextRequest) {
  const expected = process.env.NOS_OS_ADMIN_RESET_TOKEN;
  const actual = request.headers.get("x-nos-os-admin-reset-token") ?? "";
  if (!expected || !actual || expected.length !== actual.length) return false;
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

function error(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function POST(request: NextRequest, context: Context) {
  if (!authorized(request)) return error("Unauthorized", 401);

  const body = await request.json().catch(() => ({}));
  if (body.actorRole !== "admin") return error("Admin role is required", 403);

  const { id } = await context.params;
  const user = await resetUserPassword(id, body.password);
  if (!user) return error("User not found or password is invalid", 404);

  return NextResponse.json({
    data: {
      user,
      mustChangePassword: true,
    },
  });
}
