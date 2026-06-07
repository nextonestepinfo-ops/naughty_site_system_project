"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { taskPriorityLabels, taskStatusLabels } from "@/lib/data/labels";
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

  return (
    <article className="rounded-panel border border-border bg-card">
      <button
        type="button"
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-3 p-4 text-left"
        onClick={() => setOpen((value) => !value)}
      >
        <div className="min-w-0">
          <p className="line-clamp-2 font-semibold leading-6">{task.title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Badge tone={priorityTone}>{taskPriorityLabels[task.priority]}</Badge>
            <Badge tone={statusTone}>{taskStatusLabels[task.status]}</Badge>
            <span>{formatDate(task.dueDate)}</span>
          </div>
        </div>
        <ChevronDown className={cn("mt-1 h-4 w-4 shrink-0 text-slate-400 transition", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="border-t border-border px-4 py-3">
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{task.description}</p>
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
