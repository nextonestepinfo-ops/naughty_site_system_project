import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    data: {
      ok: true,
      mode: "phase1-placeholder",
      message: "Google Sheets credentials are not configured yet. Attendance sync adapter is ready for Phase2 wiring.",
    },
  });
}

