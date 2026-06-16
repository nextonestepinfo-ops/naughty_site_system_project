"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type ThemeChoice = {
  value: "light" | "dark" | "system";
  label: string;
  shortLabel: string;
  icon: LucideIcon;
};

const choices: ThemeChoice[] = [
  { value: "light", label: "ライト", shortLabel: "明", icon: Sun },
  { value: "dark", label: "ダーク", shortLabel: "暗", icon: Moon },
  { value: "system", label: "端末に合わせる", shortLabel: "自動", icon: Monitor },
];

export function ThemeModeControl({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme = mounted ? theme ?? resolvedTheme ?? "light" : "light";

  return (
    <div
      className={cn(
        "inline-grid grid-cols-3 rounded-full border border-border bg-slate-100 p-1 text-xs font-extrabold text-slate-600 shadow-inner dark:border-white/10 dark:bg-white/10 dark:text-slate-200",
        compact ? "min-h-[52px] min-w-[140px]" : "w-full gap-1 sm:w-auto",
        className,
      )}
      role="radiogroup"
      aria-label="表示モード"
    >
      {choices.map((choice) => {
        const Icon = choice.icon;
        const active = activeTheme === choice.value;
        return (
          <button
            key={choice.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`表示モード: ${choice.label}`}
            title={choice.label}
            onClick={() => setTheme(choice.value)}
            className={cn(
              "spring inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-2 transition",
              active
                ? "bg-white text-[#0B1226] shadow-soft dark:bg-[#F4F6FA] dark:text-[#050816]"
                : "text-slate-600 hover:bg-white/70 hover:text-[#0B1226] dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white",
              compact ? "px-0" : "min-w-[92px] px-3",
            )}
          >
            <Icon className="h-4 w-4" />
            <span className={cn(compact ? "sr-only" : "hidden sm:inline")}>{choice.label}</span>
            <span className={cn(compact ? "sr-only" : "sm:hidden")}>{choice.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
