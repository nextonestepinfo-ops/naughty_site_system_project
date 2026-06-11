"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Coffee, DoorOpen, LogIn, LogOut, MapPin, RefreshCcw, UserX, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/domain/avatar";
import { LoadingPanel } from "@/components/domain/loading";
import { PageHeader } from "@/components/domain/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { attendanceEventLabels, attendanceStatusLabels } from "@/lib/data/labels";
import { apiFetch, useScopedQuery } from "@/lib/hooks/use-api";
import { useAppStore } from "@/lib/store/app-store";
import type { AttendanceEvent, AttendanceLog, Employee, LeaveRequest } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";

type AttendancePayload = {
  employees: Employee[];
  logs: AttendanceLog[];
  leaveRequests: LeaveRequest[];
};

const actions: Array<{ event: AttendanceEvent; label: string; icon: typeof LogIn; primary?: boolean; danger?: boolean }> = [
  { event: "clock_in", label: "出勤", icon: LogIn, primary: true },
  { event: "clock_out", label: "退勤", icon: LogOut, primary: true, danger: true },
  { event: "break_start", label: "休憩入り", icon: Coffee },
  { event: "break_end", label: "休憩戻り", icon: RefreshCcw },
  { event: "out", label: "外出", icon: DoorOpen },
  { event: "return", label: "帰社", icon: MapPin },
  { event: "meeting", label: "打合せ", icon: Users },
  { event: "absent", label: "欠勤", icon: UserX, danger: true },
];

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const session = useAppStore((state) => state.session);
  const attendance = useScopedQuery<AttendancePayload>(["attendance"], "/api/attendance");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(session?.employeeId ?? "");
  const [now, setNow] = useState(new Date());
  const [otherActionsOpen, setOtherActionsOpen] = useState(false);
  const isAdmin = session?.role === "admin";

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isAdmin && session?.employeeId) setSelectedEmployeeId(session.employeeId);
  }, [isAdmin, session?.employeeId]);

  const clock = useMutation({
    mutationFn: (eventType: AttendanceEvent) =>
      apiFetch<AttendanceLog>("/api/attendance/clock", {
        method: "POST",
        body: JSON.stringify({
          employeeId: selectedEmployeeId || session?.employeeId,
          eventType,
          source: "manual",
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["attendance"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  if (attendance.isLoading || !attendance.data) return <LoadingPanel label="勤怠を準備中" />;

  const targetEmployeeId = isAdmin ? selectedEmployeeId || session?.employeeId : session?.employeeId;
  const targetEmployee = attendance.data.employees.find((employee) => employee.id === targetEmployeeId) ?? attendance.data.employees[0];
  const todayLogs = attendance.data.logs.filter((log) => isToday(log.recordedAt) && (!targetEmployee || log.employeeId === targetEmployee.id));
  const teamStatus = {
    working: attendance.data.employees.filter((employee) => employee.attendanceStatus === "working").length,
    break: attendance.data.employees.filter((employee) => employee.attendanceStatus === "break").length,
    out: attendance.data.employees.filter((employee) => employee.attendanceStatus === "out" || employee.attendanceStatus === "meeting").length,
    off: attendance.data.employees.filter((employee) => employee.attendanceStatus === "off" || employee.attendanceStatus === "absent").length,
  };

  return (
    <>
      <PageHeader title="勤怠" description="出勤、退勤、休憩、外出をスマホからすぐ記録します。" kicker="ATTENDANCE" />

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <div className="h-2 bg-[#0B1226]" />
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="ios-kicker">LIVE CLOCK</p>
                  <p className="mt-1 text-[54px] font-extrabold leading-none text-[#0B1226] dark:text-white">{formatClock(now)}</p>
                </div>
                {targetEmployee ? <StatusPill status={targetEmployee.attendanceStatus} /> : null}
              </div>

              {isAdmin ? (
                <Select value={selectedEmployeeId || targetEmployee?.id} onChange={(event) => setSelectedEmployeeId(event.target.value)}>
                  {attendance.data.employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>{employee.name}</option>
                  ))}
                </Select>
              ) : null}

              {targetEmployee ? (
                <div className="flex items-center gap-3 rounded-panel bg-slate-50 p-3 dark:bg-white/5">
                  <Avatar label={targetEmployee.avatarUrl || targetEmployee.name.slice(0, 1)} />
                  <div className="min-w-0">
                    <p className="truncate font-extrabold text-[#0B1226] dark:text-white">{targetEmployee.name}</p>
                    <p className="truncate text-sm font-medium text-slate-500 dark:text-slate-300">{targetEmployee.position}</p>
                  </div>
                  <Badge className="ml-auto" tone={targetEmployee.attendanceStatus === "working" ? "green" : "slate"}>
                    {attendanceStatusLabels[targetEmployee.attendanceStatus]}
                  </Badge>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-2">
                {actions.filter((action) => action.primary).map((action) => (
                  <Button
                    key={action.event}
                    className={cn(action.primary && "h-14 text-base")}
                    variant={action.danger ? "danger" : action.primary ? "secondary" : "ghost"}
                    onClick={() => clock.mutate(action.event)}
                    disabled={clock.isPending}
                  >
                    <action.icon className="h-4 w-4" />
                    {action.label}
                  </Button>
                ))}
              </div>
              <button
                className="flex h-11 w-full items-center justify-center rounded-panel bg-slate-100 text-sm font-extrabold text-[#0B1226] ring-1 ring-border dark:bg-white/10 dark:text-white dark:ring-white/10"
                type="button"
                onClick={() => setOtherActionsOpen((current) => !current)}
              >
                {otherActionsOpen ? "その他の打刻を閉じる" : "その他の打刻"}
              </button>
              {otherActionsOpen ? (
                <div className="grid grid-cols-2 gap-2">
                  {actions.filter((action) => !action.primary).map((action) => (
                    <Button
                      key={action.event}
                      variant={action.danger ? "danger" : "ghost"}
                      onClick={() => clock.mutate(action.event)}
                      disabled={clock.isPending}
                    >
                      <action.icon className="h-4 w-4" />
                      {action.label}
                    </Button>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          {isAdmin ? (
            <div className="grid grid-cols-2 gap-3">
              <TeamTile label="勤務中" value={teamStatus.working} tone="green" />
              <TeamTile label="休憩" value={teamStatus.break} />
              <TeamTile label="外出/打合せ" value={teamStatus.out} />
              <TeamTile label="退勤/欠勤" value={teamStatus.off} />
            </div>
          ) : null}
        </div>

        <div className="space-y-5">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-extrabold text-[#0B1226] dark:text-white">今日のタイムライン</p>
                  <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-300">{targetEmployee?.name ?? "社員"} の記録</p>
                </div>
                <Badge tone="amber">{todayLogs.length}件</Badge>
              </div>
              <div className="mt-4 space-y-0">
                {todayLogs.slice(0, 12).map((log, index) => (
                  <div key={log.id} className="relative grid grid-cols-[28px_1fr] gap-3 pb-4">
                    {index < todayLogs.length - 1 ? <span className="absolute left-[11px] top-6 h-full w-px bg-slate-200 dark:bg-white/10" /> : null}
                    <span className="relative z-10 mt-1 h-6 w-6 rounded-full border-4 border-white bg-[#E08F12] shadow-soft dark:border-[#050816]" />
                    <div className="rounded-panel bg-white p-3 ring-1 ring-border dark:bg-white/5 dark:ring-white/10">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-bold">{attendanceEventLabels[log.eventType]}</p>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-300">{new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit" }).format(new Date(log.recordedAt))}</span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-300">{formatDateTime(log.recordedAt)} / {log.source}</p>
                    </div>
                  </div>
                ))}
                {!todayLogs.length ? <p className="rounded-panel bg-slate-50 p-4 text-sm font-medium text-slate-500 dark:bg-white/5 dark:text-slate-300">今日の打刻はまだありません。</p> : null}
              </div>
            </CardContent>
          </Card>

          {isAdmin ? (
          <Card>
            <CardContent className="p-4">
              <p className="font-extrabold text-[#0B1226] dark:text-white">有給・申請状況</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {attendance.data.employees.map((employee) => (
                  <div key={employee.id} className="rounded-panel bg-slate-50 p-3 dark:bg-white/5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-bold">{employee.name}</p>
                      <Badge tone="green">{employee.leaveBalanceDays}日</Badge>
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-300">申請中 {attendance.data?.leaveRequests.filter((request) => request.employeeId === employee.id && request.status === "pending").length ?? 0}件</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          ) : null}
        </div>
      </section>
    </>
  );
}

function StatusPill({ status }: { status: Employee["attendanceStatus"] }) {
  const working = status === "working";
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-extrabold", working ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-100" : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-100")}>
      <span className={cn("h-2 w-2 rounded-full", working ? "bg-emerald-500" : "bg-slate-400")} />
      {attendanceStatusLabels[status]}
    </span>
  );
}

function TeamTile({ label, value, tone = "slate" }: { label: string; value: number; tone?: "green" | "slate" }) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-300">{label}</p>
        <p className={cn("mt-2 text-2xl font-extrabold", tone === "green" ? "text-emerald-600 dark:text-emerald-300" : "text-[#0B1226] dark:text-white")}>{value}</p>
      </CardContent>
    </Card>
  );
}

function formatClock(value: Date) {
  return new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit" }).format(value);
}

function isToday(value: string) {
  const target = new Date(value);
  const today = new Date();
  return target.getFullYear() === today.getFullYear() && target.getMonth() === today.getMonth() && target.getDate() === today.getDate();
}
