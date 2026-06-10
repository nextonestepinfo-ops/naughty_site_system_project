import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "icon";
};

const variants = {
  primary: "bg-[#0B1226] text-white shadow-sm hover:bg-[#16203B] dark:bg-[#111C38] dark:text-white dark:ring-1 dark:ring-white/10 dark:hover:bg-[#1D2A4F]",
  secondary: "bg-[#E08F12] text-white shadow-sm hover:bg-[#C97707]",
  ghost: "bg-transparent text-foreground hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-white/10",
  danger: "bg-danger text-white hover:bg-red-600",
};

const sizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  icon: "h-10 w-10 p-0",
};

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-panel font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        "spring min-h-11 font-bold",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
