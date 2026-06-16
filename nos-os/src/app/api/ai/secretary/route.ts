import { NextResponse } from "next/server";
import { askSecretary } from "@/lib/integrations/secretary";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  const data = await askSecretary({
    message: String(body.message ?? ""),
    context: typeof body.context === "string" ? body.context : undefined,
  });
  return NextResponse.json({ data });
}
