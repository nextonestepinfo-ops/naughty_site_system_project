import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function EmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <Icon className="h-10 w-10 text-slate-400" />
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-sm text-slate-500">{body}</p>
        </div>
      </CardContent>
    </Card>
  );
}

