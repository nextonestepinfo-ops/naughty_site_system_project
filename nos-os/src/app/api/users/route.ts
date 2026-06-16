import { NextRequest, NextResponse } from "next/server";
import { getUsers } from "@/lib/data/repository";
import { getRequestScope } from "@/lib/data/request";

export async function GET(request: NextRequest) {
  const { role } = getRequestScope(request);
  if (role !== "admin") return NextResponse.json({ error: { message: "Not allowed" } }, { status: 403 });
  return NextResponse.json({ data: await getUsers(role) });
}
