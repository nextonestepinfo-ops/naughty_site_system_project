import { NextRequest, NextResponse } from "next/server";
import { getNotifications, markNotificationRead } from "@/lib/data/repository";
import { getRequestScope } from "@/lib/data/request";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const { id } = await context.params;
  const { role, userId, employeeId } = getRequestScope(request);
  const visible = (await getNotifications(role, userId, employeeId)).some((notice) => notice.id === id);
  if (!visible) return NextResponse.json({ error: { message: "Not found or not allowed" } }, { status: 404 });
  const data = await markNotificationRead(id);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data });
}
