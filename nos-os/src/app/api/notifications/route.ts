import { NextRequest, NextResponse } from "next/server";
import { getNotifications } from "@/lib/data/repository";
import { getRequestScope } from "@/lib/data/request";

export function GET(request: NextRequest) {
  const { role, userId } = getRequestScope(request);
  return NextResponse.json({ data: getNotifications(role, userId) });
}

