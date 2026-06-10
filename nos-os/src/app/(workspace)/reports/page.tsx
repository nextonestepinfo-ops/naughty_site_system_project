"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, FilePenLine, Loader2, Plus, Save, Trash2, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { LoadingPanel } from "@/components/domain/loading";
import { PageHeader } from "@/components/domain/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/form";
import { apiFetch, useScopedQuery } from "@/lib/hooks/use-api";
import { useAppStore } from "@/lib/store/app-store";
import type { Employee, WorkReport, WorkReportPeriod } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

type ReportForm = {
  id?: string;
  reportDate: string;
  title: string;
  body: string;
  completedText: string;
  blockersText: string;
  nextActionsText: string;
};

const periodLabels: Record<WorkReportPeriod, string> = {
  daily: "日報",
  weekly: "週報",
};

function blankForm(period: WorkReportPeriod): ReportForm {
  const today = new Date().toISOString().slice(0, 10);
  return {
    reportDate: today,
    title: period === "weekly" ? "今週の週報" : "今日の日報",
    body: "",
    completedText: "",
    blockersText: "",
    nextActionsText: "",
  };
}

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const session = useAppStore((state) => state.session);
  const [period, setPeriod] = useState<WorkReportPeriod>("daily");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(session?.employeeId ?? "");
  const [form, setForm] = useState<ReportForm>(() => blankForm("daily"));
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const targetEmployeeId = session?.role === "admin" ? selectedEmployeeId || undefined : undefined;
  const reports = useScopedQuery<WorkReport[]>(["reports", period, selectedEmployeeId], "/api/reports", { period, targetEmployeeId });
  const employees = useScopedQuery<Employee[]>(["employees"], "/api/employees");

  const employeeOptions = useMemo(() => employees.data ?? [], [employees.data]);
  const currentEmployeeId = session?.role === "admin" ? selectedEmployeeId || session?.employeeId : session?.employeeId;

  function scoped(path: string) {
    const params = new URLSearchParams();
    if (session) {
      params.set("role", session.role);
      params.set("employeeId", session.employeeId);
      params.set("userId", session.id);
    }
    const query = params.toString();
    return `${path}${query ? `?${query}` : ""}`;
  }

  const saveReport = useMutation({
    mutationFn: (body: Partial<WorkReport>) =>
      apiFetch<WorkReport>(scoped(body.id ? `/api/reports/${body.id}` : "/api/reports"), {
        method: body.id ? "PATCH" : "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (report) => {
      setSavedAt(new Date().toISOString());
      setForm(formFromReport(report));
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });

  const deleteReport = useMutation({
    mutationFn: (id: string) => apiFetch<{ ok: boolean }>(scoped(`/api/reports/${id}`), { method: "DELETE" }),
    onSuccess: () => {
      setForm(blankForm(period));
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });

  function switchPeriod(nextPeriod: WorkReportPeriod) {
    setPeriod(nextPeriod);
    setForm(blankForm(nextPeriod));
    setSavedAt(null);
  }

  function submitReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentEmployeeId) return;
    saveReport.mutate({
      id: form.id,
      employeeId: currentEmployeeId,
      period,
      reportDate: form.reportDate,
      title: form.title,
      body: form.body,
      completed: splitLines(form.completedText),
      blockers: splitLines(form.blockersText),
      nextActions: splitLines(form.nextActionsText),
    });
  }

  if (!session || reports.isLoading || employees.isLoading) return <LoadingPanel label="日報を準備中" />;

  return (
    <>
      <PageHeader
        title="日報・週報"
        description="今日やったこと、詰まり、次にやることを短く残します。管理者はメンバー別に確認できます。"
        kicker="REPORTS"
        actions={
          <Button variant="ghost" onClick={() => setForm(blankForm(period))}>
            <Plus className="h-4 w-4" />
            新規
          </Button>
        }
      />

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FilePenLine className="h-4 w-4 text-[#E08F12]" />
              {periodLabels[period]}を書く
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-2 rounded-[18px] bg-slate-100 p-1">
              {(["daily", "weekly"] as WorkReportPeriod[]).map((item) => (
                <button
                  key={item}
                  className={cn("h-10 rounded-[14px] text-sm font-extrabold text-slate-500 transition", period === item && "bg-white text-[#0B1226] shadow-soft")}
                  onClick={() => switchPeriod(item)}
                  type="button"
                >
                  {periodLabels[item]}
                </button>
              ))}
            </div>

            <form onSubmit={submitReport} className="grid gap-3">
              {session.role === "admin" ? (
                <label className="grid gap-1 text-sm font-bold text-slate-600">
                  メンバー
                  <Select value={selectedEmployeeId} onChange={(event) => setSelectedEmployeeId(event.target.value)}>
                    {employeeOptions.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name}
                      </option>
                    ))}
                  </Select>
                </label>
              ) : null}

              <label className="grid gap-1 text-sm font-bold text-slate-600">
                日付
                <Input type="date" value={form.reportDate} onChange={(event) => setForm((current) => ({ ...current, reportDate: event.target.value }))} />
              </label>

              <label className="grid gap-1 text-sm font-bold text-slate-600">
                タイトル
                <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
              </label>

              <label className="grid gap-1 text-sm font-bold text-slate-600">
                まとめ
                <Textarea
                  value={form.body}
                  onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                  placeholder="今日の状況、判断、共有したいこと"
                />
              </label>

              <label className="grid gap-1 text-sm font-bold text-slate-600">
                やったこと
                <Textarea
                  value={form.completedText}
                  onChange={(event) => setForm((current) => ({ ...current, completedText: event.target.value }))}
                  placeholder="1行に1つずつ"
                />
              </label>

              <label className="grid gap-1 text-sm font-bold text-slate-600">
                詰まり・相談
                <Textarea
                  value={form.blockersText}
                  onChange={(event) => setForm((current) => ({ ...current, blockersText: event.target.value }))}
                  placeholder="困っていること、確認してほしいこと"
                />
              </label>

              <label className="grid gap-1 text-sm font-bold text-slate-600">
                次にやること
                <Textarea
                  value={form.nextActionsText}
                  onChange={(event) => setForm((current) => ({ ...current, nextActionsText: event.target.value }))}
                  placeholder="明日・来週の先頭アクション"
                />
              </label>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button type="submit" variant="secondary" disabled={saveReport.isPending || !currentEmployeeId}>
                  {saveReport.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  保存する
                </Button>
                {form.id ? (
                  <Button
                    type="button"
                    variant="danger"
                    disabled={deleteReport.isPending}
                    onClick={() => {
                      if (window.confirm("この日報を削除します。元に戻せません。")) deleteReport.mutate(form.id!);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    削除
                  </Button>
                ) : null}
                {savedAt ? <span className="text-xs font-bold text-emerald-600">保存しました</span> : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">HISTORY</p>
              <h2 className="text-xl font-extrabold text-[#0B1226]">最近の{periodLabels[period]}</h2>
            </div>
            <Badge tone="blue">{reports.data?.length ?? 0}件</Badge>
          </div>

          {reports.data?.length ? (
            reports.data.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                selected={form.id === report.id}
                onEdit={() => {
                  setPeriod(report.period);
                  setForm(formFromReport(report));
                  setSavedAt(null);
                }}
              />
            ))
          ) : (
            <Card>
              <CardContent className="p-5 text-sm leading-6 text-slate-500">まだ{periodLabels[period]}がありません。今日の作業メモからで大丈夫です。</CardContent>
            </Card>
          )}
        </div>
      </section>
    </>
  );
}

function ReportCard({ report, selected, onEdit }: { report: WorkReport; selected: boolean; onEdit: () => void }) {
  return (
    <button
      className={cn(
        "w-full rounded-panel bg-white p-4 text-left shadow-soft ring-1 ring-white/80 transition active:scale-[0.99]",
        selected && "ring-2 ring-[#E08F12]",
      )}
      onClick={onEdit}
      type="button"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={report.period === "weekly" ? "blue" : "amber"}>{periodLabels[report.period]}</Badge>
        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatDate(report.reportDate)}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500">
          <UserRound className="h-3.5 w-3.5" />
          {report.employeeName}
        </span>
      </div>
      <h3 className="mt-3 text-lg font-extrabold leading-tight text-[#0B1226]">{report.title}</h3>
      {report.body ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{report.body}</p> : null}
      <div className="mt-3 grid gap-2 text-xs font-bold text-slate-500 sm:grid-cols-3">
        <ReportCount label="完了" count={report.completed.length} tone="green" />
        <ReportCount label="相談" count={report.blockers.length} tone="amber" />
        <ReportCount label="次" count={report.nextActions.length} tone="blue" />
      </div>
    </button>
  );
}

function ReportCount({ label, count, tone }: { label: string; count: number; tone: "green" | "amber" | "blue" }) {
  const toneClass = {
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
  }[tone];
  return (
    <span className={cn("rounded-full px-3 py-1", toneClass)}>
      {label} {count}
    </span>
  );
}

function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function formFromReport(report: WorkReport): ReportForm {
  return {
    id: report.id,
    reportDate: report.reportDate,
    title: report.title,
    body: report.body,
    completedText: report.completed.join("\n"),
    blockersText: report.blockers.join("\n"),
    nextActionsText: report.nextActions.join("\n"),
  };
}
