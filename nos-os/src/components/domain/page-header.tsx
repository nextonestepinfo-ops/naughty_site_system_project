import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
  kicker = "NOS OS",
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  kicker?: string;
}) {
  return (
    <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="ios-kicker">{kicker}</p>
        <h1 className="ios-title mt-1">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
