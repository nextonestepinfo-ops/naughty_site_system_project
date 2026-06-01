import { NextRequest, NextResponse } from "next/server";
import { createTask, getTasks } from "@/lib/data/repository";
import { getRequestScope } from "@/lib/data/request";
import type { TaskFilter } from "@/lib/types";

export function GET(request: NextRequest) {
  const { role, employeeId } = getRequestScope(request);
  const params = request.nextUrl.searchParams;
  const filters: TaskFilter = {
    assigneeId: params.get("assigneeId") ?? undefined,
    projectId: params.get("projectId") ?? undefined,
    priority: (params.get("priority") as TaskFilter["priority"]) ?? undefined,
    status: (params.get("status") as TaskFilter["status"]) ?? undefined,
    due: (params.get("due") as TaskFilter["due"]) ?? undefined,
    sort: (params.get("sort") as TaskFilter["sort"]) ?? "dueDate",
  };
  return NextResponse.json({ data: getTasks(role, employeeId, filters) });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({ data: createTask(body) }, { status: 201 });
}

