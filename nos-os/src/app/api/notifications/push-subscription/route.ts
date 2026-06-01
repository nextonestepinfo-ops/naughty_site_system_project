import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({
    data: {
      ok: true,
      subscriptionPreview: body?.endpoint ? String(body.endpoint).slice(0, 64) : "local-demo",
    },
  });
}

