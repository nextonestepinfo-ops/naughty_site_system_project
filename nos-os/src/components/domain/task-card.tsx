"use client";

import { BriefcaseBusiness, ChevronDown, GitBranch } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";
import { AssigneeBadge } from "@/components/domain/assignee-badge";
import { Badge } from "@/components/ui/badge";
import { taskPriorityLabels, taskStatusLabels } from "@/lib/data/labels";
import { displayTaskTitle, isTestTask } from "@/lib/data/task-flags";
import { employeeColorToken } from "@/lib/employee-colors";
import type { Project, Task, Employee } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

export function TaskCard({
  task,
  project,
  assignee,
}: {
  task: Task;
  project?: Project;
  assignee?: Employee;
}) {
  const priorityTone = task.priority === "urgent" ? "red" : task.priority === "high" ? "amber" : task.priority === "normal" ? "blue" : "slate";
  const statusTone = task.status === "done" ? "green" : task.status === "review" ? "amber" : task.status === "in_progress" ? "blue" : "slate";
  const [open, setOpen] = useState(false);
  const sourceGoalTreeTitle = task.sourceGoalTreeTitle?.trim();
  const sourceBranchTitle = task.sourceBranchTitle?.trim();
  const title = displayTaskTitle(task);
  const testTask = isTestTask(task);
  const assigneeColor = employeeColorToken(assignee?.id ?? task.primaryAssigneeId);

  return (
    <article className={cn("rounded-panel border border-l-4 bg-card", testTask ? "border-amber-200 bg-amber-50/40 dark:border-amber-500/30 dark:bg-amber-500/5" : "border-border", assigneeColor.border)}>
      <button
        type="button"
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-3 p-4 text-left"
        onClick={() => setOpen((value) => !value)}
      >
        <div className="min-w-0">
          <p className="line-clamp-2 break-words font-semibold leading-6">{title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            {assignee ? <AssigneeBadge employee={assignee} size="xs" /> : null}
            {testTask ? <Badge tone="amber">テスト</Badge> : null}
            <Badge tone={priorityTone}>{taskPriorityLabels[task.priority]}</Badge>
            <Badge tone={statusTone}>{taskStatusLabels[task.status]}</Badge>
            <span>{formatDate(task.dueDate)}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            {project ? <ContextPill icon={<BriefcaseBusiness className="h-3.5 w-3.5" />} label={`案件: ${project.name}`} /> : null}
            {sourceBranchTitle ? <ContextPill icon={<GitBranch className="h-3.5 w-3.5" />} label={`大タスク: ${sourceBranchTitle}`} tone="blue" /> : null}
          </div>
        </div>
        <ChevronDown className={cn("mt-1 h-4 w-4 shrink-0 text-slate-400 transition", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="border-t border-border px-4 py-3">
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{task.description}</p>
          {project || sourceGoalTreeTitle || sourceBranchTitle ? (
            <div className="mt-3 rounded-panel bg-blue-50 p-3 text-xs leading-5 text-blue-900 dark:bg-blue-500/10 dark:text-blue-100">
              <p className="font-semibold">作業の位置</p>
              <div className="mt-2 grid gap-1">
                {project ? <span>案件: {project.name}</span> : null}
                {sourceGoalTreeTitle ? <span>目標: {sourceGoalTreeTitle}</span> : null}
                <span>大タスク: {sourceBranchTitle ?? "未設定"}</span>
                <span>小タスク: {title}</span>
              </div>
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{task.estimatedMinutes}分</span>
            {project ? (
              <Link href={`/projects/${project.id}`} className="font-medium text-accent">
                {project.name}
              </Link>
            ) : null}
            {assignee ? <span>{assignee.name}</span> : null}
            <span className="ml-auto font-semibold text-primary dark:text-white">AI {task.aiPriorityScore}</span>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function ContextPill({ icon, label, tone = "slate" }: { icon: ReactNode; label: string; tone?: "slate" | "blue" }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-0 max-w-full items-center gap-1 rounded-full px-2 py-1",
        tone === "blue" ? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-100" : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-200",
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </span>
  );
}
