import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "slate",
}: {
  label: string;
  value: string | number;
  helper?: string;
  icon: LucideIcon;
  tone?: "slate" | "blue" | "green" | "red";
}) {
  const toneClass = {
    slate: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200",
    green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
    red: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-200",
  }[tone];
  const borderClass = {
    slate: "border-l-slate-300 dark:border-l-slate-500",
    blue: "border-l-blue-500",
    green: "border-l-emerald-500",
    red: "border-l-red-500",
  }[tone];

  return (
    <Card className={cn("border-l-4", borderClass)}>
      <CardContent className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold">{value}</p>
          {helper ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{helper}</p> : null}
        </div>
        <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-panel", toneClass)}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
