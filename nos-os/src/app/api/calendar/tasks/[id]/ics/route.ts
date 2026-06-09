import { NextRequest, NextResponse } from "next/server";
import { getTasks } from "@/lib/data/repository";
import { getRequestScope } from "@/lib/data/request";

type Context = { params: Promise<{ id: string }> };

function icsDateTime(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function icsAllDay(value: string) {
  return new Date(value).toISOString().slice(0, 10).replace(/-/g, "");
}

function addDays(value: string, days: number) {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export async function GET(request: NextRequest, context: Context) {
  const { id } = await context.params;
  const { role, employeeId } = getRequestScope(request);
  const task = (await getTasks(role, employeeId)).find((item) => item.id === id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date().toISOString();
  const hasSchedule = Boolean(task.scheduledStart && task.scheduledEnd);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nos Technology//Nos OS Task//JA",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${task.id}@nos-os.local`,
    `DTSTAMP:${icsDateTime(now)}`,
    hasSchedule ? `DTSTART:${icsDateTime(task.scheduledStart ?? task.dueDate)}` : `DTSTART;VALUE=DATE:${icsAllDay(task.dueDate)}`,
    hasSchedule ? `DTEND:${icsDateTime(task.scheduledEnd ?? task.dueDate)}` : `DTEND;VALUE=DATE:${icsAllDay(addDays(task.dueDate, 1))}`,
    `SUMMARY:${escapeIcs(task.title)}`,
    `DESCRIPTION:${escapeIcs([task.description, task.sourceBranchTitle ? `大タスク: ${task.sourceBranchTitle}` : "", `状態: ${task.status}`].filter(Boolean).join("\\n"))}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return new NextResponse(`${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename=nos-os-task-${task.id}.ics`,
    },
  });
}
