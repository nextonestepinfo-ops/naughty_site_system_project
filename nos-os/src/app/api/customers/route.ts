import { NextResponse } from "next/server";
import { getCustomers } from "@/lib/data/repository";

export async function GET() {
  return NextResponse.json({ data: await getCustomers() });
}
