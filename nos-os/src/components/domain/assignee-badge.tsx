import type { Employee } from "@/lib/types";
import { cn, initials } from "@/lib/utils";
import { employeeColorToken } from "@/lib/employee-colors";

export function AssigneeBadge({
  employee,
  label,
  size = "sm",
  showName = true,
  className,
}: {
  employee?: Employee | null;
  label?: string;
  size?: "xs" | "sm" | "md";
  showName?: boolean;
  className?: string;
}) {
  const missing = !employee;
  const name = employee?.name ?? label ?? "未設定";
  const avatarLabel = employee?.avatarUrl || (missing ? "未" : name);
  const token = employeeColorToken(employee?.id ?? name);
  const sizeClass = {
    xs: "h-6 w-6 text-[10px]",
    sm: "h-7 w-7 text-[11px]",
    md: "h-9 w-9 text-xs",
  }[size];

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5 rounded-full px-1.5 py-1 ring-1", token.soft, token.text, token.ring, className)}>
      <span className={cn("grid shrink-0 place-items-center rounded-full font-extrabold text-white", token.dot, sizeClass)}>
        {avatarLabel.length <= 3 ? avatarLabel : initials(avatarLabel)}
      </span>
      {showName ? <span className="min-w-0 truncate text-xs font-extrabold">{name}</span> : null}
    </span>
  );
}
