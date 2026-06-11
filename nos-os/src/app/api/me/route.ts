import { NextRequest, NextResponse } from "next/server";
import { getEmployee, getUser } from "@/lib/data/repository";
import { getRequestScope } from "@/lib/data/request";

export async function GET(request: NextRequest) {
  const { userId } = getRequestScope(request);
  const user = await getUser(userId);
  const employee = await getEmployee(user.employeeId);
  return NextResponse.json({ data: { user, employee } });
}
