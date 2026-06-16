import { NextRequest, NextResponse } from "next/server";
import { clockAttendance } from "@/lib/data/repository";
import { getRequestScope } from "@/lib/data/request";

export async function POST(request: NextRequest) {
  const { role, employeeId: sessionEmployeeId } = getRequestScope(request);
  const body = await request.json().catch(() => ({}));
  const targetEmployeeId = String(body.employeeId || sessionEmployeeId || "");
  if (!targetEmployeeId || !body.eventType) {
    return NextResponse.json({ error: "employeeId and eventType are required" }, { status: 400 });
  }
  if (role !== "admin" && targetEmployeeId !== sessionEmployeeId) {
    return NextResponse.json({ error: { message: "本人以外の打刻はできません。" } }, { status: 403 });
  }
  return NextResponse.json({ data: await clockAttendance(targetEmployeeId, body.eventType, body.source ?? "manual") }, { status: 201 });
}
