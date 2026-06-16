"use client";

import { useQuery } from "@tanstack/react-query";
import { FileText, History, Inbox, ListTodo } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { LoadingPanel } from "@/components/domain/loading";
import { PageHeader } from "@/components/domain/page-header";
import { TaskCard } from "@/components/domain/task-card";
import { Avatar } from "@/components/domain/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { projectStatusLabels } from "@/lib/data/labels";
import { apiFetch, useScopedPath } from "@/lib/hooks/use-api";
import type { ProjectDetail } from "@/lib/types";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

const tabs = [
  { id: "tasks", label: "タスク", icon: ListTodo },
  { id: "emails", label: "メール", icon: Inbox },
  { id: "history", label: "履歴", icon: History },
  { id: "files", label: "ファイル", icon: FileText },
] as const;

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const path = useScopedPath(`/api/projects/${params.id}`);
  const project = useQuery({ queryKey: ["project", path], queryFn: () => apiFetch<ProjectDetail>(path) });
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("tasks");

  if (project.isLoading || !project.data) return <LoadingPanel label="案件詳細を読み込み中" />;

  const data = project.data;

  return (
    <>
      <PageHeader title={data.name} description={data.notes} />

      <section className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>案件情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Info label="顧客" value={data.customer?.company ?? data.customerName} />
              <Info label="ステータス" value={projectStatusLabels[data.status]} />
              <Info label="開始日" value={formatDate(data.startDate)} />
              <Info label="納期" value={formatDate(data.dueDate)} />
              <Info label="案件金額" value={formatCurrency(data.budget)} />
              <div>
                <p className="text-xs text-slate-500">担当</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.members.map((member) => (
                    <div key={member.id} className="flex items-center gap-2 rounded-panel border border-border px-2 py-1">
                      <Avatar label={member.avatarUrl} className="h-7 w-7" />
                      <span>{member.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {tabs.map((item) => (
              <button
                key={item.id}
                className={`flex h-10 shrink-0 items-center gap-2 rounded-panel px-3 text-sm font-medium ${tab === item.id ? "bg-primary text-white dark:bg-white dark:text-slate-950" : "bg-card text-slate-600"}`}
                onClick={() => setTab(item.id)}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </div>

          {tab === "tasks" ? (
            <div className="space-y-3">
              {data.tasks.map((task) => (
                <TaskCard key={task.id} task={task} project={data} assignee={data.members.find((member) => member.id === task.primaryAssigneeId)} />
              ))}
            </div>
          ) : null}

          {tab === "emails" ? (
            <Card>
              <CardContent className="space-y-3 p-4">
                {data.emails.map((email) => (
                  <div key={email.id} className="rounded-panel border border-border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">{email.subject}</p>
                      <Badge tone={email.aiUrgency > 75 ? "red" : "blue"}>緊急度 {email.aiUrgency}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{email.from} / {formatDateTime(email.receivedAt)}</p>
                  </div>
                ))}
                {!data.emails.length ? <p className="text-sm text-slate-500">Gmail連携はPhase2で接続します。</p> : null}
              </CardContent>
            </Card>
          ) : null}

          {tab === "history" ? (
            <Card>
              <CardContent className="space-y-3 p-4">
                {data.history.map((item) => (
                  <div key={item.id} className="rounded-panel bg-slate-50 p-3 text-sm dark:bg-white/5">
                    <p className="font-medium">{item.action}</p>
                    <p className="mt-1 text-slate-500">{formatDateTime(item.createdAt)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {tab === "files" ? (
            <Card>
              <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
                {data.files.map((file) => (
                  <div key={file.id} className="rounded-panel border border-border p-3">
                    <FileText className="mb-3 h-5 w-5 text-accent" />
                    <p className="font-medium">{file.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatDate(file.updatedAt)}</p>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-panel bg-slate-50 px-3 py-2 dark:bg-white/5">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

