import { NextRequest, NextResponse } from "next/server";
import { getEmployee, getUser } from "@/lib/data/repository";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId") ?? undefined;
  const user = await getUser(userId);
  const employee = await getEmployee(user.employeeId);
  return NextResponse.json({ data: { user, employee } });
}
