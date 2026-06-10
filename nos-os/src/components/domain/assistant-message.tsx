import { cn } from "@/lib/utils";

function normalizeAssistantText(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/\*\*/g, "")
    .replace(/\s*#{2,6}\s*/g, "\n")
    .replace(/\s+(\d+\.\s)/g, "\n$1")
    .replace(/\s+(-\s)/g, "\n$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitLines(text: string) {
  const normalized = normalizeAssistantText(text);
  if (!normalized) return [];

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1 && normalized.length > 180) {
    return normalized
      .split(/(?<=[。！？])\s*/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  return lines;
}

export function AssistantMessage({ text, className }: { text: string; className?: string }) {
  const lines = splitLines(text);

  if (!lines.length) {
    return <p className={cn("text-sm font-semibold leading-7 text-slate-700 dark:text-slate-100", className)}>まだ回答はありません。</p>;
  }

  return (
    <div className={cn("space-y-2 text-sm font-medium leading-7 text-slate-800 dark:text-slate-100", className)}>
      {lines.map((line, index) => {
        const bullet = line.replace(/^[-・]\s*/, "");
        const numbered = line.match(/^(\d+)\.\s*(.+)$/);

        if (numbered) {
          return (
            <div key={`${line}-${index}`} className="rounded-panel bg-slate-50 px-3 py-2 dark:bg-white/10 dark:ring-1 dark:ring-white/10">
              <div className="flex gap-2">
                <span className="mt-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent text-[11px] font-bold text-white">{numbered[1]}</span>
                <p className="min-w-0 font-bold text-slate-900 dark:text-white">{numbered[2]}</p>
              </div>
            </div>
          );
        }

        if (line.startsWith("-") || line.startsWith("・")) {
          return (
            <div key={`${line}-${index}`} className="flex gap-2 rounded-panel bg-slate-50 px-3 py-2 dark:bg-white/10 dark:ring-1 dark:ring-white/10">
              <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <p className="min-w-0 font-semibold text-slate-800 dark:text-slate-100">{bullet}</p>
            </div>
          );
        }

        return <p key={`${line}-${index}`}>{line}</p>;
      })}
    </div>
  );
}
