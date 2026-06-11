import { NextRequest, NextResponse } from "next/server";
import { deleteProject, getProjectDetail, updateProject } from "@/lib/data/repository";
import { getRequestScope } from "@/lib/data/request";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  const { id } = await context.params;
  const { role, employeeId } = getRequestScope(request);
  const data = await getProjectDetail(role, id, employeeId);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data });
}

export async function PATCH(request: NextRequest, context: Context) {
  const { id } = await context.params;
  const { role } = getRequestScope(request);
  if (role !== "admin") return NextResponse.json({ error: { message: "Not allowed" } }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const data = await updateProject(id, body);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest, context: Context) {
  const { id } = await context.params;
  const { role } = getRequestScope(request);
  if (role !== "admin") return NextResponse.json({ error: { message: "Not allowed" } }, { status: 403 });
  const ok = await deleteProject(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: { ok: true } });
}
