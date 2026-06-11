"use client";

import { AlertTriangle, BellRing, BriefcaseBusiness, CalendarCheck, CheckCircle2, Clock3, ShieldCheck, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { AssigneeBadge } from "@/components/domain/assignee-badge";
import { LoadingPanel } from "@/components/domain/loading";
import { PageHeader } from "@/components/domain/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { displayTaskTitle } from "@/lib/data/task-flags";
import { useScopedQuery } from "@/lib/hooks/use-api";
import { useAppStore } from "@/lib/store/app-store";
import type { DashboardSummary, Employee, Notification as AppNotification, Project, Task } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

export default function AdminPage() {
  const session = useAppStore((state) => state.session);
  const tasks = useScopedQuery<Task[]>(["admin-tasks"], "/api/tasks", { sort: "dueDate" });
  const employees = useScopedQuery<Employee[]>(["admin-employees"], "/api/employees");
  const projects = useScopedQuery<Project[]>(["admin-projects"], "/api/projects");
  const notifications = useScopedQuery<AppNotification[]>(["admin-notifications"], "/api/notifications");
  const dashboard = useScopedQuery<DashboardSummary>(["admin-dashboard"], "/api/dashboard");

  if (session?.role !== "admin") {
    return (
      <>
        <PageHeader title="管理" description="この画面は管理者アカウント専用です。" kicker="ADMIN" />
        <Card>
          <CardContent className="p-5 text-sm font-bold text-slate-500 dark:text-slate-200">管理者アカウントでログインすると表示されます。</CardContent>
        </Card>
      </>
    );
  }

  if (tasks.isLoading || employees.isLoading || projects.isLoading || notifications.isLoading || dashboard.isLoading) return <LoadingPanel label="管理画面を準備中" />;

  const taskList = tasks.data ?? [];
  const employeeList = employees.data ?? [];
  const projectList = projects.data ?? [];
  const noticeList = notifications.data ?? [];
  const activeTasks = taskList.filter((task) => task.status !== "done");
  const todayTasks = activeTasks.filter((task) => dayDistance(task.dueDate) === 0);
  const delayedTasks = activeTasks.filter((task) => dayDistance(task.dueDate) < 0);
  const urgentTasks = activeTasks.filter((task) => ["urgent", "high"].includes(task.priority));
  const completedToday = taskList
    .filter((task) => task.status === "done" && dayDistance(task.updatedAt) === 0)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const completedNotices = noticeList.filter((notice) => notice.type === "admin" && !notice.readAt);
  const teamRows = employeeList
    .map((employee) => {
      const assigned = activeTasks.filter((task) => [task.primaryAssigneeId, ...task.assigneeIds].includes(employee.id));
      return {
        employee,
        total: assigned.length,
        today: assigned.filter((task) => dayDistance(task.dueDate) === 0).length,
        urgent: assigned.filter((task) => ["urgent", "high"].includes(task.priority)).length,
        delayed: assigned.filter((task) => dayDistance(task.dueDate) < 0).length,
        topTask: [...assigned].sort((a, b) => b.aiPriorityScore - a.aiPriorityScore)[0] ?? null,
      };
    })
    .sort((a, b) => b.delayed - a.delayed || b.urgent - a.urgent || b.today - a.today || b.total - a.total);

  return (
    <>
      <PageHeader title="管理" description="チーム全体のタスク、完了通知、遅延リスクだけを管理者用にまとめます。" kicker="ADMIN" />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <AdminMetric label="未完了" value={activeTasks.length} icon={CheckCircle2} tone="blue" />
        <AdminMetric label="本日期限" value={todayTasks.length} icon={CalendarCheck} tone="gold" />
        <AdminMetric label="緊急" value={urgentTasks.length} icon={AlertTriangle} tone="red" />
        <AdminMetric label="遅延" value={delayedTasks.length} icon={Clock3} tone={delayedTasks.length ? "red" : "green"} />
        <AdminMetric label="今日完了" value={completedToday.length} icon={CheckCircle2} tone="green" />
        <AdminMetric label="完了通知" value={completedNotices.length} icon={BellRing} tone={completedNotices.length ? "gold" : "green"} />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-accent" />
              担当者別
            </CardTitle>
            <Link href="/tasks?segment=all">
              <Button size="sm" variant="ghost">全タスク</Button>
            </Link>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {teamRows.map((row) => (
              <div key={row.employee.id} className="rounded-panel bg-slate-50 p-3 dark:bg-white/5">
                <div className="flex items-center justify-between gap-3">
                  <AssigneeBadge employee={row.employee} />
                  <Link href={`/tasks?segment=all&assigneeId=${row.employee.id}&scope=team`} className="text-xs font-extrabold text-accent">
                    開く
                  </Link>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  <MiniStat label="全体" value={row.total} />
                  <MiniStat label="今日" value={row.today} />
                  <MiniStat label="緊急" value={row.urgent} danger={row.urgent > 0} />
                  <MiniStat label="遅延" value={row.delayed} danger={row.delayed > 0} />
                </div>
                <p className="mt-3 truncate text-xs font-bold text-slate-500 dark:text-slate-300">{row.topTask ? displayTaskTitle(row.topTask) : "未完了なし"}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-accent" />
              管理メニュー
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <AdminLink href="/employees" icon={Users} title="社員を見る" body="担当者別のタスク・勤怠・目標を確認" />
            <AdminLink href="/projects" icon={BriefcaseBusiness} title="案件を見る" body={`進行中 ${projectList.length} 件`} />
            <AdminLink href="/notifications?filter=unread" icon={BellRing} title="通知を見る" body={`未読 ${noticeList.filter((notice) => !notice.readAt).length} 件`} />
            <AdminLink href="/test" icon={ShieldCheck} title="テスト状況" body="社員テストのヘルスチェック確認" />
          </CardContent>
        </Card>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <TaskListCard title="要確認タスク" tasks={[...delayedTasks, ...urgentTasks].filter(uniqueById).slice(0, 6)} />
        <TaskListCard title="今日完了" tasks={completedToday.slice(0, 6)} emptyText="今日完了したタスクはまだありません。" />
        <NoticeListCard notices={completedNotices.slice(0, 6)} />
      </section>
    </>
  );
}

function AdminMetric({ label, value, icon: Icon, tone }: { label: string; value: number; icon: LucideIcon; tone: "blue" | "gold" | "green" | "red" }) {
  const toneClass = {
    blue: "bg-sky-50 text-sky-700 dark:bg-sky-400/15 dark:text-sky-100",
    gold: "bg-amber-50 text-amber-700 dark:bg-amber-400/15 dark:text-amber-100",
    green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-100",
    red: "bg-red-50 text-red-700 dark:bg-red-400/15 dark:text-red-100",
  }[tone];
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div>
          <p className="text-xs font-extrabold text-slate-500 dark:text-slate-300">{label}</p>
          <p className="mt-2 text-3xl font-extrabold text-[#0B1226] dark:text-white">{value}</p>
        </div>
        <span className={cn("grid h-10 w-10 place-items-center rounded-panel", toneClass)}>
          <Icon className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className={cn("rounded-panel px-2 py-2 text-center text-xs font-extrabold", danger ? "bg-red-50 text-red-700 dark:bg-red-400/15 dark:text-red-100" : "bg-white text-slate-600 dark:bg-white/5 dark:text-slate-100")}>
      <p className="text-[10px] opacity-75">{label}</p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}

function AdminLink({ href, icon: Icon, title, body }: { href: string; icon: LucideIcon; title: string; body: string }) {
  return (
    <Link href={href} className="flex min-h-16 items-center gap-3 rounded-panel bg-slate-50 p-3 ring-1 ring-border dark:bg-white/5 dark:ring-white/10">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#0B1226] dark:bg-[#050816] dark:text-white">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block font-extrabold text-[#0B1226] dark:text-white">{title}</span>
        <span className="block truncate text-xs font-bold text-slate-500 dark:text-slate-300">{body}</span>
      </span>
    </Link>
  );
}

function TaskListCard({ title, tasks, emptyText = "要確認タスクはありません。" }: { title: string; tasks: Task[]; emptyText?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.length ? tasks.map((task) => (
          <Link key={task.id} href={`/tasks?segment=all&taskId=${task.id}`} className="block rounded-panel bg-slate-50 p-3 dark:bg-white/5">
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate font-extrabold text-[#0B1226] dark:text-white">{displayTaskTitle(task)}</p>
              <Badge tone={dayDistance(task.dueDate) < 0 ? "red" : ["urgent", "high"].includes(task.priority) ? "amber" : "slate"}>{formatDate(task.dueDate)}</Badge>
            </div>
          </Link>
        )) : <p className="rounded-panel bg-slate-50 p-4 text-sm font-bold text-slate-500 dark:bg-white/5 dark:text-slate-200">{emptyText}</p>}
      </CardContent>
    </Card>
  );
}

function NoticeListCard({ notices }: { notices: AppNotification[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>管理者通知</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {notices.length ? notices.map((notice) => (
          <Link key={notice.id} href={notice.targetHref ?? "/notifications"} className="block rounded-panel bg-slate-50 p-3 dark:bg-white/5">
            <p className="font-extrabold text-[#0B1226] dark:text-white">{notice.title}</p>
            <p className="mt-1 line-clamp-2 text-sm font-medium text-slate-500 dark:text-slate-300">{notice.body}</p>
          </Link>
        )) : <p className="rounded-panel bg-slate-50 p-4 text-sm font-bold text-slate-500 dark:bg-white/5 dark:text-slate-200">未読の管理者通知はありません。</p>}
      </CardContent>
    </Card>
  );
}

function uniqueById(task: Task, index: number, list: Task[]) {
  return list.findIndex((item) => item.id === task.id) === index;
}

function dayDistance(value: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(value);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}
