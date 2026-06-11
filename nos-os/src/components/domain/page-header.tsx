import type { ReactNode } from "react";

export function PageHeader({
  title,
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
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
