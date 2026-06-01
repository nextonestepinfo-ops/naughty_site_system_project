import { NextRequest, NextResponse } from "next/server";
import { getAttendance } from "@/lib/data/repository";
import { getRequestScope } from "@/lib/data/request";

export function GET(request: NextRequest) {
  const { role, employeeId } = getRequestScope(request);
  const data = getAttendance(role, employeeId);
  return NextResponse.json({ data: data.leaveRequests });
}

