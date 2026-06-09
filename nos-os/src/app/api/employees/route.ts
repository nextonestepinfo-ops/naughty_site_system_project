import { NextRequest, NextResponse } from "next/server";
import { getEmployees } from "@/lib/data/repository";
import { getRequestScope } from "@/lib/data/request";

export async function GET(request: NextRequest) {
  const { role, employeeId } = getRequestScope(request);
  return NextResponse.json({ data: await getEmployees(role, employeeId) });
}
