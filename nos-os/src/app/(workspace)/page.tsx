"use client";

import Image from "next/image";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarCheck,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  Mic,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { BrandMark, nosBrand } from "@/components/domain/brand";
import { LoadingPanel } from "@/components/domain/loading";
import { MetricCard } from "@/components/domain/metric-card";
import { PageHeader } from "@/components/domain/page-header";
import { ProjectCard } from "@/components/domain/project-card";
import { TaskCard } from "@/components/domain/task-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { attendanceStatusLabels } from "@/lib/data/labels";
import { apiFetch, useScopedQuery } from "@/lib/hooks/use-api";
import { useAppStore } from "@/lib/store/app-store";
import type { DashboardSummary, Employee, Project, Task } from "@/lib/types";
import { cn, formatCurrency, formatDateTime, formatTime } from "@/lib/utils";

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
  const revenueRate = Math.min(100, Math.round((plan.revenue.weightedForecast / plan.revenue.monthTarget) * 100));
  const nextTask = plan.nextTasks[0];

  return (
    <>
      <PageHeader
        title={session?.role === "admin" ? "今日の司令室" : "今日やること"}
        description="スマホで開いた瞬間に、今やること、次にやること、遅れた時のまずさ、予定と売上が見えるようにしています。"
      />

      <section className="mb-5 grid gap-3 md:grid-cols-4">
        <QuickStep
          tone={plan.riskLevel === "danger" ? "red" : "blue"}
          label="1 今やる"
          title={plan.focusTask?.title ?? "未完了タスクなし"}
          body={plan.riskLevel === "danger" ? "赤は先に処理" : "まず1つ完了"}
        />
        <QuickStep
          tone="green"
          label="2 終わったら"
          title={nextTask?.title ?? "通知を確認"}
          body="次の一手だけ見る"
        />
        <QuickStep
          tone={plan.riskLevel === "safe" ? "green" : "amber"}
          label="3 リスク"
          title={plan.riskLevel === "danger" ? "遅れると危険" : plan.riskLevel === "watch" ? "今日中に調整" : "順調"}
          body={plan.ifNotDoneImpact}
        />
        <QuickExportStep href={plan.calendarExportUrl} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden">
          <CardContent className="grid gap-4 p-4 sm:grid-cols-[120px_1fr]">
            <div className="space-y-3">
              <BrandMark className="h-14 w-14" />
              <div className="relative mx-auto h-32 w-28 overflow-hidden rounded-panel bg-blue-50 sm:mx-0">
                <Image src="/assistant/nos-secretary-bot.png" alt="Nos OS AI secretary bot" fill className="object-cover object-center" sizes="112px" priority />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={plan.riskLevel === "danger" ? "red" : plan.riskLevel === "watch" ? "amber" : "green"}>
                  {plan.riskLevel === "danger" ? "今すぐ" : plan.riskLevel === "watch" ? "注意" : "安全"}
                </Badge>
                <span className="text-sm text-slate-500">{formatDateTime(plan.generatedAt)} 更新</span>
                <span className="text-sm font-medium text-accent">{nosBrand.companyName}</span>
              </div>
              <h2 className="mt-3 text-2xl font-bold leading-tight">{plan.focusTask?.title ?? "今日は大きな未完了タスクがありません"}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{plan.riskMessage}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div className="rounded-panel bg-slate-50 p-3 dark:bg-white/5">
                  <p className="text-xs text-slate-500">終わったら</p>
                  <p className="mt-1 text-sm font-medium leading-6">{plan.ifDoneNext}</p>
                </div>
                <div className="rounded-panel bg-red-50 p-3 text-red-700 dark:bg-red-500/10 dark:text-red-200">
                  <p className="text-xs">終わらなかったら</p>
                  <p className="mt-1 text-sm font-medium leading-6">{plan.ifNotDoneImpact}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {plan.focusTask ? (
                  <Button disabled={completeTask.isPending} onClick={() => completeTask.mutate(plan.focusTask!.id)}>
                    <Check className="h-4 w-4" />
                    完了にする
                  </Button>
                ) : null}
                <a href={plan.calendarExportUrl}>
                  <Button variant="secondary">
                    <Download className="h-4 w-4" />
                    カレンダー出力
                  </Button>
                </a>
                <Link href="/assistant">
                  <Button variant="ghost">
                    <Mic className="h-4 w-4" />
                    秘書に聞く
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              売上メーター
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">見込み / 目標</p>
                <p className="mt-1 text-2xl font-bold">{formatCurrency(plan.revenue.weightedForecast)}</p>
              </div>
              <Badge tone={revenueRate >= 80 ? "green" : revenueRate >= 55 ? "amber" : "red"}>{revenueRate}%</Badge>
            </div>
            <div className="mt-4 h-3 rounded-full bg-slate-100 dark:bg-white/10">
              <div className="h-3 rounded-full bg-success" style={{ width: `${revenueRate}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <SmallInfo label="自分の貢献" value={formatCurrency(plan.revenue.personalContribution)} />
              <SmallInfo label="パイプライン" value={formatCurrency(plan.revenue.activePipeline)} />
            </div>
            <div className="mt-3 space-y-2">
              {plan.revenue.closingHints.slice(0, 2).map((hint) => (
                <p key={hint} className="rounded-panel bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-white/5 dark:text-slate-300">
                  {hint}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="今日のタスク" value={dashboard.data.todayTasks.length} helper="本日期限" icon={CalendarCheck} tone="blue" />
        <MetricCard label="緊急タスク" value={dashboard.data.urgentTasks.length} helper="優先度: 緊急" icon={AlertTriangle} tone="red" />
        <MetricCard label="遅延タスク" value={dashboard.data.delayedTasks.length} helper="期限超過" icon={Clock3} tone={dashboard.data.delayedTasks.length ? "red" : "green"} />
        <MetricCard
          label={session?.role === "admin" ? "出勤中" : "残り有給"}
          value={session?.role === "admin" ? `${dashboard.data.employeeStatus.working}/${statusTotal}` : `${dashboard.data.leaveBalanceDays ?? "-"}日`}
          helper={session?.role === "admin" ? "社員状況" : "有給残日数"}
          icon={session?.role === "admin" ? Users : CheckCircle2}
          tone="green"
        />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>次にやること</CardTitle>
              <Link href="/tasks" className="text-sm font-medium text-accent">
                すべて見る
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
            <CardHeader>
              <CardTitle>今日の予定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {plan.schedule.map((block) => (
                <div key={block.id} className="grid grid-cols-[76px_1fr_auto] items-center gap-3 rounded-panel border border-border p-3 text-sm">
                  <div className="font-semibold text-slate-500">{formatTime(block.start)}</div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{block.title}</p>
                    <p className="text-xs text-slate-500">リスク {block.risk}</p>
                  </div>
                  <Badge tone={block.status === "missed" ? "red" : block.status === "active" ? "blue" : "slate"}>
                    {block.status === "missed" ? "遅れ" : block.status === "active" ? "今" : "予定"}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>現在担当案件</CardTitle>
              <Link href="/projects" className="text-sm font-medium text-accent">
                案件一覧
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

function SmallInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-panel bg-slate-50 p-3 dark:bg-white/5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 truncate font-semibold">{value}</p>
    </div>
  );
}

function QuickStep({
  label,
  title,
  body,
  tone,
}: {
  label: string;
  title: string;
  body: string;
  tone: "blue" | "green" | "red" | "amber";
}) {
  const toneClass = {
    blue: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-100",
    green: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-100",
    red: "border-red-200 bg-red-50 text-red-900 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-100",
    amber: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-100",
  }[tone];

  return (
    <div className={cn("rounded-panel border p-4", toneClass)}>
      <p className="text-xs font-bold uppercase">{label}</p>
      <p className="mt-2 line-clamp-2 font-semibold leading-6">{title}</p>
      <p className="mt-1 line-clamp-2 text-xs leading-5 opacity-80">{body}</p>
    </div>
  );
}

function QuickExportStep({ href }: { href: string }) {
  return (
    <a
      href={href}
      className={cn(
        "flex min-h-[120px] flex-col rounded-panel border border-slate-200 bg-white p-4 text-slate-900 transition hover:-translate-y-0.5 hover:shadow-soft",
        "dark:border-white/10 dark:bg-white/5 dark:text-white",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase">4 予定出力</p>
        <Download className="h-4 w-4 text-accent" />
      </div>
      <p className="mt-2 line-clamp-2 font-semibold leading-6">今日の予定をICSで出力</p>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-300">iPhone / Google Calendarへ</p>
    </a>
  );
}
