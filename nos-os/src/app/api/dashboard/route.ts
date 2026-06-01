import { NextRequest, NextResponse } from "next/server";
import { getDashboard } from "@/lib/data/repository";
import { getRequestScope } from "@/lib/data/request";

export function GET(request: NextRequest) {
  const { role, employeeId, userId } = getRequestScope(request);
  return NextResponse.json({ data: getDashboard(role, employeeId, userId) });
}

