import { NextRequest, NextResponse } from "next/server";
import { getUsers } from "@/lib/data/repository";
import { getRequestScope } from "@/lib/data/request";

export function GET(request: NextRequest) {
  const { role } = getRequestScope(request);
  return NextResponse.json({ data: getUsers(role) });
}

