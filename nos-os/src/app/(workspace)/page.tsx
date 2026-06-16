"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarCheck, CalendarDays, CalendarPlus, Check, ChevronDown, Clock3, Download, FilePenLine, Mic } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AssigneeBadge } from "@/components/domain/assignee-badge";
import { GoalTreeBoard } from "@/components/domain/goal-tree-board";
import { LoadingPanel } from "@/components/domain/loading";
import { PageHeader } from "@/components/domain/page-header";
import { PriorityDrawer } from "@/components/domain/priority-drawer";
import { ProjectCard } from "@/components/domain/project-card";
import { TaskCard } from "@/components/domain/task-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { attendanceStatusLabels } from "@/lib/data/labels";
import { displayTaskTitle } from "@/lib/data/task-flags";
import { apiFetch, useScopedQuery } from "@/lib/hooks/use-api";
import { useAppStore } from "@/lib/store/app-store";
import type { DashboardSummary, Employee, Project, Task } from "@/lib/types";
import { cn, formatDate, formatDateTime, formatTime } from "@/lib/utils";

type HomeDrawerId = "report" | "team" | "calendar" | "goals" | "projects" | "ai";

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const session = useAppStore((state) => state.session);
  const [expandedMetric, setExpandedMetric] = useState<"today" | "urgent" | "delayed" | null>(null);
  const [openDrawers, setOpenDrawers] = useState<HomeDrawerId[]>([]);
  const [drawerStateLoaded, setDrawerStateLoaded] = useState(false);
  const dashboard = useScopedQuery<DashboardSummary>(["dashboard"], "/api/dashboard");
  const employees = useScopedQuery<Employee[]>(["employees"], "/api/employees");
  const projects = useScopedQuery<Project[]>(["projects"], "/api/projects");
  const drawerStateKey = useMemo(() => `nos-os-home-drawers-${session?.employeeId ?? "guest"}`, [session?.employeeId]);

  const completeTask = useMutation({
    mutationFn: (taskId: string) => apiFetch<Task>(`/api/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify({ status: "done" }) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(drawerStateKey);
    try {
      setOpenDrawers(raw ? JSON.parse(raw) : defaultHomeDrawers());
    } catch {
      setOpenDrawers(defaultHomeDrawers());
    }
    setDrawerStateLoaded(true);
  }, [drawerStateKey]);

  useEffect(() => {
    if (typeof window === "undefined" || !drawerStateLoaded) return;
    window.localStorage.setItem(drawerStateKey, JSON.stringify(openDrawers));
  }, [drawerStateKey, drawerStateLoaded, openDrawers]);

  if (dashboard.isLoading || !dashboard.data) return <LoadingPanel label="ダッシュボードを準備中" />;

  const plan = dashboard.data.dailyPlan;
  const employeeMap = new Map((employees.data ?? []).map((employee) => [employee.id, employee]));
  const projectMap = new Map((projects.data ?? []).map((project) => [project.id, project]));
  const statusTotal = Object.values(dashboard.data.employeeStatus).reduce((sum, value) => sum + value, 0);
  const allDashboardTasks = uniqueTasks([...(plan.focusTask ? [plan.focusTask] : []), ...plan.nextTasks, ...dashboard.data.todayTasks, ...dashboard.data.urgentTasks, ...dashboard.data.delayedTasks, ...dashboard.data.weekTasks]);
  const personalDashboardTasks = session?.employeeId ? allDashboardTasks.filter((task) => isAssignedTo(task, session.employeeId)) : allDashboardTasks;
  const personalTodayTasks = dashboard.data.todayTasks.filter((task) => !session?.employeeId || isAssignedTo(task, session.employeeId));
  const personalUrgentTasks = dashboard.data.urgentTasks.filter((task) => !session?.employeeId || isAssignedTo(task, session.employeeId));
  const personalDelayedTasks = dashboard.data.delayedTasks.filter((task) => !session?.employeeId || isAssignedTo(task, session.employeeId));
  const priorityTasks = uniqueTasks([...(plan.focusTask ? [plan.focusTask] : []), ...plan.nextTasks, ...personalDashboardTasks])
    .filter((task) => !session?.employeeId || isAssignedTo(task, session.employeeId))
    .sort((a, b) => b.aiPriorityScore - a.aiPriorityScore);
  const heroTask = plan.focusTask && (!session?.employeeId || isAssignedTo(plan.focusTask, session.employeeId)) ? plan.focusTask : personalTodayTasks[0] ?? priorityTasks[0] ?? null;
  const nextPersonalTasks = priorityTasks.filter((task) => task.id !== heroTask?.id).slice(0, 3);
  const heroGoogleCalendarPath = heroTask ? `/api/calendar/tasks/${heroTask.id}/google` : "/api/calendar/ics";
  const homeCopy = homeModeCopy();
  const metricTaskMap = {
    today: personalTodayTasks,
    urgent: personalUrgentTasks,
    delayed: personalDelayedTasks,
  };
  const expandedMetricMeta = expandedMetric ? metricMeta[expandedMetric] : null;
  const expandedMetricTasks = expandedMetric ? metricTaskMap[expandedMetric] : [];
  const teamSummaries = buildTeamSummaries(employees.data ?? [], allDashboardTasks);
  const teamUrgentCount = allDashboardTasks.filter((task) => ["urgent", "high"].includes(task.priority)).length;
  const teamDelayedCount = dashboard.data.delayedTasks.length;
  const toggleDrawer = (id: HomeDrawerId) => {
    setOpenDrawers((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };
  const isDrawerOpen = (id: HomeDrawerId) => openDrawers.includes(id);

  return (
    <>
      <PageHeader
        title={session?.role === "admin" ? "今日の司令室" : "今日やること"}
        description={homeCopy.description}
        kicker="COMMAND ROOM"
      />

      <section className="grid gap-4">
        <Card className="overflow-hidden border-white bg-white dark:border-white/10 dark:bg-card">
          <div className="h-2 bg-[#0B1226]" />
          <CardContent className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:p-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-700">
                  <span className="h-2 w-2 rounded-full bg-[#E08F12]" />
                  {homeCopy.badge}
                </span>
                <Badge tone={plan.riskLevel === "danger" ? "red" : plan.riskLevel === "watch" ? "amber" : "green"}>
                  {plan.riskLevel === "danger" ? "要対応" : plan.riskLevel === "watch" ? "注意" : "順調"}
                </Badge>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-300">{formatDateTime(plan.generatedAt)} 更新</span>
              </div>
              <h2 className="mt-3 line-clamp-2 break-words text-[26px] font-extrabold leading-tight text-[#0B1226] dark:text-white">
                {heroTask ? displayTaskTitle(heroTask) : "自分の未完了タスクはありません"}
              </h2>
              {heroTask ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-300">
                  <AssigneeBadge employee={employeeMap.get(heroTask.primaryAssigneeId)} label="担当未設定" />
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-slate-100">
                    案件: {heroTask.projectId ? projectMap.get(heroTask.projectId)?.name ?? "未設定" : "案件なし"}
                  </span>
                </div>
              ) : null}
              <div className="mt-5 flex flex-wrap gap-2">
                {heroTask ? (
                  <Button disabled={completeTask.isPending} onClick={() => completeTask.mutate(heroTask.id)} variant="secondary">
                    <Check className="h-4 w-4" />
                    完了にする
                  </Button>
                ) : null}
                {heroTask ? (
                  <Link href={`/tasks?taskId=${heroTask.id}`}>
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
              <PriorityRing value={heroTask?.aiPriorityScore ?? 0} />
              <div className="grid grid-cols-2 gap-2 sm:mt-4 sm:grid-cols-1">
                <a href={plan.calendarExportUrl}>
                  <Button className="w-full" variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                    ICS
                  </Button>
                </a>
                {heroTask ? (
                  <a href={heroGoogleCalendarPath} target="_blank" rel="noreferrer">
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
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-3">
        <HomeMetricTile
          label={session?.role === "admin" ? "自分の今日" : "今日"}
          value={personalTodayTasks.length}
          helper="本日期限"
          icon={CalendarCheck}
          tone="blue"
          active={expandedMetric === "today"}
          topTask={personalTodayTasks[0]}
          assignee={personalTodayTasks[0] ? employeeMap.get(personalTodayTasks[0].primaryAssigneeId) : undefined}
          onClick={() => setExpandedMetric((current) => (current === "today" ? null : "today"))}
        />
        <HomeMetricTile
          label={session?.role === "admin" ? "自分の緊急" : "緊急"}
          value={personalUrgentTasks.length}
          helper="優先度: 高以上"
          icon={AlertTriangle}
          tone="red"
          active={expandedMetric === "urgent"}
          topTask={personalUrgentTasks[0]}
          assignee={personalUrgentTasks[0] ? employeeMap.get(personalUrgentTasks[0].primaryAssigneeId) : undefined}
          onClick={() => setExpandedMetric((current) => (current === "urgent" ? null : "urgent"))}
        />
        <HomeMetricTile
          label={session?.role === "admin" ? "自分の遅延" : "遅延"}
          value={personalDelayedTasks.length}
          helper="期限超過"
          icon={Clock3}
          tone={personalDelayedTasks.length ? "red" : "green"}
          active={expandedMetric === "delayed"}
          topTask={personalDelayedTasks[0]}
          assignee={personalDelayedTasks[0] ? employeeMap.get(personalDelayedTasks[0].primaryAssigneeId) : undefined}
          onClick={() => setExpandedMetric((current) => (current === "delayed" ? null : "delayed"))}
        />
      </section>

      {expandedMetric && expandedMetricMeta ? (
        <Card className="mt-3 border-2 border-[#E08F12]/25">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>{expandedMetricMeta.title}</CardTitle>
              <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-300">{expandedMetricMeta.description}</p>
            </div>
            <Link href={expandedMetricMeta.href} className="inline-flex min-h-11 items-center rounded-full bg-slate-100 px-3 text-xs font-extrabold text-[#0B1226] dark:bg-white/10 dark:text-white">
              タスクで見る
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {expandedMetricTasks.length ? (
              expandedMetricTasks.slice(0, 3).map((task) => (
                <TaskCard key={task.id} task={task} project={task.projectId ? projectMap.get(task.projectId) : undefined} assignee={employeeMap.get(task.primaryAssigneeId)} />
              ))
            ) : (
              <p className="rounded-panel bg-slate-50 p-4 text-sm font-bold text-slate-500 dark:bg-white/5 dark:text-slate-200">対象タスクはありません。</p>
            )}
            {expandedMetricTasks.length > 3 ? <p className="text-xs font-bold text-slate-500 dark:text-slate-300">ほか {expandedMetricTasks.length - 3} 件はタスク画面で確認できます。</p> : null}
          </CardContent>
        </Card>
      ) : null}

      <section className="mt-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="ios-kicker">NEXT</p>
                <h2 className="text-lg font-extrabold text-[#0B1226] dark:text-white">このあとのタスク</h2>
              </div>
              <Link href="/tasks?segment=today" className="inline-flex min-h-11 items-center rounded-full bg-slate-100 px-3 text-xs font-extrabold text-[#0B1226] dark:bg-white/10 dark:text-white">
                すべて見る
              </Link>
            </div>
            <div className="mt-3 grid gap-2">
              {nextPersonalTasks.length ? (
                nextPersonalTasks.map((task) => (
                  <NextTaskRow key={task.id} task={task} project={task.projectId ? projectMap.get(task.projectId) : undefined} assignee={employeeMap.get(task.primaryAssigneeId)} />
                ))
              ) : (
                <p className="rounded-panel bg-slate-50 p-4 text-sm font-bold text-slate-500 dark:bg-white/5 dark:text-slate-300">次に控えているタスクはありません。</p>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-5 space-y-3">
        <PriorityDrawer
          priority="P2"
          title="日報"
          count={`${plan.completedToday.length}件`}
          summary={plan.completedToday.length ? `完了: ${displayTaskTitle(plan.completedToday[0])}` : "完了タスクが入ると日報に自動反映されます"}
          tone="gold"
          href="/reports?period=daily"
          open={isDrawerOpen("report")}
          onToggle={() => toggleDrawer("report")}
        >
          <ReportQuickPanel completedToday={plan.completedToday} />
        </PriorityDrawer>

        {session?.role === "admin" ? (
          <PriorityDrawer
            priority="P2"
            title="チーム監視"
            count={`${dashboard.data.employeeStatus.working}/${statusTotal}`}
            summary={`緊急${teamUrgentCount}件 / 遅延${teamDelayedCount}件。担当者別に確認できます`}
            tone={teamDelayedCount ? "red" : "green"}
            href="/tasks?segment=all"
            open={isDrawerOpen("team")}
            onToggle={() => toggleDrawer("team")}
          >
            <TeamMonitorPanel summaries={teamSummaries} employeeStatus={dashboard.data.employeeStatus} />
          </PriorityDrawer>
        ) : null}

        <PriorityDrawer
          priority="P3"
          className="hidden lg:block"
          title="カレンダー"
          count={`${dashboard.data.weekTasks.length}件`}
          summary="今週の予定とタスクは必要な時だけ開きます"
          tone="blue"
          href="/tasks?segment=week"
          desktopOpen
          open={isDrawerOpen("calendar")}
          onToggle={() => toggleDrawer("calendar")}
        >
          <CalendarBoard baseDate={plan.generatedAt} tasks={dashboard.data.weekTasks} schedule={plan.schedule} embedded />
        </PriorityDrawer>

        <PriorityDrawer
          priority="P3"
          className="hidden lg:block"
          title="目標ツリー"
          count="要約"
          summary="会社目標・自分の枝・未タスク化だけ先に確認します"
          tone="slate"
          desktopOpen
          open={isDrawerOpen("goals")}
          onToggle={() => toggleDrawer("goals")}
        >
          <GoalTreeBoard revenue={plan.revenue} focusEmployeeId={session?.employeeId} compact />
        </PriorityDrawer>

        <PriorityDrawer
          priority="P3"
          className="hidden lg:block"
          title="担当案件"
          count={`${dashboard.data.activeProjects.length}件`}
          summary={dashboard.data.activeProjects[0]?.name ?? "担当案件はありません"}
          tone="slate"
          href="/projects"
          desktopOpen
          open={isDrawerOpen("projects")}
          onToggle={() => toggleDrawer("projects")}
        >
          <div className="grid gap-3 md:grid-cols-2">
            {dashboard.data.activeProjects.slice(0, 4).map((project) => (
              <ProjectCard key={project.id} project={project} owner={employeeMap.get(project.primaryOwnerId)} />
            ))}
            {dashboard.data.activeProjects.length === 0 ? <p className="rounded-panel bg-slate-50 p-4 text-sm font-semibold text-slate-500 dark:bg-white/5 dark:text-slate-200">担当案件はありません。</p> : null}
          </div>
        </PriorityDrawer>

        <PriorityDrawer
          priority="P3"
          className="hidden lg:block"
          title="AI提案"
          count={`${dashboard.data.aiRecommendations.length}件`}
          summary={dashboard.data.aiRecommendations[0]?.title ?? "提案はありません"}
          tone="iris"
          href="/assistant"
          open={isDrawerOpen("ai")}
          onToggle={() => toggleDrawer("ai")}
        >
          <div className="space-y-3">
            {dashboard.data.aiRecommendations.slice(0, 4).map((summary) => (
              <div key={summary.id} className="rounded-panel bg-slate-50 p-3 dark:bg-white/5">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold leading-6">{summary.title}</p>
                  <Badge tone={summary.score >= 85 ? "red" : "blue"}>{summary.score}</Badge>
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-200">{summary.summary}</p>
              </div>
            ))}
          </div>
        </PriorityDrawer>
      </section>
    </>
  );
}

function NextTaskRow({ task, project, assignee }: { task: Task; project?: Project; assignee?: Employee }) {
  const distance = homeDayDistance(task.dueDate);
  return (
    <Link href={`/tasks?taskId=${task.id}`} className="flex min-h-[64px] items-center gap-3 rounded-panel bg-slate-50 p-3 ring-1 ring-border transition active:scale-[.98] dark:bg-white/5 dark:ring-white/10">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-xs font-extrabold text-[#0B1226] ring-1 ring-border dark:bg-white/10 dark:text-white dark:ring-white/10">
        {assignee?.name.slice(0, 1) ?? "?"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-1 text-sm font-extrabold text-[#0B1226] dark:text-white">{displayTaskTitle(task)}</span>
        <span className="mt-1 block truncate text-xs font-semibold text-slate-500 dark:text-slate-300">{project?.name ?? "案件なし"}</span>
      </span>
      <Badge tone={distance < 0 ? "red" : distance === 0 ? "amber" : "slate"}>{distance < 0 ? "超過" : distance === 0 ? "今日" : formatDate(task.dueDate)}</Badge>
    </Link>
  );
}

function homeModeCopy() {
  const hour = new Date().getHours();
  if (hour < 11) {
    return {
      badge: "朝の最優先",
      description: "今日の段取りを1件に絞って、午前中に動き出します。",
    };
  }
  if (hour >= 18) {
    return {
      badge: "夜の締め",
      description: "完了したことを日報に残し、明日の最初の一手だけ決めます。",
    };
  }
  return {
    badge: "いまの最優先",
    description: "今やる、次にやる、遅れそうなものだけ。",
  };
}

function defaultHomeDrawers(): HomeDrawerId[] {
  const hour = new Date().getHours();
  return hour >= 18 ? ["report"] : [];
}

function uniqueTasks(tasks: Task[]) {
  return Array.from(new Map(tasks.map((task) => [task.id, task])).values());
}

function isAssignedTo(task: Task, employeeId: string) {
  return [task.primaryAssigneeId, ...task.assigneeIds].includes(employeeId);
}

type TeamSummary = {
  employee: Employee;
  total: number;
  today: number;
  urgent: number;
  delayed: number;
  topTask: Task | null;
};

function buildTeamSummaries(employees: Employee[], tasks: Task[]): TeamSummary[] {
  return employees
    .map((employee) => {
      const assigned = uniqueTasks(tasks.filter((task) => isAssignedTo(task, employee.id))).sort((a, b) => b.aiPriorityScore - a.aiPriorityScore);
      return {
        employee,
        total: assigned.length,
        today: assigned.filter((task) => homeDayDistance(task.dueDate) === 0).length,
        urgent: assigned.filter((task) => ["urgent", "high"].includes(task.priority)).length,
        delayed: assigned.filter((task) => homeDayDistance(task.dueDate) < 0).length,
        topTask: assigned[0] ?? null,
      };
    })
    .sort((a, b) => b.delayed - a.delayed || b.urgent - a.urgent || b.today - a.today || b.total - a.total);
}

function homeDayDistance(value: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(value);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function ReportQuickPanel({ completedToday }: { completedToday: Task[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
      <div className="min-w-0 space-y-3">
        <div className="flex items-center gap-2">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-50 text-[#E08F12] dark:bg-amber-400/15 dark:text-amber-100">
            <FilePenLine className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">REPORT</p>
            <h2 className="text-base font-extrabold text-[#0B1226] dark:text-white">日報・週報を書く</h2>
          </div>
        </div>
        <p className="text-sm leading-6 text-slate-500 dark:text-slate-200">完了にしたタスクは日報へ自動で入ります。あとは補足や相談を書くだけです。</p>
        <div className="rounded-panel bg-slate-50 p-3 dark:bg-white/5">
          <p className="text-xs font-extrabold text-slate-500 dark:text-slate-300">今日の自動入力</p>
          <p className="mt-1 text-2xl font-extrabold text-[#0B1226] dark:text-white">{completedToday.length}件</p>
          {completedToday.length ? (
            <div className="mt-2 space-y-1">
              {completedToday.slice(0, 2).map((task) => (
                <p key={task.id} className="truncate text-xs font-semibold text-slate-500 dark:text-slate-300">{displayTaskTitle(task)}</p>
              ))}
              {completedToday.length > 2 ? <p className="text-xs font-bold text-slate-400 dark:text-slate-300">+{completedToday.length - 2}件</p> : null}
            </div>
          ) : (
            <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-300">タスクを完了にすると、ここから日報に入ります。</p>
          )}
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:w-44 lg:grid-cols-1">
        <Link href="/reports?period=daily">
          <Button variant="secondary" className="w-full">
            <FilePenLine className="h-4 w-4" />
            日報を書く
          </Button>
        </Link>
        <Link href="/reports?period=weekly">
          <Button variant="ghost" className="w-full">
            週報を書く
          </Button>
        </Link>
      </div>
    </div>
  );
}

function TeamMonitorPanel({
  summaries,
  employeeStatus,
}: {
  summaries: TeamSummary[];
  employeeStatus: DashboardSummary["employeeStatus"];
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">
        {Object.entries(employeeStatus).map(([status, count]) => (
          <div key={status} className="flex items-center justify-between rounded-panel bg-slate-50 px-3 py-2 text-sm font-bold dark:bg-white/5">
            <span className="text-slate-500 dark:text-slate-300">{attendanceStatusLabels[status as keyof typeof attendanceStatusLabels]}</span>
            <span className="text-[#0B1226] dark:text-white">{count}</span>
          </div>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {summaries.map((summary) => (
          <div key={summary.employee.id} className="rounded-panel bg-slate-50 p-3 dark:bg-white/5">
            <div className="flex items-center justify-between gap-3">
              <AssigneeBadge employee={summary.employee} />
              <Link href={`/tasks?segment=all&assigneeId=${summary.employee.id}`} className="shrink-0 text-xs font-extrabold text-accent">
                見る
              </Link>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs font-extrabold">
              <TeamMini label="全体" value={summary.total} />
              <TeamMini label="今日" value={summary.today} />
              <TeamMini label="緊急" value={summary.urgent} danger={summary.urgent > 0} />
              <TeamMini label="遅延" value={summary.delayed} danger={summary.delayed > 0} />
            </div>
            <p className="mt-3 truncate text-xs font-semibold text-slate-500 dark:text-slate-300">
              {summary.topTask ? displayTaskTitle(summary.topTask) : "未完了タスクなし"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamMini({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return (
    <span className={cn("rounded-panel px-2 py-2", danger ? "bg-red-50 text-red-700 dark:bg-red-400/15 dark:text-red-100" : "bg-white text-slate-600 dark:bg-white/5 dark:text-slate-100")}>
      <span className="block text-[10px] opacity-75">{label}</span>
      <span className="mt-0.5 block text-sm">{value}</span>
    </span>
  );
}

function CalendarBoard({
  baseDate,
  tasks,
  schedule,
  embedded = false,
}: {
  baseDate: string;
  tasks: Task[];
  schedule: DashboardSummary["dailyPlan"]["schedule"];
  embedded?: boolean;
}) {
  const days = buildCalendarDays(baseDate, tasks, schedule);
  const content = <CalendarBoardContent days={days} />;

  if (embedded) return content;

  return (
    <Card className="mt-5 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-accent" />
          カレンダー
        </CardTitle>
        <a href="/tasks" className="inline-flex min-h-11 min-w-11 items-center justify-center text-sm font-bold text-accent">
          一覧
        </a>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}

function CalendarBoardContent({ days }: { days: ReturnType<typeof buildCalendarDays> }) {
  return (
    <>
      <div className="grid min-w-0 gap-2 sm:hidden">
        {days.map((day) => (
          <div key={day.key} className={cn("min-w-0 overflow-hidden rounded-panel border border-border p-3", day.isToday ? "bg-blue-50 dark:bg-blue-500/10" : "bg-slate-50 dark:bg-white/5")}>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-300">{day.label}</p>
                <p className="text-lg font-bold">{day.date}</p>
              </div>
              {day.isToday ? <Badge tone="blue">今日</Badge> : null}
            </div>
            <div className="mt-3 grid gap-2">
              {day.items.slice(0, 2).map((item) => (
                <a key={item.id} href="/tasks" className={cn("flex min-h-11 min-w-0 items-center justify-between gap-3 overflow-hidden rounded-panel px-3 py-2 text-xs font-medium leading-5", item.tone)}>
                  <span className="min-w-0">
                    <span className="block truncate">{item.title}</span>
                    <span className="text-[11px] opacity-80">{item.time}</span>
                  </span>
                </a>
              ))}
              {day.items.length > 2 ? <p className="text-xs font-bold text-slate-500 dark:text-slate-300">+{day.items.length - 2}件</p> : null}
              {day.items.length === 0 ? <p className="rounded-panel bg-white px-3 py-3 text-center text-xs font-bold text-slate-400 dark:bg-white/5 dark:text-slate-300">空き</p> : null}
            </div>
          </div>
        ))}
      </div>
      <div className="hidden overflow-x-auto pb-1 sm:block">
        <div className="grid min-w-[760px] grid-cols-7 gap-2">
          {days.map((day) => (
            <div key={day.key} className={cn("min-h-44 rounded-panel border border-border p-3", day.isToday ? "bg-blue-50 dark:bg-blue-500/10" : "bg-slate-50 dark:bg-white/5")}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-300">{day.label}</p>
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
                {day.items.length > 3 ? <p className="text-xs text-slate-500 dark:text-slate-300">+{day.items.length - 3}</p> : null}
                {day.items.length === 0 ? <p className="rounded-panel bg-white px-2 py-5 text-center text-xs text-slate-400 dark:bg-white/5 dark:text-slate-300">空き</p> : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
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

const metricMeta = {
  today: {
    title: "今日やるタスク",
    description: "本日期限のタスクです。まずここを空にすると一日が締まります。",
    href: "/tasks?segment=today",
  },
  urgent: {
    title: "緊急タスク",
    description: "優先度が高いタスクです。管理者は担当者でさらに絞り込めます。",
    href: "/tasks?segment=all&chip=high",
  },
  delayed: {
    title: "遅延タスク",
    description: "期限を過ぎたタスクです。今日やるか、期限を引き直してください。",
    href: "/tasks?segment=all&due=overdue",
  },
} as const;

function HomeMetricTile({
  label,
  value,
  helper,
  icon: Icon,
  tone,
  active,
  topTask,
  assignee,
  onClick,
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: LucideIcon;
  tone: "blue" | "green" | "red";
  active: boolean;
  topTask?: Task;
  assignee?: Employee;
  onClick: () => void;
}) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200",
    green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
    red: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-200",
  }[tone];
  const borderClass = {
    blue: "border-l-blue-500",
    green: "border-l-emerald-500",
    red: "border-l-red-500",
  }[tone];
  return (
    <button type="button" className="text-left" onClick={onClick} aria-expanded={active}>
      <Card className={cn("border-l-4 transition", borderClass, active && "ring-2 ring-[#E08F12]/40")}>
        <CardContent className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
            <p className="mt-2 text-2xl font-bold">{value}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{helper}</p>
            {topTask ? (
              <div className="mt-3 max-w-full">
                <p className="line-clamp-1 break-words text-xs font-extrabold text-[#0B1226] dark:text-white">{displayTaskTitle(topTask)}</p>
                <div className="mt-1">
                  <AssigneeBadge employee={assignee} label="担当未設定" size="xs" />
                </div>
              </div>
            ) : null}
            <p className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-[#E08F12]">
              {active ? "閉じる" : "中を見る"}
              <ChevronDown className={cn("h-3.5 w-3.5 transition", active && "rotate-180")} />
            </p>
          </div>
          <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-panel", toneClass)}>
            <Icon className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

function PriorityRing({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#E08F12 ${clamped * 3.6}deg, #E9EDF4 0deg)` }}>
      <div className="grid h-[76px] w-[76px] place-items-center rounded-full bg-white text-center shadow-inner dark:bg-[#050816]">
        <div>
          <p className="text-2xl font-extrabold leading-none text-[#0B1226] dark:text-white">{clamped}</p>
          <p className="mt-1 text-[10px] font-bold text-slate-400">PRIORITY</p>
        </div>
      </div>
    </div>
  );
}
