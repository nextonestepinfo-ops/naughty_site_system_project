import { NextRequest, NextResponse } from "next/server";
import { addTaskComment, getTasks } from "@/lib/data/repository";
import { getRequestScope } from "@/lib/data/request";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  const { id } = await context.params;
  const { role, employeeId, userId } = getRequestScope(request);
  const visible = (await getTasks(role, employeeId)).some((task) => task.id === id);
  if (!visible) return NextResponse.json({ error: { message: "Not found or not allowed" } }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  return NextResponse.json(
    { data: await addTaskComment(id, userId, body.body ?? "") },
    { status: 201 },
  );
}
