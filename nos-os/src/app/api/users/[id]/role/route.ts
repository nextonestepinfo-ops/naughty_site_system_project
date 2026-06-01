import { NextRequest, NextResponse } from "next/server";
import { updateUserRole } from "@/lib/data/repository";
import type { EmploymentType, Role } from "@/lib/types";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  if (body.actorRole !== "admin") {
    return NextResponse.json({ error: "Admin role is required" }, { status: 403 });
  }
  const data = updateUserRole(id, {
    role: body.role as Role,
    employmentType: body.employmentType as EmploymentType,
  });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data });
}
