import { NextResponse } from "next/server";
import { askSecretaryWithClaude } from "@/lib/integrations/claude";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const data = await askSecretaryWithClaude({
    message: String(body.message ?? ""),
    context: typeof body.context === "string" ? body.context : undefined,
  });
  return NextResponse.json({ data });
}

