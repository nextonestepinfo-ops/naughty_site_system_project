export function LoadingPanel({ label = "読み込み中" }: { label?: string }) {
  return (
    <div className="grid min-h-52 place-items-center rounded-panel border border-border bg-card">
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <span className="h-3 w-3 animate-pulse rounded-full bg-accent" />
        {label}
      </div>
    </div>
  );
}

