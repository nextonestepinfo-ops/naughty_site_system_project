import type { Task } from "@/lib/types";

const seededTestTaskIds = new Set([
  "f33002d1-4c3a-5e6a-a053-4cf6f4e1b6ce",
  "3fbf6ddc-c89e-52d9-873b-d19efcb70123",
  "6f3edf32-5067-59bb-8fd3-6d165fa180f8",
  "808ea268-10d3-58c2-8ff2-b3c6558daf8a",
  "37d8297a-3a86-582f-b364-1943049f2d00",
  "2182d3ab-4a93-5198-8b9e-dfe1be5ff2d1",
  "8c39a87c-fe22-58c7-9a27-184860fcef62",
  "60336217-e420-5e4c-8097-90e699904374",
  "task-urata-reply",
  "task-sales-list",
  "task-revenue-sheet",
  "task-web-demo-talk",
  "task-outsourcing-copy",
  "task-tools-hearing",
  "task-poc-steps",
  "task-followup-template",
  "task-weekly-assignments",
  "task-sheets-attendance",
  "task-demo-screens",
]);

const testPrefixes = ["【テスト】", "[テスト]", "テスト:"] as const;

export function isTestTask(task: Pick<Task, "id" | "title">) {
  return seededTestTaskIds.has(task.id) || testPrefixes.some((prefix) => task.title.startsWith(prefix)) || task.title.includes("テスト");
}

export function displayTaskTitle(task: Pick<Task, "id" | "title">) {
  if (!isTestTask(task)) return task.title;
  return task.title.startsWith("【テスト】") ? task.title : `【テスト】${task.title}`;
}
