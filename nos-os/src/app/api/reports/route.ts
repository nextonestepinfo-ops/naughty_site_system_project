import { NextRequest, NextResponse } from "next/server";
import { getRequestScope } from "@/lib/data/request";
import { getWorkReports, saveWorkReport } from "@/lib/data/repository";
import type { WorkReportPeriod } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { role, employeeId } = getRequestScope(request);
    const params = request.nextUrl.searchParams;
    const period = params.get("period") as WorkReportPeriod | null;
    const targetEmployeeId = params.get("targetEmployeeId") ?? undefined;
    const reports = await getWorkReports(role, employeeId, {
      period: period === "weekly" || period === "daily" ? period : undefined,
      targetEmployeeId,
    });
    return NextResponse.json({ data: reports });
  } catch (error) {
    return NextResponse.json({ error: { message: error instanceof Error ? error.message : "日報の取得に失敗しました。" } }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { role, employeeId, userId } = getRequestScope(request);
    const body = await request.json().catch(() => ({}));
    const data = await saveWorkReport({ ...body, authorUserId: body.authorUserId ?? userId }, role, employeeId);
    if (!data) return NextResponse.json({ error: { message: "保存できる日報が見つかりません。" } }, { status: 404 });
    return NextResponse.json({ data }, { status: body.id ? 200 : 201 });
  } catch (error) {
    return NextResponse.json({ error: { message: error instanceof Error ? error.message : "日報の保存に失敗しました。" } }, { status: 500 });
  }
}
