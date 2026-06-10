import Image from "next/image";
import { cn } from "@/lib/utils";

export const nosBrand = {
  serviceName: "Nos Technology",
  appName: "Nos OS",
  companyName: "株式会社Nos Technology",
  tagline: "チームの今日を、ひとつの画面に",
};

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative block overflow-hidden rounded-panel border border-white/80 bg-white shadow-soft", className)}>
      <Image src="/brand/nos-technology-mark.png" alt="Nos Technology logo mark" fill className="object-contain p-1" sizes="64px" />
    </span>
  );
}

export function BrandLockup({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-panel border border-white/80 bg-white p-3 shadow-soft", className)}>
      <div className="relative h-28 w-full overflow-hidden">
        <Image src="/brand/nos-technology-lockup.png" alt="Nos Technology logo" fill className="object-contain" sizes="(max-width: 768px) 320px, 520px" priority />
      </div>
    </div>
  );
}

export function BrandText({ compact = false }: { compact?: boolean }) {
  return (
    <div className="min-w-0">
      <p className={cn("font-bold leading-tight", compact ? "text-sm" : "text-base")}>{nosBrand.appName}</p>
      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{nosBrand.tagline}</p>
    </div>
  );
}
