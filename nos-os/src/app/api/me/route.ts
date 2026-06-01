import { NextRequest, NextResponse } from "next/server";
import { getEmployee, getUser } from "@/lib/data/repository";

export function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId") ?? undefined;
  const user = getUser(userId);
  const employee = getEmployee(user.employeeId);
  return NextResponse.json({ data: { user, employee } });
}

