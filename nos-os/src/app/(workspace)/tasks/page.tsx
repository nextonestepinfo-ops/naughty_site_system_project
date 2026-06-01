"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Columns3, ListFilter, Plus, Save, Trash2 } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { LoadingPanel } from "@/components/domain/loading";
import { PageHeader } from "@/components/domain/page-header";
import { TaskCard } from "@/components/domain/task-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/form";
import { taskPriorityLabels, taskStatusLabels } from "@/lib/data/labels";
import { apiFetch, useScopedQuery } from "@/lib/hooks/use-api";
import type { Employee, Project, Task, TaskPriority, TaskStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type ViewMode = "list" | "kanban" | "calendar";

const priorities = Object.entries(taskPriorityLabels) as Array<[TaskPriority, string]>;
const statuses = Object.entries(taskStatusLabels) as Array<[TaskStatus, string]>;

export default function TasksPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewMode>("list");
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState({
    assigneeId: "",
    projectId: "",
    priority: "",
    status: "",
    due: "",
    sort: "dueDate",
  });

  const tasks = useScopedQuery<Task[]>(["tasks"], "/api/tasks", {
    assigneeId: filters.assigneeId,
    projectId: filters.projectId,
    priority: filters.priority,
    status: filters.status,
    due: filters.due,
    sort: filters.sort,
  });
  const employees = useScopedQuery<Employee[]>(["employees"], "/api/employees");
  const projects = useScopedQuery<Project[]>(["projects"], "/api/projects");

  const createTask = useMutation({
    mutationFn: (body: Partial<Task>) => apiFetch<Task>("/api/tasks", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const updateTask = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Task> }) =>
      apiFetch<Task>(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: (id: string) => apiFetch<{ ok: boolean }>(`/api/tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const employeeMap = useMemo(() => new Map((employees.data ?? []).map((employee) => [employee.id, employee])), [employees.data]);
  const projectMap = useMemo(() => new Map((projects.data ?? []).map((project) => [project.id, project])), [projects.data]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const primaryAssigneeId = String(form.get("primaryAssigneeId"));
    createTask.mutate({
      title: String(form.get("title")),
      description: String(form.get("description")),
      projectId: String(form.get("projectId")),
      primaryAssigneeId,
      assigneeIds: [primaryAssigneeId],
      dueDate: String(form.get("dueDate")),
      priority: String(form.get("priority")) as TaskPriority,
      status: String(form.get("status")) as TaskStatus,
      customerWaiting: form.get("customerWaiting") === "on",
      delayRisk: Number(form.get("delayRisk") || 10),
    });
  }

  if (tasks.isLoading || !tasks.data) return <LoadingPanel label="タスクを読み込み中" />;

  return (
    <>
      <PageHeader
        title="タスク管理"
        description="一覧、カンバン、カレンダー表示。担当者、案件、期限、優先度、状態で絞り込めます。"
        actions={
          <>
            <ViewButton active={view === "list"} icon={<ListFilter className="h-4 w-4" />} label="一覧" onClick={() => setView("list")} />
            <ViewButton active={view === "kanban"} icon={<Columns3 className="h-4 w-4" />} label="カンバン" onClick={() => setView("kanban")} />
            <ViewButton active={view === "calendar"} icon={<CalendarDays className="h-4 w-4" />} label="日付" onClick={() => setView("calendar")} />
            <Button onClick={() => setOpen((value) => !value)} variant="secondary">
              <Plus className="h-4 w-4" />
              追加
            </Button>
          </>
        }
      />

      <Card className="mb-5">
        <CardContent className="grid gap-3 p-4 md:grid-cols-3 xl:grid-cols-6">
          <Select value={filters.assigneeId} onChange={(event) => setFilters((value) => ({ ...value, assigneeId: event.target.value }))}>
            <option value="">担当者すべて</option>
            {(employees.data ?? []).map((employee) => (
              <option key={employee.id} value={employee.id}>{employee.name}</option>
            ))}
          </Select>
          <Select value={filters.projectId} onChange={(event) => setFilters((value) => ({ ...value, projectId: event.target.value }))}>
            <option value="">案件すべて</option>
            {(projects.data ?? []).map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </Select>
          <Select value={filters.priority} onChange={(event) => setFilters((value) => ({ ...value, priority: event.target.value }))}>
            <option value="">優先度すべて</option>
            {priorities.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
          <Select value={filters.status} onChange={(event) => setFilters((value) => ({ ...value, status: event.target.value }))}>
            <option value="">状態すべて</option>
            {statuses.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
          <Select value={filters.due} onChange={(event) => setFilters((value) => ({ ...value, due: event.target.value }))}>
            <option value="">期限すべて</option>
            <option value="today">今日</option>
            <option value="week">今週</option>
            <option value="overdue">期限超過</option>
          </Select>
          <Select value={filters.sort} onChange={(event) => setFilters((value) => ({ ...value, sort: event.target.value }))}>
            <option value="dueDate">期限順</option>
            <option value="priority">優先度順</option>
            <option value="assignee">担当者順</option>
            <option value="updatedAt">更新日順</option>
          </Select>
        </CardContent>
      </Card>

      {open ? (
        <Card className="mb-5">
          <CardContent className="p-4">
            <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
              <Input name="title" required placeholder="タイトル" />
              <Select name="projectId" required>
                {(projects.data ?? []).map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </Select>
              <Select name="primaryAssigneeId" required>
                {(employees.data ?? []).map((employee) => (
                  <option key={employee.id} value={employee.id}>{employee.name}</option>
                ))}
              </Select>
              <Input name="dueDate" required type="date" />
              <Select name="priority" defaultValue="normal">
                {priorities.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
              <Select name="status" defaultValue="todo">
                {statuses.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
              <Input name="delayRisk" min={0} max={100} type="number" placeholder="遅延リスク 0-100" />
              <label className="flex h-11 items-center gap-2 rounded-panel border border-border px-3 text-sm">
                <input name="customerWaiting" type="checkbox" />
                顧客返信待ち
              </label>
              <Textarea name="description" className="md:col-span-2" placeholder="内容" />
              <div className="md:col-span-2">
                <Button disabled={createTask.isPending} type="submit">
                  <Save className="h-4 w-4" />
                  保存
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {view === "list" ? (
        <div className="space-y-3">
          {tasks.data.map((task) => (
            <div key={task.id} className="grid gap-2 lg:grid-cols-[1fr_auto]">
              <TaskCard task={task} project={projectMap.get(task.projectId)} assignee={employeeMap.get(task.primaryAssigneeId)} />
              <div className="flex gap-2 lg:flex-col">
                <Select value={task.status} onChange={(event) => updateTask.mutate({ id: task.id, body: { status: event.target.value as TaskStatus } })}>
                  {statuses.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
                <Button aria-label="タスク削除" title="タスク削除" variant="ghost" size="icon" onClick={() => deleteTask.mutate(task.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {view === "kanban" ? (
        <div className="grid gap-3 xl:grid-cols-4">
          {statuses.map(([status, label]) => (
            <div key={status} className="rounded-panel border border-border bg-card p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-semibold">{label}</p>
                <Badge>{tasks.data.filter((task) => task.status === status).length}</Badge>
              </div>
              <div className="space-y-3">
                {tasks.data.filter((task) => task.status === status).map((task) => (
                  <TaskCard key={task.id} task={task} project={projectMap.get(task.projectId)} assignee={employeeMap.get(task.primaryAssigneeId)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {view === "calendar" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {tasks.data.map((task) => (
            <Card key={task.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Badge tone={task.priority === "urgent" ? "red" : "blue"}>{taskPriorityLabels[task.priority]}</Badge>
                  <span className="text-sm font-semibold">{formatDate(task.dueDate)}</span>
                </div>
                <p className="mt-3 font-semibold">{task.title}</p>
                <p className="mt-1 text-sm text-slate-500">{projectMap.get(task.projectId)?.name}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </>
  );
}

function ViewButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Button variant={active ? "primary" : "ghost"} onClick={onClick}>
      {icon}
      {label}
    </Button>
  );
}

