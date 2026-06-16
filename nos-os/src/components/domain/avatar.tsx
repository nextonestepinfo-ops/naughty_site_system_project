import { cn, initials } from "@/lib/utils";

export function Avatar({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-panel bg-slate-900 text-xs font-bold text-white dark:bg-white dark:text-slate-950", className)}>
      {label.length <= 3 ? label : initials(label)}
    </div>
  );
}

