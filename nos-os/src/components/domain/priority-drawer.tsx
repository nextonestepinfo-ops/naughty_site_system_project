import { ChevronDown } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type DrawerTone = "gold" | "red" | "green" | "blue" | "slate" | "iris";

const tones: Record<DrawerTone, { border: string; badge: string; text: string }> = {
  gold: {
    border: "border-l-[#E08F12]",
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-400/15 dark:text-amber-100",
    text: "text-[#E08F12] dark:text-amber-200",
  },
  red: {
    border: "border-l-red-500",
    badge: "bg-red-50 text-red-700 dark:bg-red-400/20 dark:text-red-100",
    text: "text-red-600 dark:text-red-200",
  },
  green: {
    border: "border-l-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-100",
    text: "text-emerald-600 dark:text-emerald-200",
  },
  blue: {
    border: "border-l-sky-500",
    badge: "bg-sky-50 text-sky-700 dark:bg-sky-400/15 dark:text-sky-100",
    text: "text-sky-600 dark:text-sky-200",
  },
  slate: {
    border: "border-l-slate-300 dark:border-l-slate-500",
    badge: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-100",
    text: "text-slate-500 dark:text-slate-200",
  },
  iris: {
    border: "border-l-indigo-500",
    badge: "bg-indigo-50 text-indigo-700 dark:bg-indigo-400/20 dark:text-indigo-100",
    text: "text-indigo-600 dark:text-indigo-200",
  },
};

export function PriorityDrawer({
  priority,
  title,
  count,
  summary,
  open,
  onToggle,
  children,
  tone = "slate",
  href,
  desktopOpen = false,
  className,
}: {
  priority: "P1" | "P2" | "P3";
  title: string;
  count: string | number;
  summary: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  tone?: DrawerTone;
  href?: string;
  desktopOpen?: boolean;
  className?: string;
}) {
  const color = tones[tone];

  return (
    <section className={cn("overflow-hidden rounded-panel border border-white/80 bg-card text-foreground shadow-soft dark:border-[#26324D] dark:bg-card dark:text-slate-50 dark:shadow-none", "border-l-4", color.border, className)}>
      <div className="flex items-center justify-between gap-3 p-4">
        <button type="button" className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left" aria-expanded={open} onClick={onToggle}>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className={cn("inline-flex min-h-6 items-center rounded-full px-2.5 py-1 text-[11px] font-extrabold leading-none", color.badge)}>{priority}</span>
              <span className="text-sm font-extrabold text-[#0B1226] dark:text-white">{title}</span>
              <span className={cn("text-xs font-extrabold", color.text)}>{count}</span>
            </span>
            <span className="mt-1 block truncate text-xs font-semibold text-slate-500 dark:text-slate-300">{summary}</span>
          </span>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-100">
            <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
          </span>
        </button>
        {href ? (
          <Link href={href} className="hidden min-h-9 shrink-0 items-center rounded-full bg-slate-100 px-3 text-xs font-extrabold text-[#0B1226] dark:bg-white/10 dark:text-white sm:inline-flex">
            すべて
          </Link>
        ) : null}
      </div>
      <div className={cn("border-t border-border/70 p-4 dark:border-[#26324D]", open ? "block" : "hidden", desktopOpen && "lg:block")}>{children}</div>
    </section>
  );
}
