"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BriefcaseBusiness, CalendarDays, CheckCircle2, Clock3, Columns3, ListFilter, Loader2, Mic, Pencil, PlayCircle, Plus, Save, Sparkles, Target, Trash2, UserRound, Wand2 } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { LoadingPanel } from "@/components/domain/loading";
import { PageHeader } from "@/components/domain/page-header";
import { TaskCard } from "@/components/domain/task-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/form";
import { taskPriorityLabels, taskStatusLabels } from "@/lib/data/labels";
import { apiFetch, useScopedPath, useScopedQuery } from "@/lib/hooks/use-api";
import type { Employee, GoalTree, Project, Task, TaskAssistantAction, TaskAssistantPlan, TaskPriority, TaskStatus } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

type ViewMode = "list" | "kanban" | "calendar";
type BranchOption = {
  value: string;
  label: string;
  treeId: string;
  branchId: string;
  projectId: string | null;
  assigneeId: string | null;
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
  const goalTrees = useScopedQuery<GoalTree[]>(["goal-trees"], "/api/goal-trees");
  const assistantPlanPath = useScopedPath("/api/tasks/assistant-plan");

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
  const branchOptions = useMemo<BranchOption[]>(
    () =>
      (goalTrees.data ?? []).flatMap((tree) =>
        tree.branches.map((branch) => ({
          value: `${tree.id}::${branch.id}`,
          label: `${tree.title} / ${branch.title}`,
          treeId: tree.id,
          branchId: branch.id,
          projectId: branch.projectId,
          assigneeId: branch.assigneeId,
        })),
      ),
    [goalTrees.data],
  );
  const activeTasks = useMemo(() => (tasks.data ?? []).filter((task) => task.status !== "done"), [tasks.data]);
  const displayedTasks = useMemo(() => {
    const source = tasks.data ?? [];
    if (!focusedTaskId) return source;
    return [...source].sort((a, b) => (a.id === focusedTaskId ? -1 : b.id === focusedTaskId ? 1 : 0));
  }, [focusedTaskId, tasks.data]);
  const focusTask = useMemo(() => [...activeTasks].sort((a, b) => b.aiPriorityScore - a.aiPriorityScore)[0] ?? null, [activeTasks]);
  const todayCount = useMemo(() => activeTasks.filter((task) => dayDistance(task.dueDate) === 0).length, [activeTasks]);
  const overdueCount = useMemo(() => activeTasks.filter((task) => dayDistance(task.dueDate) < 0).length, [activeTasks]);
  const inProgressCount = useMemo(() => activeTasks.filter((task) => task.status === "in_progress").length, [activeTasks]);
  const totalMinutes = useMemo(() => activeTasks.reduce((sum, task) => sum + task.estimatedMinutes, 0), [activeTasks]);
  const aiContextPrompt = encodeURIComponent("タスクを増やす・減らす・小タスクに分解する相談をしたい。案件、大タスク、小タスク、担当者ごとに整理して、今日やるものと消してよい候補を提案して。");

  useEffect(() => {
    setFocusedTaskId(new URLSearchParams(window.location.search).get("taskId") ?? "");
  }, []);

  function patchTask(id: string, body: Partial<Task>) {
    updateTask.mutate({ id, body });
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
            <Button onClick={() => setOpen((value) => !value)} variant="secondary">
              <Plus className="h-4 w-4" />
              追加
            </Button>
          </>
        }
      />

      <Card className="mb-5 overflow-hidden">
        <CardContent className="grid gap-4 p-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={focusTask && focusTask.aiPriorityScore >= 82 ? "red" : "blue"}>次にやる</Badge>
              <span className="text-sm text-slate-500">AI優先度で自動整列</span>
            </div>
            <h2 className="mt-3 line-clamp-2 text-xl font-bold leading-7">{focusTask?.title ?? "未完了タスクはありません"}</h2>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
              {focusTask?.description ?? "完了済みのタスクを確認するか、新しいタスクを追加してください。"}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
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
            <OpsMetric icon={<Target className="h-4 w-4" />} label="未完了" value={activeTasks.length} />
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
              <Select name="bigTaskRef">
                <option value="">大タスクを選択しない</option>
                {branchOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
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
          {displayedTasks.map((task) => (
            <div key={task.id} className={cn("space-y-2", focusedTaskId === task.id && "rounded-panel ring-2 ring-blue-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-950")}>
              <div className="grid gap-2 lg:grid-cols-[1fr_auto]">
                <TaskCard task={task} project={projectMap.get(task.projectId)} assignee={employeeMap.get(task.primaryAssigneeId)} />
                <TaskActions
                  task={task}
                  onStatus={(status) => patchTask(task.id, { status })}
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
                    <TaskActions task={task} onStatus={(nextStatus) => patchTask(task.id, { status: nextStatus })} onDelete={() => deleteTask.mutate(task.id)} disabled={updateTask.isPending || deleteTask.isPending} compact />
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
                <p className="mt-3 font-semibold">{task.title}</p>
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
                  <TaskActions task={task} onStatus={(nextStatus) => patchTask(task.id, { status: nextStatus })} onDelete={() => deleteTask.mutate(task.id)} disabled={updateTask.isPending || deleteTask.isPending} compact />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </>
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
            placeholder="例: 明日までにLP見積を作るタスクを追加"
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
          {["今日のタスクを分解", "完了済みを減らす", "営業タスクを追加", "この作業を明日に変更"].map((sample) => (
            <button key={sample} className="rounded-full bg-slate-100 px-2 py-1 dark:bg-white/10 dark:text-slate-200" onClick={() => { setCommand(sample); void buildPlan(sample); }}>
              {sample}
            </button>
          ))}
        </div>

        {plan ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-panel bg-blue-50 p-3 text-sm leading-6 text-blue-900 dark:bg-blue-500/10 dark:text-blue-100">
              <div className="flex items-center gap-2 font-semibold">
                <Sparkles className="h-4 w-4" />
                {plan.summary}
              </div>
              {plan.warnings.map((warning) => (
                <p key={warning} className="mt-1 text-xs">{warning}</p>
              ))}
            </div>
            {plan.actions.map((action) => (
              <div key={action.id} className="grid gap-3 rounded-panel border border-border p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={action.type === "delete" ? "red" : action.type === "update" ? "amber" : "green"}>{action.type === "delete" ? "削除" : action.type === "update" ? "更新" : "追加"}</Badge>
                    <p className="line-clamp-1 font-semibold">{action.title}</p>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-300">{action.reason}</p>
                  {action.type === "create" ? (
                    <p className="mt-1 text-xs text-slate-500">
                      期限 {formatDate(action.dueDate)} / {taskPriorityLabels[action.priority]} / {action.estimatedMinutes}分
                    </p>
                  ) : null}
                  {action.type === "update" && action.patch.status ? (
                    <p className="mt-1 text-xs text-slate-500">状態: {taskStatusLabels[action.patch.status]}</p>
                  ) : null}
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
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const bigTaskRef = String(form.get("bigTaskRef") ?? "");
    const selectedBranch = branchOptions.find((option) => option.value === bigTaskRef);
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

  const currentBigTaskRef = task.sourceGoalTreeId && task.sourceBranchId ? `${task.sourceGoalTreeId}::${task.sourceBranchId}` : "";

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
          <Input name="title" required defaultValue={task.title} placeholder="タイトル" />
          <Select name="bigTaskRef" defaultValue={currentBigTaskRef}>
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
  onEdit,
  onDelete,
  disabled,
  compact = false,
}: {
  task: Task;
  onStatus: (status: TaskStatus) => void;
  onEdit?: () => void;
  onDelete: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex gap-2", compact ? "flex-wrap" : "lg:flex-col")}>
      {compact ? null : (
        <Select value={task.status} onChange={(event) => onStatus(event.target.value as TaskStatus)} disabled={disabled}>
          {statuses.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
      )}
      <div className="flex gap-2">
        <QuickStatusButtons task={task} onStatus={onStatus} disabled={disabled} compact />
        {onEdit ? (
          <Button aria-label="タスク編集" title="タスク編集" variant="ghost" size={compact ? "icon" : "sm"} onClick={onEdit} disabled={disabled}>
            <Pencil className="h-4 w-4" />
            {compact ? null : "編集"}
          </Button>
        ) : null}
        <Button
          aria-label="タスク削除"
          title="タスク削除"
          className="px-3 text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
          variant="ghost"
          size="sm"
          onClick={() => {
            if (window.confirm(`「${task.title}」を削除しますか？`)) onDelete();
          }}
          disabled={disabled}
        >
          <Trash2 className="h-4 w-4 text-red-500" />
          削除
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
}: {
  task: Task;
  onStatus: (status: TaskStatus) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const size = compact ? "icon" : "sm";
  return (
    <div className="flex flex-wrap gap-2">
      <Button aria-label="開始" title="開始" size={size} variant={task.status === "in_progress" ? "secondary" : "ghost"} onClick={() => onStatus("in_progress")} disabled={disabled || task.status === "in_progress" || task.status === "done"}>
        <PlayCircle className="h-4 w-4" />
        {compact ? null : "開始"}
      </Button>
      <Button aria-label="確認へ" title="確認へ" size={size} variant={task.status === "review" ? "secondary" : "ghost"} onClick={() => onStatus("review")} disabled={disabled || task.status === "review" || task.status === "done"}>
        <Clock3 className="h-4 w-4" />
        {compact ? null : "確認"}
      </Button>
      <Button aria-label="完了" title="完了" size={size} variant={task.status === "done" ? "secondary" : "ghost"} onClick={() => onStatus("done")} disabled={disabled || task.status === "done"}>
        <CheckCircle2 className="h-4 w-4" />
        {compact ? null : "完了"}
      </Button>
    </div>
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
