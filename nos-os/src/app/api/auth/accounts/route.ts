import { NextResponse } from "next/server";
import { getLoginAccounts } from "@/lib/data/repository";

export async function GET() {
  return NextResponse.json({ data: await getLoginAccounts() });
}
