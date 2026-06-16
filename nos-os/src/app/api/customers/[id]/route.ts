import { NextRequest, NextResponse } from "next/server";
import { updateCustomer } from "@/lib/data/repository";
import { getRequestScope } from "@/lib/data/request";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const { id } = await context.params;
  const { role } = getRequestScope(request);
  if (role !== "admin") return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const data = await updateCustomer(id, body);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data });
}
