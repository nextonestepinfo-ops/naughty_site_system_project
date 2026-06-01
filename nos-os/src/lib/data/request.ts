import type { NextRequest } from "next/server";
import type { Role } from "@/lib/types";

export function getRequestScope(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const rawRole = params.get("role");
  const role: Role = rawRole === "admin" || rawRole === "sales" || rawRole === "part_time" ? rawRole : "employee";
  const employeeId = params.get("employeeId") ?? undefined;
  const userId = params.get("userId") ?? undefined;
  return { role, employeeId, userId };
}
