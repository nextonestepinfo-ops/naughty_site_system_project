import { NextRequest, NextResponse } from "next/server";
import { createGoalTree, getGoalTrees } from "@/lib/data/repository";
import { getRequestScope } from "@/lib/data/request";

export function GET(request: NextRequest) {
  const { role, employeeId } = getRequestScope(request);
  return NextResponse.json({ data: getGoalTrees(role, employeeId) });
}

export async function POST(request: NextRequest) {
  const { role, employeeId } = getRequestScope(request);
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({ data: createGoalTree(body, role, employeeId) }, { status: 201 });
}
