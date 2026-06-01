"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Coffee, DoorOpen, LogIn, LogOut, MapPin, QrCode, RefreshCcw, Users } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/domain/avatar";
import { LoadingPanel } from "@/components/domain/loading";
import { PageHeader } from "@/components/domain/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { attendanceEventLabels, attendanceStatusLabels } from "@/lib/data/labels";
import { apiFetch, useScopedQuery } from "@/lib/hooks/use-api";
import { useAppStore } from "@/lib/store/app-store";
import type { AttendanceEvent, AttendanceLog, Employee, LeaveRequest } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

type AttendancePayload = {
  employees: Employee[];
  logs: AttendanceLog[];
  leaveRequests: LeaveRequest[];
};

const actions: Array<{ event: AttendanceEvent; label: string; icon: typeof LogIn }> = [
  { event: "clock_in", label: "出勤", icon: LogIn },
  { event: "clock_out", label: "退勤", icon: LogOut },
  { event: "break_start", label: "休憩開始", icon: Coffee },
  { event: "break_end", label: "休憩終了", icon: RefreshCcw },
  { event: "out", label: "外出", icon: DoorOpen },
  { event: "return", label: "戻り", icon: MapPin },
  { event: "meeting", label: "会議", icon: Users },
];

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const session = useAppStore((state) => state.session);
  const attendance = useScopedQuery<AttendancePayload>(["attendance"], "/api/attendance");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(session?.employeeId ?? "");

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

  if (attendance.isLoading || !attendance.data) return <LoadingPanel label="勤怠を読み込み中" />;

  const targetEmployee = attendance.data.employees.find((employee) => employee.id === (selectedEmployeeId || session?.employeeId)) ?? attendance.data.employees[0];

  return (
    <>
      <PageHeader title="勤怠管理" description="Google Sheets連携を前提に、Phase1ではローカル打刻とQR打刻導線を実装しています。" />

      <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>打刻</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedEmployeeId || targetEmployee?.id} onChange={(event) => setSelectedEmployeeId(event.target.value)}>
                {attendance.data.employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>{employee.name}</option>
                ))}
              </Select>

              {targetEmployee ? (
                <div className="flex items-center gap-3 rounded-panel bg-slate-50 p-3 dark:bg-white/5">
                  <Avatar label={targetEmployee.avatarUrl} />
                  <div>
                    <p className="font-semibold">{targetEmployee.name}</p>
                    <p className="text-sm text-slate-500">{targetEmployee.position}</p>
                  </div>
                  <Badge className="ml-auto" tone={targetEmployee.attendanceStatus === "working" ? "green" : "blue"}>
                    {attendanceStatusLabels[targetEmployee.attendanceStatus]}
                  </Badge>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {actions.map((action) => (
                  <Button key={action.event} variant={action.event === "clock_out" ? "danger" : "primary"} onClick={() => clock.mutate(action.event)} disabled={clock.isPending}>
                    <action.icon className="h-4 w-4" />
                    {action.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                QRコード打刻
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mx-auto grid aspect-square max-w-56 grid-cols-5 gap-1 rounded-panel border border-border bg-white p-4">
                {Array.from({ length: 25 }).map((_, index) => (
                  <span key={index} className={(index + Math.floor(index / 5)) % 3 === 0 ? "rounded-sm bg-slate-950" : "rounded-sm bg-slate-100"} />
                ))}
              </div>
              <p className="mt-3 text-center text-sm text-slate-500">Phase2で実QR読み取りと打刻URLを接続します。</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>社員別勤務履歴</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {attendance.data.logs.slice(0, 12).map((log) => {
                const employee = attendance.data?.employees.find((item) => item.id === log.employeeId);
                return (
                  <div key={log.id} className="flex items-center justify-between gap-3 rounded-panel border border-border p-3 text-sm">
                    <div>
                      <p className="font-medium">{employee?.name ?? "社員"}</p>
                      <p className="mt-1 text-slate-500">{attendanceEventLabels[log.eventType]} / {log.source}</p>
                    </div>
                    <span className="text-right text-slate-500">{formatDateTime(log.recordedAt)}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>残り有給管理</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {attendance.data.employees.map((employee) => (
                <div key={employee.id} className="rounded-panel bg-slate-50 p-3 dark:bg-white/5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{employee.name}</p>
                    <Badge tone="green">{employee.leaveBalanceDays}日</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">申請中 {attendance.data?.leaveRequests.filter((request) => request.employeeId === employee.id && request.status === "pending").length ?? 0}件</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}

