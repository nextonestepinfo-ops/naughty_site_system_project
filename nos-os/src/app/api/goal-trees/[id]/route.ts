import { NextRequest, NextResponse } from "next/server";
import { deleteGoalTree, updateGoalTree } from "@/lib/data/repository";
import { getRequestScope } from "@/lib/data/request";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const { id } = await context.params;
  const { role, employeeId } = getRequestScope(request);
  const body = await request.json().catch(() => ({}));
  const data = await updateGoalTree(id, body, role, employeeId);
  if (!data) return NextResponse.json({ error: "Not found or not allowed" }, { status: 404 });
  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest, context: Context) {
  const { id } = await context.params;
  const { role, employeeId } = getRequestScope(request);
  const ok = await deleteGoalTree(id, role, employeeId);
  if (!ok) return NextResponse.json({ error: "Not found or not allowed" }, { status: 404 });
  return NextResponse.json({ data: { ok: true } });
}
