"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BriefcaseBusiness, CalendarDays, CalendarPlus, CheckCircle2, Clock3, Columns3, GitBranch, ListFilter, Loader2, Mic, PauseCircle, Pencil, PlayCircle, Plus, Save, Sparkles, Target, Trash2, UserRound, Wand2 } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { LoadingPanel } from "@/components/domain/loading";
import { PageHeader } from "@/components/domain/page-header";
import { TaskCard } from "@/components/domain/task-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/form";
import { taskPriorityLabels, taskStatusLabels } from "@/lib/data/labels";
import { displayTaskTitle } from "@/lib/data/task-flags";
import { apiFetch, useScopedPath, useScopedQuery } from "@/lib/hooks/use-api";
import type { Employee, GoalTree, Project, Task, TaskAssistantAction, TaskAssistantPlan, TaskPriority, TaskStatus } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

type ViewMode = "list" | "kanban" | "calendar";
type BranchOption = {
  value: string;
  label: string;
  treeId: string;
  treeTitle: string;
  branchId: string;
  branchTitle: string;
  projectId: string | null;
  projectName?: string;
  assigneeId: string | null;
  assigneeName?: string;
};

type SpeechRecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  start: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
};

const priorities = Object.entries(taskPriorityLabels) as Array<[TaskPriority, string]>;
const statuses = Object.entries(taskStatusLabels) as Array<[TaskStatus, string]>;

export default function TasksPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewMode>("list");
  const [open, setOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [focusedTaskId, setFocusedTaskId] = useState("");
  const [newBigTaskRef, setNewBigTaskRef] = useState("");
  const newTaskFormRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState({
    assigneeId: "",
    projectId: "",
    bigTaskRef: "",
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
  const goalTrees = useScopedQuery<GoalTree[]>(["goal-trees"], "/api/goal-trees");
  const assistantPlanPath = useScopedPath("/api/tasks/assistant-plan");

  const createTask = useMutation({
    mutationFn: (body: Partial<Task>) => apiFetch<Task>("/api/tasks", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      setOpen(false);
      setNewBigTaskRef("");
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
  const branchOptions = useMemo<BranchOption[]>(
    () =>
      (goalTrees.data ?? []).flatMap((tree) =>
        tree.branches.map((branch) => ({
          value: `${tree.id}::${branch.id}`,
          label: `${tree.title} / ${branch.title}`,
          treeId: tree.id,
          treeTitle: tree.title,
          branchId: branch.id,
          branchTitle: branch.title,
          projectId: branch.projectId,
          projectName: branch.projectId ? projectMap.get(branch.projectId)?.name : undefined,
          assigneeId: branch.assigneeId,
          assigneeName: branch.assigneeId ? employeeMap.get(branch.assigneeId)?.name : undefined,
        })),
      ),
    [employeeMap, goalTrees.data, projectMap],
  );
  const activeTasks = useMemo(() => (tasks.data ?? []).filter((task) => task.status !== "done" && task.priority !== "hold"), [tasks.data]);
  const holdCount = useMemo(() => (tasks.data ?? []).filter((task) => task.status !== "done" && task.priority === "hold").length, [tasks.data]);
  const displayedTasks = useMemo(() => {
    const source = (tasks.data ?? []).filter((task) => {
      if (!filters.bigTaskRef) return true;
      const [treeId, branchId] = filters.bigTaskRef.split("::");
      return task.sourceGoalTreeId === treeId && task.sourceBranchId === branchId;
    });
    if (!focusedTaskId) return source;
    return [...source].sort((a, b) => (a.id === focusedTaskId ? -1 : b.id === focusedTaskId ? 1 : 0));
  }, [filters.bigTaskRef, focusedTaskId, tasks.data]);
  const focusTask = useMemo(() => [...activeTasks].sort((a, b) => b.aiPriorityScore - a.aiPriorityScore)[0] ?? null, [activeTasks]);
  const todayCount = useMemo(() => activeTasks.filter((task) => dayDistance(task.dueDate) === 0).length, [activeTasks]);
  const overdueCount = useMemo(() => activeTasks.filter((task) => dayDistance(task.dueDate) < 0).length, [activeTasks]);
  const inProgressCount = useMemo(() => activeTasks.filter((task) => task.status === "in_progress").length, [activeTasks]);
  const totalMinutes = useMemo(() => activeTasks.reduce((sum, task) => sum + task.estimatedMinutes, 0), [activeTasks]);
  const workload = useMemo(
    () =>
      (employees.data ?? [])
        .map((employee) => {
          const owned = activeTasks.filter((task) => task.primaryAssigneeId === employee.id || task.assigneeIds.includes(employee.id));
          const projectsForEmployee = Array.from(new Set(owned.map((task) => projectMap.get(task.projectId)?.name).filter(Boolean) as string[])).slice(0, 3);
          const topTask = [...owned].sort((a, b) => b.aiPriorityScore - a.aiPriorityScore)[0] ?? null;
          return {
            employee,
            total: owned.length,
            inProgress: owned.filter((task) => task.status === "in_progress").length,
            overdue: owned.filter((task) => dayDistance(task.dueDate) < 0).length,
            projects: projectsForEmployee,
            topTask,
          };
        })
        .filter((item) => item.total > 0)
        .sort((a, b) => b.inProgress - a.inProgress || b.total - a.total),
    [activeTasks, employees.data, projectMap],
  );
  const branchWorkload = useMemo(() => {
    const groups = new Map<string, { title: string; projectName: string; total: number; topTask: Task | null }>();
    activeTasks.forEach((task) => {
      const title = task.sourceBranchTitle || "大タスク未設定";
      const projectName = projectMap.get(task.projectId)?.name ?? "案件未設定";
      const key = `${title}:${projectName}`;
      const current = groups.get(key) ?? { title, projectName, total: 0, topTask: null };
      current.total += 1;
      if (!current.topTask || task.aiPriorityScore > current.topTask.aiPriorityScore) current.topTask = task;
      groups.set(key, current);
    });
    return Array.from(groups.values()).sort((a, b) => b.total - a.total).slice(0, 6);
  }, [activeTasks, projectMap]);
  const selectedNewBranch = useMemo(() => branchOptions.find((option) => option.value === newBigTaskRef), [branchOptions, newBigTaskRef]);
  const aiContextPrompt = encodeURIComponent("タスクを増やす・減らす・小タスクに分解する相談をしたい。案件、大タスク、小タスク、担当者ごとに整理して、今日やるものと消してよい候補を提案して。");

  useEffect(() => {
    setFocusedTaskId(new URLSearchParams(window.location.search).get("taskId") ?? "");
  }, []);

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => newTaskFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    return () => window.clearTimeout(timeout);
  }, [open]);

  function patchTask(id: string, body: Partial<Task>) {
    updateTask.mutate({ id, body });
  }

  function openNewTaskForm() {
    setOpen(true);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const bigTaskRef = String(form.get("bigTaskRef") ?? "");
    const selectedBranch = branchOptions.find((option) => option.value === bigTaskRef);
    const primaryAssigneeId = String(form.get("primaryAssigneeId") || selectedBranch?.assigneeId || "");
    createTask.mutate({
      title: String(form.get("title")),
      description: String(form.get("description")),
      projectId: selectedBranch?.projectId || String(form.get("projectId")),
      primaryAssigneeId,
      assigneeIds: [primaryAssigneeId],
      sourceGoalTreeId: selectedBranch?.treeId ?? null,
      sourceBranchId: selectedBranch?.branchId ?? null,
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
        description="今日やる順番を決めて、開始、確認待ち、完了までその場で進めます。"
        actions={
          <>
            <ViewButton active={view === "list"} icon={<ListFilter className="h-4 w-4" />} label="一覧" onClick={() => setView("list")} />
            <ViewButton active={view === "kanban"} icon={<Columns3 className="h-4 w-4" />} label="カンバン" onClick={() => setView("kanban")} />
            <ViewButton active={view === "calendar"} icon={<CalendarDays className="h-4 w-4" />} label="日付" onClick={() => setView("calendar")} />
            <Button className="min-w-28 sm:min-w-0" onClick={() => (open ? setOpen(false) : openNewTaskForm())} variant="secondary">
              <Plus className="h-4 w-4" />
              {open ? "閉じる" : "追加"}
            </Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-2 sm:hidden">
        <Button className="w-full" onClick={openNewTaskForm} variant="secondary">
          <Plus className="h-4 w-4" />
          タスク追加
        </Button>
        <Link
          href={`/assistant?prompt=${aiContextPrompt}`}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-panel bg-slate-100 px-3 text-sm font-medium text-foreground transition hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15"
        >
          <Sparkles className="h-4 w-4" />
          AI相談
        </Link>
      </div>

      <Card className="mb-5 overflow-hidden">
        <CardContent className="grid gap-4 p-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={focusTask && focusTask.aiPriorityScore >= 82 ? "red" : "blue"}>次にやる</Badge>
              <span className="text-sm text-slate-500">AI優先度で自動整列</span>
            </div>
            <h2 className="mt-3 line-clamp-2 break-words text-xl font-bold leading-7">{focusTask ? displayTaskTitle(focusTask) : "未完了タスクはありません"}</h2>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
              {focusTask?.description ?? "完了済みのタスクを確認するか、新しいタスクを追加してください。"}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
              {focusTask ? (
                <>
                  <Button size="sm" onClick={() => patchTask(focusTask.id, { status: "in_progress" })} disabled={updateTask.isPending || focusTask.status === "in_progress"}>
                    <PlayCircle className="h-4 w-4" />
                    開始
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => patchTask(focusTask.id, { status: "review" })} disabled={updateTask.isPending || focusTask.status === "review"}>
                    <Clock3 className="h-4 w-4" />
                    確認へ
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => patchTask(focusTask.id, { status: "done" })} disabled={updateTask.isPending}>
                    <CheckCircle2 className="h-4 w-4" />
                    完了
                  </Button>
                </>
              ) : null}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2">
            <OpsMetric icon={<Target className="h-4 w-4" />} label="今やる" value={activeTasks.length} helper={holdCount ? `保留 ${holdCount}` : undefined} />
            <OpsMetric icon={<Clock3 className="h-4 w-4" />} label="今日" value={todayCount} />
            <OpsMetric icon={<AlertTriangle className="h-4 w-4" />} label="期限超過" value={overdueCount} tone={overdueCount ? "red" : "green"} />
            <OpsMetric icon={<PlayCircle className="h-4 w-4" />} label="進行中" value={inProgressCount} helper={`${totalMinutes}分`} />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-5">
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="blue">AI整理</Badge>
              <span className="text-sm font-semibold">案件、大タスク、小タスク、担当者で相談</span>
            </div>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-300">
              増やす、減らす、分解する候補をAIに聞いてから、人が確認して反映します。
            </p>
          </div>
          <Link
            href={`/assistant?prompt=${aiContextPrompt}`}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-panel bg-accent px-4 text-sm font-medium text-white shadow-sm transition hover:bg-blue-600 md:w-auto"
          >
            <Target className="h-4 w-4" />
            AIに相談
          </Link>
        </CardContent>
      </Card>

      <TaskVoicePlanner
        planPath={assistantPlanPath}
        disabled={createTask.isPending || updateTask.isPending || deleteTask.isPending}
        onCreate={(body) => createTask.mutate(body)}
        onUpdate={(taskId, body) => patchTask(taskId, body)}
        onDelete={(taskId) => deleteTask.mutate(taskId)}
      />

      <WorkloadOverview workload={workload} branchWorkload={branchWorkload} />

      <Card className="mb-5">
        <CardContent className="grid gap-3 p-4 md:grid-cols-3 xl:grid-cols-7">
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
          <Select value={filters.bigTaskRef} onChange={(event) => setFilters((value) => ({ ...value, bigTaskRef: event.target.value }))}>
            <option value="">大タスクすべて</option>
            {branchOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
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
        <Card ref={newTaskFormRef} className="mb-5 border-blue-200 dark:border-blue-500/30">
          <CardContent className="p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">新規タスク</p>
                <p className="mt-1 text-xs text-slate-500">大タスクを選ぶと、案件と担当が自動でそろいます。</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                閉じる
              </Button>
            </div>
            <form onSubmit={submit} className="grid gap-3 pb-20 md:grid-cols-2 md:pb-0">
              <FormField label="小タスク名">
                <Input name="title" required placeholder="例: 初回提案文を作る" />
              </FormField>
              <FormField label="大タスク">
                <Select name="bigTaskRef" value={newBigTaskRef} onChange={(event) => setNewBigTaskRef(event.target.value)}>
                  <option value="">大タスクを選択しない</option>
                  {branchOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="案件">
                <Select name="projectId" required defaultValue={selectedNewBranch?.projectId ?? projects.data?.[0]?.id ?? ""}>
                  {(projects.data ?? []).map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="担当">
                <Select name="primaryAssigneeId" required defaultValue={selectedNewBranch?.assigneeId ?? employees.data?.[0]?.id ?? ""}>
                  {(employees.data ?? []).map((employee) => (
                    <option key={employee.id} value={employee.id}>{employee.name}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="期限">
                <Input name="dueDate" required type="date" defaultValue={todayInputValue()} />
              </FormField>
              <FormField label="優先度">
                <Select name="priority" defaultValue="normal">
                  {priorities.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="状態">
                <Select name="status" defaultValue="todo">
                  {statuses.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="遅延リスク">
                <Input name="delayRisk" min={0} max={100} type="number" defaultValue={10} placeholder="0-100" />
              </FormField>
              <label className="flex h-11 items-center gap-2 rounded-panel border border-border px-3 text-sm">
                <input name="customerWaiting" type="checkbox" />
                顧客返信待ち
              </label>
              <FormField label="内容" className="md:col-span-2">
                <Textarea name="description" placeholder="何をどこまでやるか" />
              </FormField>
              {selectedNewBranch ? (
                <div className="flex flex-wrap gap-2 rounded-panel bg-blue-50 p-3 text-xs text-blue-900 dark:bg-blue-500/10 dark:text-blue-100 md:col-span-2">
                  <span>大タスク: {selectedNewBranch.branchTitle}</span>
                  {selectedNewBranch.projectName ? <span>案件: {selectedNewBranch.projectName}</span> : null}
                  {selectedNewBranch.assigneeName ? <span>担当: {selectedNewBranch.assigneeName}</span> : null}
                </div>
              ) : null}
              <div className="sticky bottom-[4.5rem] z-10 flex gap-2 rounded-panel border border-border bg-card/95 p-2 shadow-soft backdrop-blur md:static md:col-span-2 md:border-0 md:bg-transparent md:p-0 md:shadow-none">
                <Button className="flex-1 md:flex-none" disabled={createTask.isPending} type="submit">
                  <Save className="h-4 w-4" />
                  {createTask.isPending ? "保存中" : "保存"}
                </Button>
                <Button className="flex-1 md:flex-none" type="button" variant="ghost" onClick={() => setOpen(false)}>
                  キャンセル
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {view === "list" ? (
        <div className="space-y-3">
          {displayedTasks.map((task) => (
            <div key={task.id} className={cn("space-y-2", focusedTaskId === task.id && "rounded-panel ring-2 ring-blue-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-950")}>
              <div className="grid gap-2 lg:grid-cols-[1fr_auto]">
                <TaskCard task={task} project={projectMap.get(task.projectId)} assignee={employeeMap.get(task.primaryAssigneeId)} />
                <TaskActions
                  task={task}
                  onStatus={(status) => patchTask(task.id, { status })}
                  onPatch={(body) => patchTask(task.id, body)}
                  onEdit={() => setEditingTaskId((current) => (current === task.id ? null : task.id))}
                  onDelete={() => deleteTask.mutate(task.id)}
                  disabled={updateTask.isPending || deleteTask.isPending}
                />
              </div>
              {editingTaskId === task.id ? (
                <TaskEditForm
                  task={task}
                  projects={projects.data ?? []}
                  employees={employees.data ?? []}
                  branchOptions={branchOptions}
                  disabled={updateTask.isPending}
                  onCancel={() => setEditingTaskId(null)}
                  onSave={(body) => {
                    patchTask(task.id, body);
                    setEditingTaskId(null);
                  }}
                />
              ) : null}
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
                  <div key={task.id} className="space-y-2">
                    <TaskCard task={task} project={projectMap.get(task.projectId)} assignee={employeeMap.get(task.primaryAssigneeId)} />
                    <TaskActions task={task} onStatus={(nextStatus) => patchTask(task.id, { status: nextStatus })} onPatch={(body) => patchTask(task.id, body)} onDelete={() => deleteTask.mutate(task.id)} disabled={updateTask.isPending || deleteTask.isPending} compact />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {view === "calendar" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {displayedTasks.map((task) => (
            <Card key={task.id} className={cn(focusedTaskId === task.id && "ring-2 ring-blue-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-950")}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Badge tone={task.priority === "urgent" ? "red" : "blue"}>{taskPriorityLabels[task.priority]}</Badge>
                  <span className="text-sm font-semibold">{formatDate(task.dueDate)}</span>
                </div>
                <p className="mt-3 break-words font-semibold">{displayTaskTitle(task)}</p>
                <p className="mt-1 text-sm text-slate-500">{projectMap.get(task.projectId)?.name}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  {employeeMap.get(task.primaryAssigneeId)?.name ? (
                    <span className="inline-flex items-center gap-1">
                      <UserRound className="h-3.5 w-3.5" />
                      {employeeMap.get(task.primaryAssigneeId)?.name}
                    </span>
                  ) : null}
                  {task.sourceBranchTitle ? (
                    <span className="inline-flex items-center gap-1">
                      <BriefcaseBusiness className="h-3.5 w-3.5" />
                      {task.sourceBranchTitle}
                    </span>
                  ) : null}
                </div>
                <div className="mt-3">
                  <TaskActions task={task} onStatus={(nextStatus) => patchTask(task.id, { status: nextStatus })} onPatch={(body) => patchTask(task.id, body)} onDelete={() => deleteTask.mutate(task.id)} disabled={updateTask.isPending || deleteTask.isPending} compact />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </>
  );
}

function WorkloadOverview({
  workload,
  branchWorkload,
}: {
  workload: Array<{
    employee: Employee;
    total: number;
    inProgress: number;
    overdue: number;
    projects: string[];
    topTask: Task | null;
  }>;
  branchWorkload: Array<{ title: string; projectName: string; total: number; topTask: Task | null }>;
}) {
  if (!workload.length && !branchWorkload.length) return null;

  return (
    <Card className="mb-5">
      <CardContent className="grid min-w-0 gap-5 p-4 xl:grid-cols-2">
        <section className="min-w-0">
          <div className="mb-3 flex items-center gap-2">
            <UserRound className="h-4 w-4 text-accent" />
            <p className="font-semibold">担当別の進行</p>
          </div>
          <div className="space-y-2">
            {workload.map((item) => (
              <div key={item.employee.id} className="rounded-panel border border-border px-3 py-2">
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{item.employee.name}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{item.projects.length ? item.projects.join(" / ") : "案件未設定"}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                    <Badge tone={item.overdue ? "red" : "blue"}>{item.total}件</Badge>
                    {item.inProgress ? <Badge tone="green">進行中 {item.inProgress}</Badge> : null}
                  </div>
                </div>
                {item.topTask ? <p className="mt-2 line-clamp-1 text-xs text-slate-500">次: {displayTaskTitle(item.topTask)}</p> : null}
              </div>
            ))}
          </div>
        </section>

        <section className="min-w-0">
          <div className="mb-3 flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-accent" />
            <p className="font-semibold">大タスク別の進行</p>
          </div>
          <div className="space-y-2">
            {branchWorkload.map((item) => (
              <div key={`${item.projectName}-${item.title}`} className="rounded-panel border border-border px-3 py-2">
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">案件: {item.projectName}</p>
                  </div>
                  <Badge className="w-fit sm:shrink-0" tone={item.title === "大タスク未設定" ? "amber" : "blue"}>{item.total}件</Badge>
                </div>
                {item.topTask ? <p className="mt-2 line-clamp-1 text-xs text-slate-500">小タスク: {displayTaskTitle(item.topTask)}</p> : null}
              </div>
            ))}
          </div>
        </section>
      </CardContent>
    </Card>
  );
}

function TaskVoicePlanner({
  planPath,
  onCreate,
  onUpdate,
  onDelete,
  disabled,
}: {
  planPath: string;
  onCreate: (body: Partial<Task>) => void;
  onUpdate: (taskId: string, body: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
  disabled?: boolean;
}) {
  const [command, setCommand] = useState("");
  const [plan, setPlan] = useState<TaskAssistantPlan | null>(null);
  const [planning, setPlanning] = useState(false);
  const [listening, setListening] = useState(false);
  const [appliedIds, setAppliedIds] = useState<string[]>([]);

  async function buildPlan(text = command) {
    const normalized = text.trim();
    if (!normalized || planning) return;
    setPlanning(true);
    setAppliedIds([]);
    try {
      const data = await apiFetch<TaskAssistantPlan>(planPath, {
        method: "POST",
        body: JSON.stringify({ message: normalized }),
      });
      setPlan(data);
    } catch {
      setPlan({
        summary: "AI整理に失敗しました。少し時間を置いて、もう一度試してください。",
        source: "local",
        warnings: ["通信に失敗しました。"],
        actions: [],
      });
    } finally {
      setPlanning(false);
    }
  }

  function startVoice() {
    const SpeechRecognition = (window as Window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor })
      .SpeechRecognition ?? (window as Window & { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setPlan({ summary: "このブラウザでは音声入力が使えません。スマホのキーボード音声入力でも代用できます。", source: "local", warnings: [], actions: [] });
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "ja-JP";
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const text = event.results[0]?.[0]?.transcript ?? "";
      setCommand(text);
      void buildPlan(text);
    };
    recognition.onend = () => setListening(false);
    setListening(true);
    recognition.start();
  }

  function applyAction(action: TaskAssistantAction) {
    if (appliedIds.includes(action.id) || disabled) return;
    if (action.type === "delete") {
      if (!window.confirm(`「${action.title}」を削除しますか？`)) return;
      onDelete(action.taskId);
    } else if (action.type === "update") {
      onUpdate(action.taskId, action.patch);
    } else {
      onCreate({
        title: action.title,
        description: action.description,
        projectId: action.projectId,
        primaryAssigneeId: action.primaryAssigneeId,
        assigneeIds: [action.primaryAssigneeId],
        sourceGoalTreeId: action.sourceGoalTreeId,
        sourceBranchId: action.sourceBranchId,
        dueDate: action.dueDate,
        priority: action.priority,
        status: "todo",
        customerWaiting: false,
        delayRisk: 15,
        estimatedMinutes: action.estimatedMinutes,
      });
    }
    setAppliedIds((ids) => [...ids, action.id]);
  }

  function applySafeActions() {
    if (!plan || disabled) return;
    plan.actions.filter((action) => action.type !== "delete" && !appliedIds.includes(action.id)).forEach((action) => applyAction(action));
  }

  const safePendingCount = plan?.actions.filter((action) => action.type !== "delete" && !appliedIds.includes(action.id)).length ?? 0;

  return (
    <Card className="mb-5 overflow-hidden border-blue-200 dark:border-blue-500/30">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="blue">音声AI</Badge>
          <span className="text-sm font-semibold">話して、候補を確認してから反映</span>
        </div>
        <div className="mt-3 grid grid-cols-[1fr_44px_44px] gap-2">
          <Input
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            placeholder="例: 橋迫さんに明日までにデザイン確認を追加して営業スプリントにつなげて"
            onKeyDown={(event) => event.key === "Enter" && void buildPlan()}
          />
          <Button aria-label="AI整理" title="AI整理" size="icon" disabled={planning || !command.trim()} onClick={() => void buildPlan()}>
            {planning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          </Button>
          <Button aria-label="音声入力" title="音声入力" size="icon" variant={listening ? "danger" : "secondary"} onClick={startVoice}>
            <Mic className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
          {["橋迫さんに明日までの確認タスクを追加", "今日の営業スプリントを3つに分解", "優先度が低いものを保留", "完了済みを削除候補にする", "この作業を明日に変更"].map((sample) => (
            <button key={sample} className="rounded-full bg-slate-100 px-2 py-1 dark:bg-white/10 dark:text-slate-200" onClick={() => { setCommand(sample); void buildPlan(sample); }}>
              {sample}
            </button>
          ))}
        </div>

        {plan ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-panel bg-blue-50 p-3 text-sm leading-6 text-blue-900 dark:bg-blue-500/10 dark:text-blue-100">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2 font-semibold">
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span>{plan.summary}</span>
                </div>
                <Badge tone={plan.source === "openai" ? "blue" : "slate"}>{plan.source === "openai" ? "OpenAI" : "Local"}</Badge>
                {safePendingCount ? (
                  <Button size="sm" variant="secondary" disabled={disabled} onClick={applySafeActions}>
                    <CheckCircle2 className="h-4 w-4" />
                    削除以外を反映
                  </Button>
                ) : null}
              </div>
              {plan.warnings.map((warning) => (
                <p key={warning} className="mt-1 text-xs">{warning}</p>
              ))}
              {safePendingCount ? <p className="mt-2 text-xs">削除候補は事故防止のため、個別に確認してから反映します。</p> : null}
            </div>
            {plan.actions.map((action) => (
              <div key={action.id} className="grid gap-3 rounded-panel border border-border p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={action.type === "delete" ? "red" : action.type === "update" ? "amber" : "green"}>{action.type === "delete" ? "削除" : action.type === "update" && action.patch.priority === "hold" ? "保留" : action.type === "update" ? "更新" : "追加"}</Badge>
                    <p className="line-clamp-1 font-semibold">{action.title}</p>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-300">{action.reason}</p>
                  <ActionContextLine action={action} />
                  {action.type === "create" ? (
                    <p className="mt-1 text-xs text-slate-500">
                      期限 {formatDate(action.dueDate)} / {taskPriorityLabels[action.priority]} / {action.estimatedMinutes}分
                    </p>
                  ) : null}
                  {action.type === "update" ? <ActionPatchLine action={action} /> : null}
                </div>
                <Button size="sm" variant={action.type === "delete" ? "danger" : "secondary"} disabled={disabled || appliedIds.includes(action.id)} onClick={() => applyAction(action)}>
                  {appliedIds.includes(action.id) ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                  {appliedIds.includes(action.id) ? "反映済み" : "反映"}
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ActionContextLine({ action }: { action: TaskAssistantAction }) {
  const items = [
    action.projectName ? { icon: <BriefcaseBusiness className="h-3.5 w-3.5" />, label: `案件: ${action.projectName}` } : null,
    action.sourceBranchTitle ? { icon: <GitBranch className="h-3.5 w-3.5" />, label: `大タスク: ${action.sourceBranchTitle}` } : null,
    action.assigneeName ? { icon: <UserRound className="h-3.5 w-3.5" />, label: `担当: ${action.assigneeName}` } : null,
  ].filter(Boolean) as Array<{ icon: React.ReactNode; label: string }>;

  if (!items.length) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-slate-500">
      {items.map((item) => (
        <span key={item.label} className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full bg-slate-100 px-2 py-1 dark:bg-white/10 dark:text-slate-200">
          <span className="shrink-0">{item.icon}</span>
          <span className="truncate">{item.label}</span>
        </span>
      ))}
    </div>
  );
}

function ActionPatchLine({ action }: { action: Extract<TaskAssistantAction, { type: "update" }> }) {
  const patchItems = [
    action.patch.status ? `状態: ${taskStatusLabels[action.patch.status]}` : null,
    action.patch.priority ? `優先度: ${taskPriorityLabels[action.patch.priority]}` : null,
    action.patch.dueDate ? `期限: ${formatDate(action.patch.dueDate)}` : null,
    action.patch.estimatedMinutes ? `見積: ${action.patch.estimatedMinutes}分` : null,
    action.patch.projectId && action.projectName ? `案件: ${action.projectName}` : null,
    action.patch.primaryAssigneeId && action.assigneeName ? `担当: ${action.assigneeName}` : null,
    action.patch.sourceBranchId && action.sourceBranchTitle ? `大タスク: ${action.sourceBranchTitle}` : null,
  ].filter(Boolean) as string[];

  if (!patchItems.length) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
      {patchItems.map((item) => (
        <span key={item} className="rounded-full bg-amber-50 px-2 py-1 text-amber-800 dark:bg-amber-500/15 dark:text-amber-100">
          {item}
        </span>
      ))}
    </div>
  );
}

function TaskEditForm({
  task,
  projects,
  employees,
  branchOptions,
  onSave,
  onCancel,
  disabled,
}: {
  task: Task;
  projects: Project[];
  employees: Employee[];
  branchOptions: BranchOption[];
  onSave: (body: Partial<Task>) => void;
  onCancel: () => void;
  disabled?: boolean;
}) {
  const currentBigTaskRef = task.sourceGoalTreeId && task.sourceBranchId ? `${task.sourceGoalTreeId}::${task.sourceBranchId}` : "";
  const [bigTaskRef, setBigTaskRef] = useState(currentBigTaskRef);
  const selectedBranch = branchOptions.find((option) => option.value === bigTaskRef);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const primaryAssigneeId = String(form.get("primaryAssigneeId"));
    onSave({
      title: String(form.get("title")),
      description: String(form.get("description")),
      projectId: selectedBranch?.projectId || String(form.get("projectId")),
      primaryAssigneeId,
      assigneeIds: [primaryAssigneeId],
      sourceGoalTreeId: selectedBranch?.treeId ?? null,
      sourceBranchId: selectedBranch?.branchId ?? null,
      dueDate: String(form.get("dueDate")),
      priority: String(form.get("priority")) as TaskPriority,
      status: String(form.get("status")) as TaskStatus,
      estimatedMinutes: Number(form.get("estimatedMinutes") || task.estimatedMinutes),
    });
  }

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
          <Input name="title" required defaultValue={task.title} placeholder="タイトル" />
          <Select name="bigTaskRef" value={bigTaskRef} onChange={(event) => setBigTaskRef(event.target.value)}>
            <option value="">大タスクを選択しない</option>
            {branchOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select name="projectId" required defaultValue={task.projectId}>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </Select>
          <Select name="primaryAssigneeId" required defaultValue={task.primaryAssigneeId}>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>{employee.name}</option>
            ))}
          </Select>
          <Input name="dueDate" required type="date" defaultValue={task.dueDate.slice(0, 10)} />
          <Input name="estimatedMinutes" min={5} step={5} type="number" defaultValue={task.estimatedMinutes} placeholder="見積分数" />
          <Select name="priority" defaultValue={task.priority}>
            {priorities.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
          <Select name="status" defaultValue={task.status}>
            {statuses.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
          <Textarea name="description" className="md:col-span-2" defaultValue={task.description} placeholder="内容" />
          {selectedBranch ? (
            <div className="flex flex-wrap gap-2 rounded-panel bg-blue-50 p-3 text-xs text-blue-900 dark:bg-blue-500/10 dark:text-blue-100 md:col-span-2">
              <span>大タスク: {selectedBranch.branchTitle}</span>
              {selectedBranch.projectName ? <span>案件: {selectedBranch.projectName}</span> : null}
              {selectedBranch.assigneeName ? <span>担当: {selectedBranch.assigneeName}</span> : null}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button disabled={disabled} type="submit">
              <Save className="h-4 w-4" />
              編集を保存
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel}>
              キャンセル
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function dayDistance(value: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(value);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function FormField({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("grid gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-300", className)}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function OpsMetric({
  icon,
  label,
  value,
  helper,
  tone = "blue",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  helper?: string;
  tone?: "blue" | "green" | "red";
}) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200",
    green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
    red: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-200",
  }[tone];
  return (
    <div className="rounded-panel border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-panel", toneClass)}>{icon}</span>
        {helper ? <span className="text-xs text-slate-500">{helper}</span> : null}
      </div>
      <p className="mt-3 text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function TaskActions({
  task,
  onStatus,
  onPatch,
  onEdit,
  onDelete,
  disabled,
  compact = false,
}: {
  task: Task;
  onStatus: (status: TaskStatus) => void;
  onPatch?: (body: Partial<Task>) => void;
  onEdit?: () => void;
  onDelete: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const calendarPath = useScopedPath(`/api/calendar/tasks/${task.id}/ics`);
  const googleCalendarPath = useScopedPath(`/api/calendar/tasks/${task.id}/google`);
  return (
    <div className={cn("grid gap-2", compact ? "" : "lg:w-36")}>
      {compact ? null : (
        <Select className="hidden lg:block" value={task.status} onChange={(event) => onStatus(event.target.value as TaskStatus)} disabled={disabled}>
          {statuses.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
      )}
      <div className={cn("grid gap-2", compact ? "grid-cols-6" : "grid-cols-4 sm:grid-cols-7 lg:grid-cols-1")}>
        <QuickStatusButtons task={task} onStatus={onStatus} disabled={disabled} compact className="contents" mobileIconOnly={!compact} />
        {onPatch ? (
          <Button
            aria-label="保留"
            title="今やるリストから外す"
            className="min-w-0 px-0 sm:px-3 lg:px-3"
            variant={task.priority === "hold" ? "secondary" : "ghost"}
            size={compact ? "icon" : "sm"}
            onClick={() => onPatch({ priority: task.priority === "hold" ? "normal" : "hold" })}
            disabled={disabled || task.status === "done"}
          >
            <PauseCircle className="h-4 w-4" />
            {compact ? null : <span className="hidden sm:inline lg:inline">{task.priority === "hold" ? "復帰" : "保留"}</span>}
          </Button>
        ) : null}
        <a
          aria-label="カレンダー追加"
          title="ICS予定をダウンロード"
          href={calendarPath}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-panel bg-transparent font-medium text-foreground transition hover:bg-slate-100 dark:hover:bg-white/10",
            compact ? "h-10 w-10 p-0" : "h-9 min-w-0 px-0 text-sm sm:px-3 lg:px-3",
          )}
        >
          <CalendarDays className="h-4 w-4" />
          {compact ? null : <span className="hidden sm:inline lg:inline">ICS</span>}
        </a>
        <a
          aria-label="Googleカレンダー追加"
          title="Googleカレンダー追加"
          href={googleCalendarPath}
          target="_blank"
          rel="noreferrer"
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-panel bg-transparent font-medium text-foreground transition hover:bg-slate-100 dark:hover:bg-white/10",
            compact ? "h-10 w-10 p-0" : "h-9 min-w-0 px-0 text-sm sm:px-3 lg:px-3",
          )}
        >
          <CalendarPlus className="h-4 w-4" />
          {compact ? null : <span className="hidden sm:inline lg:inline">Google</span>}
        </a>
        {onEdit ? (
          <Button aria-label="タスク編集" title="タスク編集" className="min-w-0 px-0 sm:px-3 lg:px-3" variant="ghost" size={compact ? "icon" : "sm"} onClick={onEdit} disabled={disabled}>
            <Pencil className="h-4 w-4" />
            {compact ? null : <span className="hidden sm:inline lg:inline">編集</span>}
          </Button>
        ) : null}
        <Button
          aria-label="タスク削除"
          title="タスク削除"
          className="min-w-0 px-0 text-red-600 hover:bg-red-50 sm:px-3 lg:px-3 dark:text-red-300 dark:hover:bg-red-500/10"
          variant="ghost"
          size="sm"
          onClick={() => {
            if (window.confirm(`「${displayTaskTitle(task)}」を削除しますか？`)) onDelete();
          }}
          disabled={disabled}
        >
          <Trash2 className="h-4 w-4 text-red-500" />
          <span className="hidden sm:inline lg:inline">削除</span>
        </Button>
      </div>
    </div>
  );
}

function QuickStatusButtons({
  task,
  onStatus,
  disabled,
  compact = false,
  className,
  mobileIconOnly = false,
}: {
  task: Task;
  onStatus: (status: TaskStatus) => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
  mobileIconOnly?: boolean;
}) {
  const size = compact ? "icon" : "sm";
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Button className="min-w-0 px-0 sm:px-3 lg:px-3" aria-label="開始" title="開始" size={size} variant={task.status === "in_progress" ? "secondary" : "ghost"} onClick={() => onStatus("in_progress")} disabled={disabled || task.status === "in_progress" || task.status === "done"}>
        <PlayCircle className="h-4 w-4" />
        {compact ? null : <span className={mobileIconOnly ? "hidden sm:inline lg:inline" : undefined}>開始</span>}
      </Button>
      <Button className="min-w-0 px-0 sm:px-3 lg:px-3" aria-label="確認へ" title="確認へ" size={size} variant={task.status === "review" ? "secondary" : "ghost"} onClick={() => onStatus("review")} disabled={disabled || task.status === "review" || task.status === "done"}>
        <Clock3 className="h-4 w-4" />
        {compact ? null : <span className={mobileIconOnly ? "hidden sm:inline lg:inline" : undefined}>確認</span>}
      </Button>
      <Button className="min-w-0 px-0 sm:px-3 lg:px-3" aria-label="完了" title="完了" size={size} variant={task.status === "done" ? "secondary" : "ghost"} onClick={() => onStatus("done")} disabled={disabled || task.status === "done"}>
        <CheckCircle2 className="h-4 w-4" />
        {compact ? null : <span className={mobileIconOnly ? "hidden sm:inline lg:inline" : undefined}>完了</span>}
      </Button>
    </div>
  );
}

function ViewButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Button className="h-10 w-10 px-0 sm:h-11 sm:w-auto sm:px-4" variant={active ? "primary" : "ghost"} onClick={onClick}>
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}
