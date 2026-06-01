import { NextRequest, NextResponse } from "next/server";
import { createProject, getProjects } from "@/lib/data/repository";
import { getRequestScope } from "@/lib/data/request";

export function GET(request: NextRequest) {
  const { role, employeeId } = getRequestScope(request);
  return NextResponse.json({ data: getProjects(role, employeeId) });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({ data: createProject(body) }, { status: 201 });
}

