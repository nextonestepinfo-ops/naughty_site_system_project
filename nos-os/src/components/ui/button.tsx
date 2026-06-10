import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "icon";
};

const variants = {
  primary: "bg-[#0B1226] text-white shadow-sm hover:bg-[#16203B] dark:bg-[#E9EDF4] dark:text-[#050816] dark:ring-1 dark:ring-white/20 dark:hover:bg-white",
  secondary: "bg-[#E08F12] text-white shadow-sm hover:bg-[#C97707] dark:bg-[#F0A93C] dark:text-[#050816] dark:hover:bg-[#F7C878]",
  ghost: "bg-transparent text-foreground hover:bg-slate-100 dark:text-slate-50 dark:hover:bg-white/10 dark:hover:text-white",
  danger: "bg-danger text-white hover:bg-red-600 dark:bg-red-500 dark:text-white dark:hover:bg-red-400",
};

const sizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  icon: "h-11 w-11 shrink-0 p-0",
};

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-panel font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        "spring min-h-11 font-bold ring-offset-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0A93C]/70",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
