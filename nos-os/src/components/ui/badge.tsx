import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "slate" | "blue" | "green" | "red" | "amber";
};

const tones = {
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  blue: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200",
  green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
  red: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-200",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200",
};

export function Badge({ className, tone = "slate", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-full px-2.5 py-1 text-xs font-medium leading-none",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
