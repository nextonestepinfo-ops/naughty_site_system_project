import { NextRequest, NextResponse } from "next/server";
import { getRequestScope } from "@/lib/data/request";
import { deleteWorkReport, saveWorkReport } from "@/lib/data/repository";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const { role, employeeId, userId } = getRequestScope(request);
    const body = await request.json().catch(() => ({}));
    const data = await saveWorkReport({ ...body, id, authorUserId: body.authorUserId ?? userId }, role, employeeId);
    if (!data) return NextResponse.json({ error: { message: "日報が見つかりません。" } }, { status: 404 });
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: { message: error instanceof Error ? error.message : "日報の更新に失敗しました。" } }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const { role, employeeId } = getRequestScope(request);
    const ok = await deleteWorkReport(id, role, employeeId);
    if (!ok) return NextResponse.json({ error: { message: "日報が見つかりません。" } }, { status: 404 });
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    return NextResponse.json({ error: { message: error instanceof Error ? error.message : "日報の削除に失敗しました。" } }, { status: 500 });
  }
}
