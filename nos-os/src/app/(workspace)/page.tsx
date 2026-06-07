"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Building2, CalendarCheck, CalendarDays, Check, CheckCircle2, Clock3, Download, GitBranch, Mic, Plus, Sparkles, Target, Trash2, UserRound, Users, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LoadingPanel } from "@/components/domain/loading";
import { MetricCard } from "@/components/domain/metric-card";
import { PageHeader } from "@/components/domain/page-header";
import { ProjectCard } from "@/components/domain/project-card";
import { TaskCard } from "@/components/domain/task-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { attendanceStatusLabels } from "@/lib/data/labels";
import { apiFetch, useScopedQuery } from "@/lib/hooks/use-api";
import { useAppStore } from "@/lib/store/app-store";
import type { DashboardSummary, Employee, Project, Task } from "@/lib/types";
import { cn, formatDateTime, formatTime } from "@/lib/utils";

type GoalIcon = "company" | "personal";

type GoalMetric = {
  id: string;
  label: string;
  current: number;
  target: number;
  unit: string;
};

type GoalBranch = {
  id: string;
  title: string;
  tasks: string[];
};

type GoalMap = {
  id: string;
  title: string;
  icon: GoalIcon;
  goal: string;
  branches: GoalBranch[];
  metrics: GoalMetric[];
};

const goalStorageKey = "nos-os-goal-tree-v1";
const primaryGoalText = "2026年12月に1000万円達成";
const primaryRevenueTarget = 10000000;

const defaultGoalMaps: GoalMap[] = [
  {
    id: "company",
    title: "会社",
    icon: "company",
    goal: primaryGoalText,
    metrics: [{ id: "company-revenue", label: "売上", current: 0, target: primaryRevenueTarget, unit: "円" }],
    branches: [
      { id: "company-web", title: "Web制作を売る", tasks: ["営業リスト", "メール", "反応記録"] },
      { id: "company-proof", title: "実績を作る", tasks: ["飲食店", "サンプル改善", "事例化"] },
    ],
  },
  {
    id: "personal",
    title: "個人",
    icon: "personal",
    goal: "月900万へ",
    metrics: [{ id: "personal-month", label: "月商", current: 0, target: 9000000, unit: "円" }],
    branches: [
      { id: "personal-volume", title: "数を打つ", tasks: ["候補出し", "話を聞く", "当たりを見る"] },
      { id: "personal-time", title: "時間を作る", tasks: ["優先順位", "任せる", "仕組み化"] },
    ],
  },
];

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const session = useAppStore((state) => state.session);
  const dashboard = useScopedQuery<DashboardSummary>(["dashboard"], "/api/dashboard");
  const employees = useScopedQuery<Employee[]>(["employees"], "/api/employees");
  const projects = useScopedQuery<Project[]>(["projects"], "/api/projects");

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
      />

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={plan.riskLevel === "danger" ? "red" : plan.riskLevel === "watch" ? "amber" : "green"}>
                {plan.riskLevel === "danger" ? "今すぐ" : plan.riskLevel === "watch" ? "注意" : "順調"}
              </Badge>
              <span className="text-sm text-slate-500">{formatDateTime(plan.generatedAt)} 更新</span>
            </div>
            <h2 className="mt-3 text-2xl font-bold leading-tight">{plan.focusTask?.title ?? "今日は大きな未完了タスクがありません"}</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {plan.focusTask ? (
                <Button disabled={completeTask.isPending} onClick={() => completeTask.mutate(plan.focusTask!.id)}>
                  <Check className="h-4 w-4" />
                  完了
                </Button>
              ) : null}
              <a href={plan.calendarExportUrl}>
                <Button variant="secondary">
                  <Download className="h-4 w-4" />
                  予定
                </Button>
              </a>
              <Link href="/assistant">
                <Button variant="ghost">
                  <Mic className="h-4 w-4" />
                  AI
                </Button>
              </Link>
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

      <CalendarBoard baseDate={plan.generatedAt} tasks={dashboard.data.weekTasks} schedule={plan.schedule} />

      <GoalTree />

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

function GoalTree() {
  const [goals, setGoals] = useState<GoalMap[]>(defaultGoalMaps);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(goalStorageKey);
    if (raw) {
      try {
        setGoals(migrateGoalMaps(JSON.parse(raw) as GoalMap[]));
      } catch {
        setGoals(defaultGoalMaps);
      }
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) window.localStorage.setItem(goalStorageKey, JSON.stringify(goals));
  }, [goals, loaded]);

  function updateGoal(goalId: string, patch: Partial<GoalMap>) {
    setGoals((current) => current.map((goal) => (goal.id === goalId ? { ...goal, ...patch } : goal)));
  }

  function addGoal() {
    setGoals((current) => [
      ...current,
      {
        id: uid("goal"),
        title: "新しい目標",
        icon: "company",
        goal: "目標名",
        metrics: [],
        branches: [{ id: uid("branch"), title: "枝", tasks: ["小タスク"] }],
      },
    ]);
  }

  function deleteGoal(goalId: string) {
    setGoals((current) => current.filter((goal) => goal.id !== goalId));
  }

  function addMetric(goalId: string) {
    setGoals((current) =>
      current.map((goal) =>
        goal.id === goalId
          ? { ...goal, metrics: [...goal.metrics, { id: uid("metric"), label: "数値", current: 0, target: 100, unit: "" }] }
          : goal,
      ),
    );
  }

  function updateMetric(goalId: string, metricId: string, patch: Partial<GoalMetric>) {
    setGoals((current) =>
      current.map((goal) =>
        goal.id === goalId
          ? { ...goal, metrics: goal.metrics.map((metric) => (metric.id === metricId ? { ...metric, ...patch } : metric)) }
          : goal,
      ),
    );
  }

  function deleteMetric(goalId: string, metricId: string) {
    setGoals((current) =>
      current.map((goal) =>
        goal.id === goalId ? { ...goal, metrics: goal.metrics.filter((metric) => metric.id !== metricId) } : goal,
      ),
    );
  }

  function addBranch(goalId: string) {
    setGoals((current) =>
      current.map((goal) =>
        goal.id === goalId ? { ...goal, branches: [...goal.branches, { id: uid("branch"), title: "枝", tasks: ["小タスク"] }] } : goal,
      ),
    );
  }

  function updateBranch(goalId: string, branchId: string, patch: Partial<GoalBranch>) {
    setGoals((current) =>
      current.map((goal) =>
        goal.id === goalId
          ? { ...goal, branches: goal.branches.map((branch) => (branch.id === branchId ? { ...branch, ...patch } : branch)) }
          : goal,
      ),
    );
  }

  function deleteBranch(goalId: string, branchId: string) {
    setGoals((current) =>
      current.map((goal) =>
        goal.id === goalId ? { ...goal, branches: goal.branches.filter((branch) => branch.id !== branchId) } : goal,
      ),
    );
  }

  function addTask(goalId: string, branchId: string) {
    setGoals((current) =>
      current.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              branches: goal.branches.map((branch) => (branch.id === branchId ? { ...branch, tasks: [...branch.tasks, "小タスク"] } : branch)),
            }
          : goal,
      ),
    );
  }

  function updateTask(goalId: string, branchId: string, taskIndex: number, value: string) {
    setGoals((current) =>
      current.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              branches: goal.branches.map((branch) =>
                branch.id === branchId
                  ? { ...branch, tasks: branch.tasks.map((task, index) => (index === taskIndex ? value : task)) }
                  : branch,
              ),
            }
          : goal,
      ),
    );
  }

  function deleteTask(goalId: string, branchId: string, taskIndex: number) {
    setGoals((current) =>
      current.map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              branches: goal.branches.map((branch) =>
                branch.id === branchId ? { ...branch, tasks: branch.tasks.filter((_, index) => index !== taskIndex) } : branch,
              ),
            }
          : goal,
      ),
    );
  }

  return (
    <Card className="mt-5" data-testid="goal-tree">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <Target className="h-4 w-4 text-accent" />
          目標ツリー
        </CardTitle>
        <Button data-testid="goal-add" size="sm" variant="secondary" onClick={addGoal}>
          <Plus className="h-4 w-4" />
          追加
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-2">
        {goals.map((goal) => {
          const Icon = goal.icon === "personal" ? UserRound : Building2;

          return (
          <div key={goal.id} className="rounded-panel border border-border p-4" data-goal-id={goal.id} data-testid="goal-card">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-panel bg-slate-50 dark:bg-white/10">
                <Icon className="h-5 w-5 text-accent" />
              </span>
              <div className="min-w-0 flex-1">
                <Input className="h-9 font-semibold" value={goal.title} onChange={(event) => updateGoal(goal.id, { title: event.target.value })} />
                <Input className="mt-2 h-9 text-lg font-bold" value={goal.goal} onChange={(event) => updateGoal(goal.id, { goal: event.target.value })} />
              </div>
              <Button aria-label="目標を削除" title="目標を削除" size="icon" variant="ghost" onClick={() => deleteGoal(goal.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              {goal.metrics.map((metric) => {
                const rate = metric.target > 0 ? Math.min(100, Math.max(0, Math.round((metric.current / metric.target) * 100))) : 0;

                return (
                  <div key={metric.id} className="rounded-panel bg-slate-50 p-3 dark:bg-white/5">
                    <div className="grid gap-2 sm:grid-cols-[1fr_90px_90px_70px_auto]">
                      <Input className="h-9" value={metric.label} onChange={(event) => updateMetric(goal.id, metric.id, { label: event.target.value })} />
                      <Input
                        className="h-9"
                        inputMode="numeric"
                        type="number"
                        value={metric.current}
                        onChange={(event) => updateMetric(goal.id, metric.id, { current: Number(event.target.value) })}
                      />
                      <Input
                        className="h-9"
                        inputMode="numeric"
                        type="number"
                        value={metric.target}
                        onChange={(event) => updateMetric(goal.id, metric.id, { target: Number(event.target.value) })}
                      />
                      <Input className="h-9" value={metric.unit} onChange={(event) => updateMetric(goal.id, metric.id, { unit: event.target.value })} />
                      <Button data-testid="metric-delete" aria-label="数値を削除" title="数値を削除" size="icon" variant="ghost" onClick={() => deleteMetric(goal.id, metric.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-2 flex-1 rounded-full bg-white dark:bg-slate-950">
                        <div className="h-2 rounded-full bg-success" style={{ width: `${rate}%` }} />
                      </div>
                      <span className="w-12 text-right text-xs font-semibold">{rate}%</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {metric.current.toLocaleString()} / {metric.target.toLocaleString()}
                      {metric.unit}
                    </p>
                  </div>
                );
              })}
              <Button data-testid="metric-add" size="sm" variant="ghost" onClick={() => addMetric(goal.id)}>
                <Plus className="h-4 w-4" />
                数値
              </Button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {goal.branches.map((branch) => (
                <div key={branch.id} className="rounded-panel bg-slate-50 p-3 dark:bg-white/5">
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-slate-400" />
                    <Input className="h-9 font-semibold" value={branch.title} onChange={(event) => updateBranch(goal.id, branch.id, { title: event.target.value })} />
                    <Button data-testid="branch-delete" aria-label="枝を削除" title="枝を削除" size="icon" variant="ghost" onClick={() => deleteBranch(goal.id, branch.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {branch.tasks.map((task, taskIndex) => (
                      <div key={`${branch.id}-${taskIndex}`} className="flex items-center gap-2">
                        <Input className="h-9" value={task} onChange={(event) => updateTask(goal.id, branch.id, taskIndex, event.target.value)} />
                        <Button data-testid="task-delete" aria-label="小タスクを削除" title="小タスクを削除" size="icon" variant="ghost" onClick={() => deleteTask(goal.id, branch.id, taskIndex)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button data-testid="task-add" className="mt-3" size="sm" variant="ghost" onClick={() => addTask(goal.id, branch.id)}>
                    <Plus className="h-4 w-4" />
                    小タスク
                  </Button>
                </div>
              ))}
            </div>
            <Button data-testid="branch-add" className="mt-3" size="sm" variant="ghost" onClick={() => addBranch(goal.id)}>
              <Plus className="h-4 w-4" />
              枝
            </Button>
          </div>
          );
        })}
        {goals.length === 0 ? <p className="rounded-panel bg-slate-50 p-4 text-sm text-slate-500 dark:bg-white/5">目標はまだありません。</p> : null}
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

function uid(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function migrateGoalMaps(savedGoals: GoalMap[]) {
  return savedGoals.map((goal) => {
    const isLegacyDefaultCompany = goal.id === "company" && goal.goal === "8年で10億";
    if (!isLegacyDefaultCompany) return goal;

    return {
      ...goal,
      goal: primaryGoalText,
      metrics: goal.metrics.map((metric) =>
        metric.id === "company-revenue" && metric.target === 1000000000 ? { ...metric, target: primaryRevenueTarget } : metric,
      ),
    };
  });
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
