"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Activity, BriefcaseBusiness, Clock3, ShieldCheck, Target } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/domain/avatar";
import { LoadingPanel } from "@/components/domain/loading";
import { MetricCard } from "@/components/domain/metric-card";
import { PageHeader } from "@/components/domain/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { attendanceStatusLabels, roleLabels } from "@/lib/data/labels";
import { apiFetch, useScopedQuery } from "@/lib/hooks/use-api";
import { useAppStore } from "@/lib/store/app-store";
import type { Employee, EmploymentType, Role, User } from "@/lib/types";

const employmentLabels: Record<EmploymentType, string> = {
  full_time: "正社員",
  part_time: "短時間",
  contractor: "業務委託",
};

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const session = useAppStore((state) => state.session);
  const employees = useScopedQuery<Employee[]>(["employees"], "/api/employees");
  const users = useScopedQuery<User[]>(["users"], "/api/users");

  const updateRole = useMutation({
    mutationFn: ({ userId, role, employmentType }: { userId: string; role: Role; employmentType: EmploymentType }) =>
      apiFetch<User>(`/api/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role, employmentType, actorRole: session?.role }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      void queryClient.invalidateQueries({ queryKey: ["employees"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  if (employees.isLoading || !employees.data) return <LoadingPanel label="社員情報を読み込み中" />;

  const userMap = new Map((users.data ?? []).map((user) => [user.employeeId, user]));
  const working = employees.data.filter((employee) => employee.attendanceStatus === "working").length;
  const delayed = employees.data.reduce((sum, employee) => sum + employee.taskStats.delayed, 0);

  return (
    <>
      <PageHeader title="社員管理" description="社員、営業、管理者の権限を管理できます。管理者にすると全案件と全タスクが見えます。" />

      <section className="mb-5 grid gap-3 sm:grid-cols-4">
        <MetricCard label="社員数" value={employees.data.length} icon={Activity} helper="登録プロフィール" tone="blue" />
        <MetricCard label="出勤中" value={working} icon={Clock3} helper="現在ステータス" tone="green" />
        <MetricCard label="遅延タスク" value={delayed} icon={Target} helper="全社員合計" tone={delayed ? "red" : "green"} />
        <MetricCard label="管理者" value={(users.data ?? []).filter((user) => user.role === "admin").length} icon={ShieldCheck} helper="全体閲覧可" tone="slate" />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {employees.data.map((employee) => {
          const user = userMap.get(employee.id);
          return (
            <Card key={employee.id} className="h-full">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar label={employee.avatarUrl} />
                  <div className="min-w-0">
                    <p className="font-semibold">{employee.name}</p>
                    <p className="text-sm text-slate-500">{employee.position}</p>
                    <p className="mt-1 text-xs text-slate-500">{employee.department}</p>
                  </div>
                  <Badge className="ml-auto" tone={employee.attendanceStatus === "working" ? "green" : "blue"}>
                    {attendanceStatusLabels[employee.attendanceStatus]}
                  </Badge>
                </div>

                <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-500">{employee.bio}</p>

                {user ? (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <Select
                      value={user.role}
                      onChange={(event) => updateRole.mutate({ userId: user.id, role: event.target.value as Role, employmentType: user.employmentType })}
                    >
                      {Object.entries(roleLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </Select>
                    <Select
                      value={user.employmentType}
                      onChange={(event) => updateRole.mutate({ userId: user.id, role: user.role, employmentType: event.target.value as EmploymentType })}
                    >
                      {Object.entries(employmentLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </Select>
                  </div>
                ) : null}

                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                  <SmallStat label="担当" value={employee.assignedProjectIds.length} />
                  <SmallStat label="完了" value={employee.taskStats.completed} />
                  <SmallStat label="有給" value={employee.leaveBalanceDays} />
                </div>
                <Link href={`/employees/${employee.id}`} className="mt-4 flex items-center gap-2 text-sm text-accent">
                  <BriefcaseBusiness className="h-4 w-4" />
                  プロフィールへ
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </>
  );
}

function SmallStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-panel bg-slate-50 px-2 py-3 dark:bg-white/5">
      <p className="font-bold">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}
