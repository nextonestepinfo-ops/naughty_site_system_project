"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarCheck, CalendarDays, CalendarPlus, Check, CheckCircle2, Clock3, Download, FilePenLine, Mic, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { GoalTreeBoard } from "@/components/domain/goal-tree-board";
import { LoadingPanel } from "@/components/domain/loading";
import { MetricCard } from "@/components/domain/metric-card";
import { PageHeader } from "@/components/domain/page-header";
import { ProjectCard } from "@/components/domain/project-card";
import { TaskCard } from "@/components/domain/task-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { attendanceStatusLabels } from "@/lib/data/labels";
import { apiFetch, useScopedPath, useScopedQuery } from "@/lib/hooks/use-api";
import { useAppStore } from "@/lib/store/app-store";
import type { DashboardSummary, Employee, Project, Task } from "@/lib/types";
import { cn, formatDateTime, formatTime } from "@/lib/utils";

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const session = useAppStore((state) => state.session);
  const dashboard = useScopedQuery<DashboardSummary>(["dashboard"], "/api/dashboard");
  const employees = useScopedQuery<Employee[]>(["employees"], "/api/employees");
  const projects = useScopedQuery<Project[]>(["projects"], "/api/projects");
  const focusGoogleCalendarPath = useScopedPath(
    dashboard.data?.dailyPlan.focusTask ? `/api/calendar/tasks/${dashboard.data.dailyPlan.focusTask.id}/google` : "/api/calendar/ics",
  );

  const completeTask = useMutation({
    mutationFn: (taskId: string) => apiFetch<Task>(`/api/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify({ status: "done" }) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  if (dashboard.isLoading || !dashboard.data) return <LoadingPanel label="ダッシュボードを準備中" />;

  const plan = dashboard.data.dailyPlan;
  const employeeMap = new Map((employees.data ?? []).map((employee) => [employee.id, employee]));
  const projectMap = new Map((projects.data ?? []).map((project) => [project.id, project]));
  const statusTotal = Object.values(dashboard.data.employeeStatus).reduce((sum, value) => sum + value, 0);
  const priorityTasks = Array.from(new Map([...(plan.focusTask ? [plan.focusTask] : []), ...plan.nextTasks].map((task) => [task.id, task])).values());
  const nextTask = plan.nextTasks[0];

  return (
    <>
      <PageHeader
        title={session?.role === "admin" ? "今日の司令室" : "今日やること"}
        description="今やる、次にやる、遅れそうなものだけ。"
        kicker="COMMAND ROOM"
      />

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden border-white bg-white">
          <div className="h-2 bg-[#0B1226]" />
          <CardContent className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:p-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-700">
                  <span className="h-2 w-2 rounded-full bg-[#E08F12]" />
                  いまの最優先
                </span>
                <Badge tone={plan.riskLevel === "danger" ? "red" : plan.riskLevel === "watch" ? "amber" : "green"}>
                  {plan.riskLevel === "danger" ? "要対応" : plan.riskLevel === "watch" ? "注意" : "順調"}
                </Badge>
                <span className="text-xs font-medium text-slate-500">{formatDateTime(plan.generatedAt)} 更新</span>
              </div>
              <h2 className="mt-3 line-clamp-2 break-words text-[26px] font-extrabold leading-tight text-[#0B1226]">
                {plan.focusTask?.title ?? "今日は大きな未完了タスクがありません"}
              </h2>
              {plan.focusTask ? (
                <p className="mt-2 text-sm font-medium text-slate-500">
                  案件: {projectMap.get(plan.focusTask.projectId)?.name ?? "未設定"} / 担当: {employeeMap.get(plan.focusTask.primaryAssigneeId)?.name ?? "未設定"}
                </p>
              ) : null}
              <div className="mt-5 flex flex-wrap gap-2">
                {plan.focusTask ? (
                  <Button disabled={completeTask.isPending} onClick={() => completeTask.mutate(plan.focusTask!.id)} variant="secondary">
                    <Check className="h-4 w-4" />
                    完了にする
                  </Button>
                ) : null}
                {plan.focusTask ? (
                  <Link href={`/tasks?taskId=${plan.focusTask.id}`}>
                    <Button>
                      <Clock3 className="h-4 w-4" />
                      開始する
                    </Button>
                  </Link>
                ) : null}
                <Link href="/assistant">
                  <Button variant="ghost" className="text-indigo-600">
                    <Mic className="h-4 w-4" />
                    秘書に相談
                  </Button>
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:block">
              <PriorityRing value={plan.focusTask?.aiPriorityScore ?? 0} />
              <div className="grid grid-cols-2 gap-2 sm:mt-4 sm:grid-cols-1">
                <a href={plan.calendarExportUrl}>
                  <Button className="w-full" variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                    ICS
                  </Button>
                </a>
                {plan.focusTask ? (
                  <a href={focusGoogleCalendarPath} target="_blank" rel="noreferrer">
                    <Button className="w-full" variant="ghost" size="sm">
                      <CalendarPlus className="h-4 w-4" />
                      Google
                    </Button>
                  </a>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          <FocusSideItem label="次" title={nextTask?.title ?? "通知を確認"} tone="green" />
          <FocusSideItem
            label="リスク"
            title={plan.riskLevel === "danger" ? "遅れると危険" : plan.riskLevel === "watch" ? "今日中に調整" : "順調"}
            tone={plan.riskLevel === "danger" ? "red" : plan.riskLevel === "watch" ? "amber" : "green"}
          />
          <QuickExportStep href={plan.calendarExportUrl} />
        </div>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="今日" value={dashboard.data.todayTasks.length} helper="本日期限" icon={CalendarCheck} tone="blue" />
        <MetricCard label="緊急" value={dashboard.data.urgentTasks.length} helper="優先度: 緊急" icon={AlertTriangle} tone="red" />
        <MetricCard label="遅延" value={dashboard.data.delayedTasks.length} helper="期限超過" icon={Clock3} tone={dashboard.data.delayedTasks.length ? "red" : "green"} />
        <MetricCard
          label={session?.role === "admin" ? "出勤" : "有給"}
          value={session?.role === "admin" ? `${dashboard.data.employeeStatus.working}/${statusTotal}` : `${dashboard.data.leaveBalanceDays ?? "-"}日`}
          helper={session?.role === "admin" ? "社員状況" : "残日数"}
          icon={session?.role === "admin" ? Users : CheckCircle2}
          tone="green"
        />
      </section>

      <Card className="mt-5">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-50 text-[#E08F12]">
                <FilePenLine className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">REPORT</p>
                <h2 className="text-base font-extrabold text-[#0B1226]">日報・週報を書く</h2>
              </div>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">今日やったこと、詰まり、次の一手を残してチームで確認します。</p>
          </div>
          <Link href="/reports" className="shrink-0">
            <Button variant="secondary" className="w-full sm:w-auto">
              <FilePenLine className="h-4 w-4" />
              開く
            </Button>
          </Link>
        </CardContent>
      </Card>

      <CalendarBoard baseDate={plan.generatedAt} tasks={dashboard.data.weekTasks} schedule={plan.schedule} />

      <GoalTreeBoard revenue={plan.revenue} />

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>次にやること</CardTitle>
              <Link href="/tasks" className="text-sm font-medium text-accent">
                一覧
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {priorityTasks.slice(0, 5).map((task) => (
                <TaskCard key={task.id} task={task} project={projectMap.get(task.projectId)} assignee={employeeMap.get(task.primaryAssigneeId)} />
              ))}
              {priorityTasks.length === 0 ? (
                <p className="rounded-panel bg-slate-50 p-4 text-sm text-slate-500 dark:bg-white/5">未完了タスクはありません。</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>担当案件</CardTitle>
              <Link href="/projects" className="text-sm font-medium text-accent">
                一覧
              </Link>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {dashboard.data.activeProjects.slice(0, 4).map((project) => (
                <ProjectCard key={project.id} project={project} owner={employeeMap.get(project.primaryOwnerId)} />
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                AI提案
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboard.data.aiRecommendations.slice(0, 4).map((summary) => (
                <div key={summary.id} className="rounded-panel bg-slate-50 p-3 dark:bg-white/5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold leading-6">{summary.title}</p>
                    <Badge tone={summary.score >= 85 ? "red" : "blue"}>{summary.score}</Badge>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{summary.summary}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {session?.role === "admin" ? (
            <Card>
              <CardHeader>
                <CardTitle>社員状況</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(dashboard.data.employeeStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between rounded-panel bg-slate-50 px-3 py-2 text-sm dark:bg-white/5">
                    <span>{attendanceStatusLabels[status as keyof typeof attendanceStatusLabels]}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </section>
    </>
  );
}

function CalendarBoard({
  baseDate,
  tasks,
  schedule,
}: {
  baseDate: string;
  tasks: Task[];
  schedule: DashboardSummary["dailyPlan"]["schedule"];
}) {
  const days = buildCalendarDays(baseDate, tasks, schedule);

  return (
    <Card className="mt-5 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-accent" />
          カレンダー
        </CardTitle>
        <a href="/tasks" className="text-sm font-medium text-accent">
          一覧
        </a>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto pb-1">
          <div className="grid min-w-[760px] grid-cols-7 gap-2">
            {days.map((day) => (
              <div key={day.key} className={cn("min-h-44 rounded-panel border border-border p-3", day.isToday ? "bg-blue-50 dark:bg-blue-500/10" : "bg-slate-50 dark:bg-white/5")}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">{day.label}</p>
                    <p className="text-lg font-bold">{day.date}</p>
                  </div>
                  {day.isToday ? <Badge tone="blue">今日</Badge> : null}
                </div>
                <div className="mt-3 space-y-2">
                  {day.items.slice(0, 3).map((item) => (
                    <a key={item.id} href="/tasks" className={cn("block rounded-panel px-2 py-2 text-xs font-medium leading-5", item.tone)}>
                      <span className="block truncate">{item.time}</span>
                      <span className="line-clamp-2">{item.title}</span>
                    </a>
                  ))}
                  {day.items.length > 3 ? <p className="text-xs text-slate-500">+{day.items.length - 3}</p> : null}
                  {day.items.length === 0 ? <p className="rounded-panel bg-white px-2 py-5 text-center text-xs text-slate-400 dark:bg-white/5">空き</p> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function buildCalendarDays(baseDate: string, tasks: Task[], schedule: DashboardSummary["dailyPlan"]["schedule"]) {
  const base = startOfDay(new Date(baseDate));
  const todayKey = dateKey(base);
  const scheduleItems = schedule.map((block) => ({
    id: block.id,
    key: dateKey(new Date(block.start)),
    title: block.title,
    time: formatTime(block.start),
    tone:
      block.status === "missed"
        ? "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-100"
        : block.status === "active"
          ? "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-100"
          : "bg-white text-slate-700 dark:bg-white/10 dark:text-slate-200",
  }));
  const taskItems = tasks.map((task) => ({
    id: task.id,
    key: dateKey(new Date(task.dueDate)),
    title: task.title,
    time: task.priority === "urgent" ? "緊急" : "期限",
    tone:
      task.priority === "urgent"
        ? "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-100"
        : task.priority === "high"
          ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-100"
          : "bg-white text-slate-700 dark:bg-white/10 dark:text-slate-200",
  }));

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(base);
    date.setDate(base.getDate() + index);
    const key = dateKey(date);
    return {
      key,
      date: new Intl.DateTimeFormat("ja-JP", { day: "numeric" }).format(date),
      label: index === 0 ? "今日" : new Intl.DateTimeFormat("ja-JP", { weekday: "short" }).format(date),
      isToday: key === todayKey,
      items: [...scheduleItems, ...taskItems].filter((item) => item.key === key),
    };
  });
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function FocusSideItem({ label, title, tone }: { label: string; title: string; tone: "green" | "red" | "amber" }) {
  const toneClass = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-100",
    red: "border-red-200 bg-red-50 text-red-900 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-100",
    amber: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-100",
  }[tone];

  return (
    <div className={cn("rounded-panel border p-4", toneClass)}>
      <p className="text-xs font-bold uppercase">{label}</p>
      <p className="mt-2 line-clamp-2 font-semibold leading-6">{title}</p>
    </div>
  );
}

function QuickExportStep({ href }: { href: string }) {
  return (
    <a
      href={href}
      className={cn(
        "flex min-h-[88px] flex-col rounded-panel border border-slate-200 bg-white p-4 text-slate-900 transition hover:-translate-y-0.5 hover:shadow-soft",
        "dark:border-white/10 dark:bg-white/5 dark:text-white",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase">予定</p>
        <Download className="h-4 w-4 text-accent" />
      </div>
      <p className="mt-2 line-clamp-2 font-semibold leading-6">出力</p>
    </a>
  );
}

function PriorityRing({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#E08F12 ${clamped * 3.6}deg, #E9EDF4 0deg)` }}>
      <div className="grid h-[76px] w-[76px] place-items-center rounded-full bg-white text-center shadow-inner">
        <div>
          <p className="text-2xl font-extrabold leading-none text-[#0B1226]">{clamped}</p>
          <p className="mt-1 text-[10px] font-bold text-slate-400">PRIORITY</p>
        </div>
      </div>
    </div>
  );
}
