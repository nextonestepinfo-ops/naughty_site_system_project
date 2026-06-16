import { NextRequest, NextResponse } from "next/server";
import { deleteTask, getTasks, updateTask } from "@/lib/data/repository";
import { getRequestScope } from "@/lib/data/request";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const { id } = await context.params;
  const { role, employeeId } = getRequestScope(request);
  const current = (await getTasks(role, employeeId)).find((task) => task.id === id);
  if (!current) return NextResponse.json({ error: { message: "Not found or not allowed" } }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const safeBody =
    role === "admin"
      ? body
      : {
          ...body,
          primaryAssigneeId: current.primaryAssigneeId,
          assigneeIds: current.assigneeIds,
          projectId: current.projectId,
        };
  const data = await updateTask(id, safeBody);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest, context: Context) {
  const { id } = await context.params;
  const { role, employeeId } = getRequestScope(request);
  const current = (await getTasks(role, employeeId)).find((task) => task.id === id);
  if (!current) return NextResponse.json({ error: { message: "Not found or not allowed" } }, { status: 404 });
  const ok = await deleteTask(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: { ok: true } });
}
