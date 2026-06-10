import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-panel border border-border bg-white px-3 text-base text-foreground outline-none transition placeholder:text-slate-400 focus:border-accent focus:ring-4 focus:ring-blue-500/10 sm:text-sm dark:bg-slate-950 dark:placeholder:text-slate-500",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-panel border border-border bg-white px-3 text-base text-foreground outline-none transition focus:border-accent focus:ring-4 focus:ring-blue-500/10 sm:text-sm dark:bg-slate-950",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-panel border border-border bg-white px-3 py-3 text-base text-foreground outline-none transition placeholder:text-slate-400 focus:border-accent focus:ring-4 focus:ring-blue-500/10 sm:text-sm dark:bg-slate-950 dark:placeholder:text-slate-500",
        className,
      )}
      {...props}
    />
  );
}
