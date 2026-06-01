import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { projectStatusLabels } from "@/lib/data/labels";
import type { Employee, Project } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export function ProjectCard({
  project,
  owner,
}: {
  project: Project;
  owner?: Employee;
}) {
  const overdue = new Date(project.dueDate).getTime() < Date.now() && project.status !== "completed";
  return (
    <Link href={`/projects/${project.id}`} className="block rounded-panel border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="line-clamp-2 font-semibold leading-6">{project.name}</p>
          <p className="mt-1 text-sm text-slate-500">{project.customerName}</p>
        </div>
        <Badge tone={overdue ? "red" : project.status === "completed" ? "green" : "blue"}>{projectStatusLabels[project.status]}</Badge>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-slate-500">納期</p>
          <p className="font-medium">{formatDate(project.dueDate)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">金額</p>
          <p className="font-medium">{formatCurrency(project.budget)}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <span>{owner?.name ?? "未設定"}</span>
        <span>詳細へ</span>
      </div>
    </Link>
  );
}

