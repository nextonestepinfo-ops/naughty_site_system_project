"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, ClipboardCheck, FilePenLine, History, Loader2, Plus, Save, Trash2, UserRound } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LoadingPanel } from "@/components/domain/loading";
import { PageHeader } from "@/components/domain/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/form";
import { apiFetch, useScopedQuery } from "@/lib/hooks/use-api";
import { useAppStore } from "@/lib/store/app-store";
import type { Employee, Task, WorkReport, WorkReportPeriod } from "@/lib/types";
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
  const searchParams = useSearchParams();
  const session = useAppStore((state) => state.session);
  const initialPeriod: WorkReportPeriod = searchParams.get("period") === "weekly" ? "weekly" : "daily";
  const [period, setPeriod] = useState<WorkReportPeriod>(initialPeriod);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(session?.employeeId ?? "");
  const [form, setForm] = useState<ReportForm>(() => blankForm(initialPeriod));
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [autoCompletedText, setAutoCompletedText] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"write" | "history">("write");

  const targetEmployeeId = session?.role === "admin" ? selectedEmployeeId || undefined : undefined;
  const reports = useScopedQuery<WorkReport[]>(["reports", period, selectedEmployeeId], "/api/reports", { period, targetEmployeeId });
  const employees = useScopedQuery<Employee[]>(["employees"], "/api/employees");
  const tasks = useScopedQuery<Task[]>(["tasks", "report-completed"], "/api/tasks");

  const employeeOptions = useMemo(() => employees.data ?? [], [employees.data]);
  const currentEmployeeId = session?.role === "admin" ? selectedEmployeeId || session?.employeeId : session?.employeeId;
  const completedTaskLines = useMemo(
    () =>
      (tasks.data ?? [])
        .filter((task) => task.status === "done")
        .filter((task) => !currentEmployeeId || [task.primaryAssigneeId, ...task.assigneeIds].includes(currentEmployeeId))
        .filter((task) => isTaskInsideReportPeriod(task.updatedAt, form.reportDate, period))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .map(reportTaskLine),
    [currentEmployeeId, form.reportDate, period, tasks.data],
  );
  const suggestedCompletedText = completedTaskLines.join("\n");

  useEffect(() => {
    if (form.id || !suggestedCompletedText) return;
    setForm((current) => {
      if (current.id) return current;
      if (current.completedText.trim() && current.completedText !== autoCompletedText) return current;
      return { ...current, completedText: suggestedCompletedText };
    });
    setAutoCompletedText(suggestedCompletedText);
  }, [autoCompletedText, form.id, suggestedCompletedText]);

  function scoped(path: string) {
    return path;
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
      setMobileView("history");
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
    setAutoCompletedText("");
  }

  function submitReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveCurrentReport();
  }

  function saveCurrentReport() {
    if (!currentEmployeeId) return;
    saveReport.mutate({
      id: form.id,
      employeeId: currentEmployeeId,
      period,
      reportDate: form.reportDate,
      title: form.title,
      body: form.body,
      completed: splitLines(form.completedText || suggestedCompletedText),
      blockers: splitLines(form.blockersText),
      nextActions: splitLines(form.nextActionsText),
    });
  }

  if (!session || reports.isLoading || employees.isLoading) return <LoadingPanel label="日報を準備中" />;

  return (
    <>
      <PageHeader
        title="日報・週報"
        description="書いた日報はこのページの「保存済みを見る」に残ります。管理者はメンバー別に確認できます。"
        kicker="REPORTS"
        actions={
          <Button
            variant="ghost"
            onClick={() => {
              setForm(blankForm(period));
              setAutoCompletedText("");
              setDetailOpen(true);
              setMobileView("write");
            }}
          >
            <Plus className="h-4 w-4" />
            新規
          </Button>
        }
      />

      <Card className="mb-4 lg:hidden">
        <CardContent className="space-y-3 p-3">
          <div className="grid grid-cols-2 rounded-[18px] bg-slate-100 p-1 dark:bg-white/10">
            {([
              ["write", "書く"],
              ["history", "保存済みを見る"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                className={cn("h-11 rounded-[14px] text-sm font-extrabold text-slate-500 transition dark:text-slate-200", mobileView === value && "bg-white text-[#0B1226] shadow-soft dark:bg-[#F4F6FA] dark:text-[#050816]")}
                onClick={() => setMobileView(value)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 rounded-[18px] bg-slate-100 p-1 dark:bg-white/10">
            {(["daily", "weekly"] as WorkReportPeriod[]).map((item) => (
              <button
                key={item}
                className={cn("h-11 rounded-[14px] text-sm font-extrabold text-slate-500 transition dark:text-slate-200", period === item && "bg-white text-[#0B1226] shadow-soft dark:bg-[#F4F6FA] dark:text-[#050816]")}
                onClick={() => switchPeriod(item)}
                type="button"
              >
                {periodLabels[item]}
              </button>
            ))}
          </div>
          <div className="rounded-panel bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-800 dark:bg-amber-400/15 dark:text-amber-100">
            保存した日報は「保存済みを見る」に日付順で残ります。後からタップすると編集もできます。
          </div>
        </CardContent>
      </Card>

      {mobileView === "write" ? (
        <QuickReportCard
          period={period}
          form={form}
          completedTaskLines={completedTaskLines}
          suggestedCompletedText={suggestedCompletedText}
          saved={Boolean(savedAt)}
          saving={saveReport.isPending}
          disabled={!currentEmployeeId}
          onFormChange={setForm}
          onImportCompleted={() => {
            setForm((current) => ({ ...current, completedText: suggestedCompletedText }));
            setAutoCompletedText(suggestedCompletedText);
          }}
          onSave={saveCurrentReport}
          onDetail={() => setDetailOpen(true)}
        />
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className={cn(!detailOpen && "hidden lg:block")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FilePenLine className="h-4 w-4 text-[#E08F12]" />
              {periodLabels[period]}を書く
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-2 rounded-[18px] bg-slate-100 p-1 dark:bg-white/10">
              {(["daily", "weekly"] as WorkReportPeriod[]).map((item) => (
                <button
                  key={item}
                  className={cn("h-11 rounded-[14px] text-sm font-extrabold text-slate-500 transition dark:text-slate-200", period === item && "bg-white text-[#0B1226] shadow-soft dark:bg-[#F4F6FA] dark:text-[#050816]")}
                  onClick={() => switchPeriod(item)}
                  type="button"
                >
                  {periodLabels[item]}
                </button>
              ))}
            </div>

            <form onSubmit={submitReport} className="grid gap-3">
              {session.role === "admin" ? (
                <label className="grid gap-1 text-sm font-bold text-slate-600 dark:text-slate-200">
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

              <label className="grid gap-1 text-sm font-bold text-slate-600 dark:text-slate-200">
                日付
                <Input type="date" value={form.reportDate} onChange={(event) => setForm((current) => ({ ...current, reportDate: event.target.value }))} />
              </label>

              <label className="grid gap-1 text-sm font-bold text-slate-600 dark:text-slate-200">
                タイトル
                <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
              </label>

              <label className="grid gap-1 text-sm font-bold text-slate-600 dark:text-slate-200">
                自由記載
                <Textarea
                  value={form.body}
                  onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                  placeholder="補足、感想、相談したいこと、共有したいことだけでOK"
                />
              </label>

              <label className="grid gap-1 text-sm font-bold text-slate-600 dark:text-slate-200">
                完了したタスク
                <div className="rounded-panel border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold leading-6 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/15 dark:text-emerald-100">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2">
                      <ClipboardCheck className="h-4 w-4" />
                      {completedTaskLines.length ? `${period === "weekly" ? "対象期間" : "今日"}の完了タスク ${completedTaskLines.length}件を下書きに入れます` : "完了タスクはまだありません"}
                    </span>
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center rounded-full bg-white px-3 py-2 text-xs font-extrabold text-emerald-800 ring-1 ring-emerald-200 disabled:opacity-70 dark:bg-white/10 dark:text-emerald-100 dark:ring-white/10"
                      disabled={!suggestedCompletedText}
                      onClick={() => {
                        setForm((current) => ({ ...current, completedText: suggestedCompletedText }));
                        setAutoCompletedText(suggestedCompletedText);
                      }}
                    >
                      再取り込み
                    </button>
                  </div>
                  {completedTaskLines.length ? (
                    <div className="mt-3 grid gap-2">
                      {completedTaskLines.slice(0, 3).map((line) => (
                        <span key={line} className="inline-flex min-w-0 items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-extrabold text-emerald-800 ring-1 ring-emerald-100 dark:bg-white/10 dark:text-emerald-100 dark:ring-white/10">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          <span className="truncate">{line.replace(/^・\s*/, "")}</span>
                        </span>
                      ))}
                      {completedTaskLines.length > 3 ? <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-100">+{completedTaskLines.length - 3}件</span> : null}
                    </div>
                  ) : null}
                </div>
                <Textarea
                  value={form.completedText}
                  onChange={(event) => setForm((current) => ({ ...current, completedText: event.target.value }))}
                  placeholder="完了したタスクが自動で入ります。必要なら追記してください。"
                />
              </label>

              <label className="grid gap-1 text-sm font-bold text-slate-600 dark:text-slate-200">
                詰まり・相談
                <Textarea
                  value={form.blockersText}
                  onChange={(event) => setForm((current) => ({ ...current, blockersText: event.target.value }))}
                  placeholder="困っていること、確認してほしいこと"
                />
              </label>

              <label className="grid gap-1 text-sm font-bold text-slate-600 dark:text-slate-200">
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

        <div className={cn("space-y-3", mobileView !== "history" && "hidden lg:block")}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">HISTORY</p>
              <h2 className="text-xl font-extrabold text-[#0B1226] dark:text-white">保存済みの{periodLabels[period]}</h2>
              <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-300">ここから過去の日報を確認・編集できます。</p>
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
                  setDetailOpen(true);
                  setMobileView("write");
                }}
              />
            ))
          ) : (
            <Card>
              <CardContent className="p-5 text-sm font-medium leading-6 text-slate-500 dark:text-slate-200">まだ{periodLabels[period]}がありません。今日の作業メモからで大丈夫です。</CardContent>
            </Card>
          )}
        </div>
      </section>
    </>
  );
}

function QuickReportCard({
  period,
  form,
  completedTaskLines,
  suggestedCompletedText,
  saved,
  saving,
  disabled,
  onFormChange,
  onImportCompleted,
  onSave,
  onDetail,
}: {
  period: WorkReportPeriod;
  form: ReportForm;
  completedTaskLines: string[];
  suggestedCompletedText: string;
  saved: boolean;
  saving: boolean;
  disabled: boolean;
  onFormChange: React.Dispatch<React.SetStateAction<ReportForm>>;
  onImportCompleted: () => void;
  onSave: () => void;
  onDetail: () => void;
}) {
  return (
    <Card className="mb-5 lg:hidden">
      <CardContent className="space-y-3 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#E08F12]">QUICK REPORT</p>
            <h2 className="mt-1 text-xl font-extrabold text-[#0B1226] dark:text-white">1分日報</h2>
            <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-300">保存後は「保存済みを見る」に残ります。</p>
          </div>
          <Badge tone={period === "weekly" ? "blue" : "amber"}>{periodLabels[period]}</Badge>
        </div>

        <div className="rounded-panel border border-emerald-200 bg-emerald-50 p-2.5 text-sm font-semibold text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/15 dark:text-emerald-100">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              完了 {completedTaskLines.length}件
            </span>
            <button
              type="button"
              className="min-h-11 rounded-full bg-white px-3 text-xs font-extrabold text-emerald-800 ring-1 ring-emerald-200 disabled:opacity-60 dark:bg-white/10 dark:text-emerald-100 dark:ring-white/10"
              disabled={!suggestedCompletedText}
              onClick={onImportCompleted}
            >
              自動入力
            </button>
          </div>
          {completedTaskLines.length ? (
            <div className="mt-3 space-y-2">
              {completedTaskLines.slice(0, 3).map((line) => (
                <p key={line} className="truncate rounded-full bg-white px-3 py-2 text-xs font-extrabold text-emerald-800 ring-1 ring-emerald-100 dark:bg-white/10 dark:text-emerald-100 dark:ring-white/10">
                  {line}
                </p>
              ))}
              {completedTaskLines.length > 3 ? <p className="text-xs font-extrabold">ほか {completedTaskLines.length - 3}件</p> : null}
            </div>
          ) : (
            <p className="mt-2 text-xs leading-5">今日完了にしたタスクがここに入ります。</p>
          )}
        </div>

        <label className="grid gap-1 text-sm font-bold text-slate-600 dark:text-slate-200">
          今日のメモ
          <Textarea
            className="!min-h-[72px]"
            value={form.body}
            onChange={(event) => onFormChange((current) => ({ ...current, body: event.target.value }))}
            placeholder="進んだこと、気づいたこと、共有したいこと"
          />
        </label>

        <label className="grid gap-1 text-sm font-bold text-slate-600 dark:text-slate-200">
          明日の最初の一手
          <Textarea
            className="!min-h-[72px]"
            value={form.nextActionsText}
            onChange={(event) => onFormChange((current) => ({ ...current, nextActionsText: event.target.value }))}
            placeholder="明日まず何から始めるか"
          />
        </label>

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Button variant="secondary" disabled={saving || disabled} onClick={onSave}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            保存
          </Button>
          <Button variant="ghost" onClick={onDetail}>
            詳しく書く
          </Button>
        </div>
        {saved ? (
          <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-100">
            <History className="h-3.5 w-3.5" />
            保存済み一覧に入りました
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ReportCard({ report, selected, onEdit }: { report: WorkReport; selected: boolean; onEdit: () => void }) {
  return (
    <button
      className={cn(
        "w-full rounded-panel bg-white p-4 text-left shadow-soft ring-1 ring-white/80 transition active:scale-[0.99] dark:bg-card dark:shadow-none dark:ring-white/10",
        selected && "ring-2 ring-[#E08F12]",
      )}
      onClick={onEdit}
      type="button"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={report.period === "weekly" ? "blue" : "amber"}>{periodLabels[report.period]}</Badge>
        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-300">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatDate(report.reportDate)}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-300">
          <UserRound className="h-3.5 w-3.5" />
          {report.employeeName}
        </span>
      </div>
      <h3 className="mt-3 text-lg font-extrabold leading-tight text-[#0B1226] dark:text-white">{report.title}</h3>
      {report.body ? <p className="mt-2 line-clamp-3 text-sm font-medium leading-6 text-slate-600 dark:text-slate-200">{report.body}</p> : null}
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
    green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-100",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-400/20 dark:text-amber-100",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-400/20 dark:text-blue-100",
  }[tone];
  return (
    <span className={cn("rounded-full px-3 py-1", toneClass)}>
      {label} {count}
    </span>
  );
}

function reportTaskLine(task: Task) {
  const branch = task.sourceBranchTitle ? `（${task.sourceBranchTitle}）` : "";
  return `・${task.title}${branch}`;
}

function isTaskInsideReportPeriod(updatedAt: string, reportDate: string, period: WorkReportPeriod) {
  const taskDay = dateKey(updatedAt);
  if (period === "daily") return taskDay === reportDate;

  const end = new Date(`${reportDate}T00:00:00+09:00`);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  return taskDay >= dateKey(start.toISOString()) && taskDay <= reportDate;
}

function dateKey(value: string) {
  const parts = new Intl.DateTimeFormat("ja-JP-u-ca-gregory", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";
  return `${year}-${month}-${day}`;
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
