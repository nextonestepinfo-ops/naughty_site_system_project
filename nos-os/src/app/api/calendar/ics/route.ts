import { NextRequest, NextResponse } from "next/server";
import { getCalendarIcs } from "@/lib/data/repository";
import { getRequestScope } from "@/lib/data/request";

export async function GET(request: NextRequest) {
  const { role, employeeId } = getRequestScope(request);
  return new NextResponse(await getCalendarIcs(role, employeeId), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "attachment; filename=nos-os-today.ics",
    },
  });
}
