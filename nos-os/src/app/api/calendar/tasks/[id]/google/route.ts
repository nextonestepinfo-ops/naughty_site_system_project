import { NextRequest, NextResponse } from "next/server";
import { getTasks } from "@/lib/data/repository";
import { getRequestScope } from "@/lib/data/request";

type Context = { params: Promise<{ id: string }> };

function googleDateTime(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function googleAllDay(value: string) {
  return new Date(value).toISOString().slice(0, 10).replace(/-/g, "");
}

function addDays(value: string, days: number) {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export async function GET(request: NextRequest, context: Context) {
  const { id } = await context.params;
  const { role, employeeId } = getRequestScope(request);
  const task = (await getTasks(role, employeeId)).find((item) => item.id === id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const hasSchedule = Boolean(task.scheduledStart && task.scheduledEnd);
  const dates = hasSchedule
    ? `${googleDateTime(task.scheduledStart ?? task.dueDate)}/${googleDateTime(task.scheduledEnd ?? task.dueDate)}`
    : `${googleAllDay(task.dueDate)}/${googleAllDay(addDays(task.dueDate, 1))}`;
  const details = [
    task.description,
    task.sourceGoalTreeTitle ? `目標: ${task.sourceGoalTreeTitle}` : "",
    task.sourceBranchTitle ? `大タスク: ${task.sourceBranchTitle}` : "",
    `状態: ${task.status}`,
    "Nos OSから追加",
  ]
    .filter(Boolean)
    .join("\n");

  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", task.title);
  url.searchParams.set("dates", dates);
  url.searchParams.set("details", details);
  url.searchParams.set("ctz", "Asia/Tokyo");

  return NextResponse.redirect(url);
}
