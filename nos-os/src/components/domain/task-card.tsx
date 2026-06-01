import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { taskPriorityLabels, taskStatusLabels } from "@/lib/data/labels";
import type { Project, Task, Employee } from "@/lib/types";
import { formatDate } from "@/lib/utils";

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

  return (
    <div className="rounded-panel border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="line-clamp-2 font-semibold leading-6">{task.title}</p>
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">{task.description}</p>
        </div>
        <Badge tone={priorityTone}>{taskPriorityLabels[task.priority]}</Badge>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Badge tone={statusTone}>{taskStatusLabels[task.status]}</Badge>
        <span>{formatDate(task.dueDate)}</span>
        <span>{task.estimatedMinutes}分</span>
        {project ? <Link href={`/projects/${project.id}`} className="font-medium text-accent">{project.name}</Link> : null}
        {assignee ? <span>{assignee.name}</span> : null}
        <span className="ml-auto font-semibold text-primary dark:text-white">AI {task.aiPriorityScore}</span>
      </div>
    </div>
  );
}
