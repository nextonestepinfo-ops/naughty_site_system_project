import { NextRequest, NextResponse } from "next/server";
import { getEmployeeProfile } from "@/lib/data/repository";
import { getRequestScope } from "@/lib/data/request";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  const { id } = await context.params;
  const { role, employeeId } = getRequestScope(request);
  const data = getEmployeeProfile(role, id, employeeId);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data });
}

