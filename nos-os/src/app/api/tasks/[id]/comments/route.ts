import { NextRequest, NextResponse } from "next/server";
import { addTaskComment } from "@/lib/data/repository";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  return NextResponse.json(
    { data: await addTaskComment(id, body.authorUserId ?? "user-admin", body.body ?? "") },
    { status: 201 },
  );
}
