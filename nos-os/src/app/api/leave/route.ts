import { NextRequest, NextResponse } from "next/server";
import { getAttendance } from "@/lib/data/repository";
import { getRequestScope } from "@/lib/data/request";

export async function GET(request: NextRequest) {
  const { role, employeeId } = getRequestScope(request);
  const data = await getAttendance(role, employeeId);
  return NextResponse.json({ data: data.leaveRequests });
}
