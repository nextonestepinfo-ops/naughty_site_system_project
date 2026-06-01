import { NextRequest, NextResponse } from "next/server";
import { clockAttendance } from "@/lib/data/repository";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (!body.employeeId || !body.eventType) {
    return NextResponse.json({ error: "employeeId and eventType are required" }, { status: 400 });
  }
  return NextResponse.json({ data: clockAttendance(body.employeeId, body.eventType, body.source ?? "manual") }, { status: 201 });
}

