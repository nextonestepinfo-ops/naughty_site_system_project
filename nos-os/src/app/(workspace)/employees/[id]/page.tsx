"use client";

import { useQuery } from "@tanstack/react-query";
import { Brain, CalendarClock, CheckCircle2, Target, TrendingUp } from "lucide-react";
import { useParams } from "next/navigation";
import { Avatar } from "@/components/domain/avatar";
import { LoadingPanel } from "@/components/domain/loading";
import { PageHeader } from "@/components/domain/page-header";
import { ProjectCard } from "@/components/domain/project-card";
import { TaskCard } from "@/components/domain/task-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { attendanceEventLabels, attendanceStatusLabels } from "@/lib/data/labels";
import { apiFetch, useScopedPath, useScopedQuery } from "@/lib/hooks/use-api";
import { useAppStore } from "@/lib/store/app-store";
import type { DashboardSummary, EmployeeProfile, RevenueSummary } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function EmployeeProfilePage() {
  const params = useParams<{ id: string }>();
  const session = useAppStore((state) => state.session);
  const path = useScopedPath(`/api/employees/${params.id}`);
  const profile = useQuery({ queryKey: ["employee", path], queryFn: () => apiFetch<EmployeeProfile>(path) });
  const dashboard = useScopedQuery<DashboardSummary>(["dashboard"], "/api/dashboard");

  if (profile.isLoading || !profile.data) return <LoadingPanel label="社員プロフィールを読み込み中" />;

  const employee = profile.data;
  const revenue = session?.employeeId === employee.id ? dashboard.data?.dailyPlan.revenue : null;

  return (
    <>
      <PageHeader title={employee.name} description={employee.bio} />

      <section className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
        <div className="space-y-5">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <Avatar label={employee.avatarUrl} className="h-16 w-16 text-base" />
                <div>
                  <p className="text-lg font-bold">{employee.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{employee.position}</p>
                  {employee.department ? <p className="text-sm text-slate-500">{employee.department}</p> : null}
                  <Badge className="mt-3" tone={employee.attendanceStatus === "working" ? "green" : "blue"}>
                    {attendanceStatusLabels[employee.attendanceStatus]}
                  </Badge>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <Info label="残り有給" value={`${employee.leaveBalanceDays}日`} />
                <Info label="完了タスク" value={`${employee.taskStats.completed}/${employee.taskStats.total}`} />
                <Info label="遅延" value={`${employee.taskStats.delayed}`} />
                <Info label="緊急" value={`${employee.taskStats.urgent}`} />
              </div>
            </CardContent>
          </Card>

          {revenue ? <RevenueMeter revenue={revenue} /> : null}

          <Card>
            <CardHeader>
              <CardTitle>スキル</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {employee.skills.map((skill) => (
                <div key={skill.id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{skill.name}</span>
                    <span>Lv.{skill.level}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-white/10">
                    <div className="h-2 rounded-full bg-success" style={{ width: `${skill.level * 20}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4" />
                勤怠履歴
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {employee.attendanceLogs.slice(0, 6).map((log) => (
                <div key={log.id} className="flex items-center justify-between rounded-panel bg-slate-50 px-3 py-2 text-sm dark:bg-white/5">
                  <span>{attendanceEventLabels[log.eventType]}</span>
                  <span className="text-slate-500">{formatDateTime(log.recordedAt)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>担当案件</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {employee.assignedProjects.map((project) => (
                <ProjectCard key={project.id} project={project} owner={employee} />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>タスク統計と現在タスク</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {employee.tasks.slice(0, 5).map((task) => (
                <TaskCard key={task.id} task={task} assignee={employee} project={employee.assignedProjects.find((project) => project.id === task.projectId)} />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                目標管理
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {employee.goals.map((goal) => (
                <div key={goal.id} className="rounded-panel border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{goal.title}</p>
                    <Badge tone={goal.status === "at_risk" ? "red" : goal.status === "done" ? "green" : "blue"}>{goal.progress}%</Badge>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-white/10">
                    <div className="h-2 rounded-full bg-accent" style={{ width: `${goal.progress}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-accent" />
                AI分析
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {employee.aiAnalysis.length ? (
                employee.aiAnalysis.map((summary) => (
                  <div key={summary.id} className="rounded-panel bg-blue-50 p-3 text-sm dark:bg-blue-500/10">
                    <div className="mb-1 flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      {summary.title}
                    </div>
                    <p className="leading-6 text-slate-600 dark:text-slate-300">{summary.summary}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">AI分析はタスク実績が増えると表示されます。</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-panel bg-slate-50 p-3 dark:bg-white/5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function RevenueMeter({ revenue }: { revenue: RevenueSummary }) {
  const rate = Math.min(100, Math.round((revenue.weightedForecast / revenue.monthTarget) * 100));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-success" />
          売上
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">見込み</p>
            <p className="mt-1 text-2xl font-bold">{formatCurrency(revenue.weightedForecast)}</p>
          </div>
          <Badge tone={rate >= 80 ? "green" : rate >= 55 ? "amber" : "red"}>{rate}%</Badge>
        </div>
        <div className="mt-4 h-3 rounded-full bg-slate-100 dark:bg-white/10">
          <div className="h-3 rounded-full bg-success" style={{ width: `${rate}%` }} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <Info label="自分" value={formatCurrency(revenue.personalContribution)} />
          <Info label="候補" value={formatCurrency(revenue.activePipeline)} />
        </div>
      </CardContent>
    </Card>
  );
}
