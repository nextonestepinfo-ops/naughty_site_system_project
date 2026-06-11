export type EmployeeColorToken = {
  border: string;
  dot: string;
  soft: string;
  text: string;
  ring: string;
};

const tokens: EmployeeColorToken[] = [
  {
    border: "border-l-sky-500",
    dot: "bg-sky-600",
    soft: "bg-sky-50 dark:bg-sky-400/15",
    text: "text-sky-700 dark:text-sky-100",
    ring: "ring-sky-100 dark:ring-sky-300/20",
  },
  {
    border: "border-l-cyan-500",
    dot: "bg-cyan-600",
    soft: "bg-cyan-50 dark:bg-cyan-400/15",
    text: "text-cyan-700 dark:text-cyan-100",
    ring: "ring-cyan-100 dark:ring-cyan-300/20",
  },
  {
    border: "border-l-fuchsia-500",
    dot: "bg-fuchsia-600",
    soft: "bg-fuchsia-50 dark:bg-fuchsia-400/15",
    text: "text-fuchsia-700 dark:text-fuchsia-100",
    ring: "ring-fuchsia-100 dark:ring-fuchsia-300/20",
  },
  {
    border: "border-l-lime-500",
    dot: "bg-lime-600",
    soft: "bg-lime-50 dark:bg-lime-400/15",
    text: "text-lime-800 dark:text-lime-100",
    ring: "ring-lime-100 dark:ring-lime-300/20",
  },
  {
    border: "border-l-orange-500",
    dot: "bg-orange-600",
    soft: "bg-orange-50 dark:bg-orange-400/15",
    text: "text-orange-700 dark:text-orange-100",
    ring: "ring-orange-100 dark:ring-orange-300/20",
  },
  {
    border: "border-l-slate-400",
    dot: "bg-slate-600",
    soft: "bg-slate-100 dark:bg-white/10",
    text: "text-slate-700 dark:text-slate-100",
    ring: "ring-slate-200 dark:ring-white/10",
  },
];

export function employeeColorToken(employeeId?: string | null) {
  if (!employeeId) return tokens[tokens.length - 1];
  let hash = 0;
  for (let index = 0; index < employeeId.length; index += 1) {
    hash = (hash * 31 + employeeId.charCodeAt(index)) >>> 0;
  }
  return tokens[hash % (tokens.length - 1)];
}
