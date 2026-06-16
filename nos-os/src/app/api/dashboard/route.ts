import { NextRequest, NextResponse } from "next/server";
import { getDashboard } from "@/lib/data/repository";
import { getRequestScope } from "@/lib/data/request";

export async function GET(request: NextRequest) {
  const { role, employeeId, userId } = getRequestScope(request);
  return NextResponse.json({ data: await getDashboard(role, employeeId, userId) });
}
