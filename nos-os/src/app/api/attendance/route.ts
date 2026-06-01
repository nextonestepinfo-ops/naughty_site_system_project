import { NextRequest, NextResponse } from "next/server";
import { getAttendance } from "@/lib/data/repository";
import { getRequestScope } from "@/lib/data/request";

export function GET(request: NextRequest) {
  const { role, employeeId } = getRequestScope(request);
  return NextResponse.json({ data: getAttendance(role, employeeId) });
}

