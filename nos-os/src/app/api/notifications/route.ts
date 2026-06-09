import { NextRequest, NextResponse } from "next/server";
import { getNotifications } from "@/lib/data/repository";
import { getRequestScope } from "@/lib/data/request";

export async function GET(request: NextRequest) {
  const { role, userId, employeeId } = getRequestScope(request);
  return NextResponse.json({ data: await getNotifications(role, userId, employeeId) });
}
