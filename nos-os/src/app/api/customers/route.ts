import { NextResponse } from "next/server";
import { getCustomers } from "@/lib/data/repository";

export function GET() {
  return NextResponse.json({ data: getCustomers() });
}

