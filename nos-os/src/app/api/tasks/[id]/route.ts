import { NextRequest, NextResponse } from "next/server";
import { deleteTask, updateTask } from "@/lib/data/repository";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const data = await updateTask(id, body);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data });
}

export async function DELETE(_request: NextRequest, context: Context) {
  const { id } = await context.params;
  const ok = await deleteTask(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: { ok: true } });
}
