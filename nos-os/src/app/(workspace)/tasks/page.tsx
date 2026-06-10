"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  CalendarPlus,
  Check,
  CheckCircle2,
  Clock3,
  GitBranch,
  Loader2,
  Mic,
  PauseCircle,
  Plus,
  Save,
  Send,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { LoadingPanel } from "@/components/domain/loading";
import { PageHeader } from "@/components/domain/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/form";
import { taskPriorityLabels, taskStatusLabels } from "@/lib/data/labels";
import { displayTaskTitle, isTestTask } from "@/lib/data/task-flags";
import { apiFetch, useScopedPath, useScopedQuery } from "@/lib/hooks/use-api";
import { useAppStore } from "@/lib/store/app-store";
import type { Employee, GoalTree, Project, Task, TaskAssistantAction, TaskAssistantPlan, TaskPriority, TaskStatus } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

type Segment = "today" | "week" | "all";
type Chip = "all" | "mine" | "high" | "progress" | "hold";
type BranchOption = {
  value: string;
  treeId: string;
  branchId: string;
  label: string;
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

export default function TasksPage() {
  const queryClient = useQueryClient();
  const session = useAppStore((state) => state.session);
  const [segment, setSegment] = useState<Segment>("today");
  const [chip, setChip] = useState<Chip>("mine");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [adding, setAdding] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [command, setCommand] = useState("");
  const [taskVoiceListening, setTaskVoiceListening] = useState(false);
  const [plan, setPlan] = useState<TaskAssistantPlan | null>(null);
  const [appliedIds, setAppliedIds] = useState<string[]>([]);

  const tasks = useScopedQuery<Task[]>(["tasks"], "/api/tasks", { sort: "dueDate" });
  const employees = useScopedQuery<Employee[]>(["employees"], "/api/employees");
  const projects = useScopedQuery<Project[]>(["projects"], "/api/projects");
  const goalTrees = useScopedQuery<GoalTree[]>(["goal-trees"], "/api/goal-trees");
  const assistantPlanPath = useScopedPath("/api/tasks/assistant-plan");

  const employeeMap = useMemo(() => new Map((employees.data ?? []).map((employee) => [employee.id, employee])), [employees.data]);
  const projectMap = useMemo(() => new Map((projects.data ?? []).map((project) => [project.id, project])), [projects.data]);
  const branchOptions = useMemo<BranchOption[]>(
    () =>
      (goalTrees.data ?? [])
        .filter((tree) => tree.scope === "company" || tree.ownerEmployeeId === session?.employeeId)
        .flatMap((tree) =>
          tree.branches.map((branch) => ({
            value: `${tree.id}::${branch.id}`,
            treeId: tree.id,
            branchId: branch.id,
            label: `${tree.title} / ${branch.title}`,
            projectId: branch.projectId,
            assigneeId: branch.assigneeId,
          })),
        ),
    [goalTrees.data, session?.employeeId],
  );

  const createTask = useMutation({
    mutationFn: (body: Partial<Task>) => apiFetch<Task>("/api/tasks", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => refreshAfterMutation(),
  });

  const updateTask = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Task> }) =>
      apiFetch<Task>(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: (task) => {
      setSelectedTask((current) => (current?.id === task.id ? task : current));
      refreshAfterMutation();
    },
  });

  const deleteTask = useMutation({
    mutationFn: (id: string) => apiFetch<{ ok: boolean }>(`/api/tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setSelectedTask(null);
      refreshAfterMutation();
    },
  });

  const buildPlan = useMutation({
    mutationFn: (message: string) =>
      apiFetch<TaskAssistantPlan>(assistantPlanPath, {
        method: "POST",
        body: JSON.stringify({ message }),
      }),
    onSuccess: (nextPlan) => {
      setPlan(nextPlan);
      setAppliedIds([]);
    },
  });

  function refreshAfterMutation() {
    void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }

  const activeTasks = useMemo(() => (tasks.data ?? []).filter((task) => task.status !== "done"), [tasks.data]);
  const visibleTasks = useMemo(() => {
    return activeTasks.filter((task) => {
      const distance = dayDistance(task.dueDate);
      if (segment === "today" && distance !== 0) return false;
      if (segment === "week" && (distance < 0 || distance > 7)) return false;
      if (chip === "mine" && session?.employeeId && ![task.primaryAssigneeId, ...task.assigneeIds].includes(session.employeeId)) return false;
      if (chip === "high" && !["urgent", "high"].includes(task.priority)) return false;
      if (chip === "progress" && task.status !== "in_progress") return false;
      if (chip === "hold" && task.priority !== "hold") return false;
      return true;
    });
  }, [activeTasks, chip, segment, session?.employeeId]);
  const personalActiveTasks = useMemo(
    () => (session?.employeeId ? activeTasks.filter((task) => [task.primaryAssigneeId, ...task.assigneeIds].includes(session.employeeId)) : activeTasks),
    [activeTasks, session?.employeeId],
  );
  const focusTask = useMemo(() => [...personalActiveTasks].sort((a, b) => b.aiPriorityScore - a.aiPriorityScore)[0] ?? null, [personalActiveTasks]);
  const stats = useMemo(
    () => ({
      today: activeTasks.filter((task) => dayDistance(task.dueDate) === 0).length,
      overdue: activeTasks.filter((task) => dayDistance(task.dueDate) < 0).length,
      inProgress: activeTasks.filter((task) => task.status === "in_progress").length,
      done: (tasks.data ?? []).filter((task) => task.status === "done").length,
    }),
    [activeTasks, tasks.data],
  );

  if (tasks.isLoading || !tasks.data || employees.isLoading || projects.isLoading) return <LoadingPanel label="タスクを準備中" />;

  function patchTask(id: string, body: Partial<Task>) {
    updateTask.mutate({ id, body });
  }

  function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const branchRef = String(form.get("branchRef") ?? "");
    const branch = branchOptions.find((option) => option.value === branchRef);
    const primaryAssigneeId = String(form.get("primaryAssigneeId") || branch?.assigneeId || session?.employeeId || "");
    const selectedProjectId = String(form.get("projectId") || "");
    createTask.mutate({
      title: String(form.get("title")),
      description: String(form.get("description") || ""),
      projectId: selectedProjectId || null,
      primaryAssigneeId,
      assigneeIds: [primaryAssigneeId],
      sourceGoalTreeId: branch?.treeId ?? null,
      sourceBranchId: branch?.branchId ?? null,
      dueDate: String(form.get("dueDate")),
      priority: String(form.get("priority")) as TaskPriority,
      status: "todo",
      estimatedMinutes: Number(form.get("estimatedMinutes") || 45),
      customerWaiting: false,
      delayRisk: 10,
    });
    setAdding(false);
  }

  function applyAction(action: TaskAssistantAction) {
    if (appliedIds.includes(action.id)) return;
    if (action.type === "delete") {
      if (!window.confirm(`「${action.title}」を削除します。元に戻せません。`)) return;
      deleteTask.mutate(action.taskId);
    }
    if (action.type === "update") {
      updateTask.mutate({ id: action.taskId, body: action.patch });
    }
    if (action.type === "create") {
      createTask.mutate({
        title: action.title,
        description: action.description,
        projectId: action.projectId,
        primaryAssigneeId: action.primaryAssigneeId,
        assigneeIds: [action.primaryAssigneeId],
        sourceGoalTreeId: action.sourceGoalTreeId ?? null,
        sourceBranchId: action.sourceBranchId ?? null,
        dueDate: action.dueDate,
        priority: action.priority,
        status: "todo",
        estimatedMinutes: action.estimatedMinutes,
        customerWaiting: false,
        delayRisk: 10,
      });
    }
    setAppliedIds((ids) => [...ids, action.id]);
  }

  function applySafeActions() {
    plan?.actions.filter((action) => action.type !== "delete").forEach(applyAction);
  }

  function startTaskVoice() {
    const SpeechRecognition = (window as Window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor })
      .SpeechRecognition ?? (window as Window & { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setPlan({
        summary: "このブラウザでは音声入力が使えません。スマホのキーボード音声入力かChromeで試してください。",
        source: "local",
        warnings: ["音声入力に未対応です。"],
        actions: [],
      });
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "ja-JP";
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const text = event.results[0]?.[0]?.transcript ?? "";
      setCommand(text);
      if (text.trim()) buildPlan.mutate(text);
    };
    recognition.onend = () => setTaskVoiceListening(false);
    setTaskVoiceListening(true);
    recognition.start();
  }

  return (
    <>
      <PageHeader
        title="タスク"
        description="案件、大タスク、小タスクのつながりを見ながら、今日やることだけに集中します。"
        kicker="TASKS"
        actions={
          <Button variant="secondary" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" />
            追加
          </Button>
        }
      />

      <section className="mb-5 grid gap-3 md:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden">
          <div className="h-2 bg-[#0B1226]" />
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-700">
                <span className="h-2 w-2 rounded-full bg-[#E08F12]" />
                いまの最優先
              </span>
              {focusTask ? <Badge tone={priorityTone(focusTask.priority)}>{taskPriorityLabels[focusTask.priority]}</Badge> : null}
            </div>
            <h2 className="mt-3 line-clamp-2 text-2xl font-extrabold leading-tight text-[#0B1226] dark:text-white">
              {focusTask ? displayTaskTitle(focusTask) : "未完了タスクはありません"}
            </h2>
            {focusTask ? (
              <TaskContext task={focusTask} project={focusTask.projectId ? projectMap.get(focusTask.projectId) : undefined} employee={employeeMap.get(focusTask.primaryAssigneeId)} />
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {focusTask ? (
                <>
                  <Button onClick={() => patchTask(focusTask.id, { status: "in_progress" })}>
                    <Clock3 className="h-4 w-4" />
                    開始する
                  </Button>
                  <Button variant="ghost" onClick={() => setSelectedTask(focusTask)}>
                    詳細
                  </Button>
                </>
              ) : null}
              <Button variant="ghost" className="text-indigo-600" onClick={() => setAssistantOpen(true)}>
                <Bot className="h-4 w-4" />
                AIに整理してもらう
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <StatTile label="今日" value={stats.today} />
          <StatTile label="超過" value={stats.overdue} danger={stats.overdue > 0} />
          <StatTile label="進行中" value={stats.inProgress} />
          <StatTile label="完了" value={stats.done} />
        </div>
      </section>

      <Card className="mb-5">
        <CardContent className="space-y-3 p-3">
          <div className="grid grid-cols-3 rounded-[18px] bg-slate-100 p-1 dark:bg-white/10">
            {([
              ["today", "今日"],
              ["week", "今週"],
              ["all", "すべて"],
            ] as Array<[Segment, string]>).map(([value, label]) => (
              <button
                key={value}
                className={cn("h-11 rounded-[14px] text-sm font-extrabold text-slate-500 transition dark:text-slate-200", segment === value && "bg-white text-[#0B1226] shadow-soft dark:bg-[#F4F6FA] dark:text-[#050816]")}
                onClick={() => setSegment(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              ["all", "全部"],
              ["mine", "自分の担当"],
              ["high", "優先度高"],
              ["progress", "進行中"],
              ["hold", "保留"],
            ] as Array<[Chip, string]>).map(([value, label]) => (
              <button
                key={value}
                className={cn(
                  "h-11 shrink-0 rounded-full px-3 text-xs font-extrabold transition",
                  chip === value ? "bg-[#0B1226] text-white dark:bg-[#F4F6FA] dark:text-[#050816]" : "bg-white text-slate-600 ring-1 ring-border dark:bg-white/5 dark:text-slate-200 dark:ring-white/10",
                )}
                onClick={() => setChip(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        {visibleTasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            project={task.projectId ? projectMap.get(task.projectId) : undefined}
            employee={employeeMap.get(task.primaryAssigneeId)}
            onOpen={() => setSelectedTask(task)}
            onDone={() => patchTask(task.id, { status: "done" })}
            disabled={updateTask.isPending}
          />
        ))}
        {!visibleTasks.length ? (
          <Card>
            <CardContent className="p-5 text-sm text-slate-500">この条件のタスクはありません。右上の追加、またはAI整理から作成できます。</CardContent>
          </Card>
        ) : null}
      </section>

      <button
        className="fixed bottom-24 right-4 z-20 grid h-14 w-14 place-items-center rounded-full bg-[#E08F12] text-white shadow-command lg:hidden"
        onClick={() => setAdding(true)}
        aria-label="タスク追加"
      >
        <Plus className="h-6 w-6" />
      </button>

      {selectedTask ? (
        <TaskSheet
          task={selectedTask}
          project={selectedTask.projectId ? projectMap.get(selectedTask.projectId) : undefined}
          employee={employeeMap.get(selectedTask.primaryAssigneeId)}
          onClose={() => setSelectedTask(null)}
          onPatch={(body) => patchTask(selectedTask.id, body)}
          onDelete={() => {
            if (window.confirm(`「${displayTaskTitle(selectedTask)}」を削除します。元に戻せません。`)) deleteTask.mutate(selectedTask.id);
          }}
          disabled={updateTask.isPending || deleteTask.isPending}
        />
      ) : null}

      {adding ? (
        <BottomSheet title="タスクを追加" onClose={() => setAdding(false)}>
          <form onSubmit={submitTask} className="grid gap-3">
            <Input name="title" required placeholder="小タスク名" />
            <Select name="branchRef">
              <option value="">大タスクを選択しない</option>
              {branchOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select name="projectId" defaultValue="">
              <option value="">案件名を入力しない</option>
              {(projects.data ?? []).map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </Select>
            <Select name="primaryAssigneeId" required defaultValue={session?.employeeId}>
              {(employees.data ?? []).map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.name}</option>
              ))}
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Input name="dueDate" required type="date" defaultValue={todayInputValue()} />
              <Input name="estimatedMinutes" min={5} step={5} type="number" defaultValue={45} />
            </div>
            <Select name="priority" defaultValue="normal">
              {priorities.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
            <Textarea name="description" placeholder="内容メモ" />
            <Button type="submit" variant="secondary" disabled={createTask.isPending}>
              <Save className="h-4 w-4" />
              保存する
            </Button>
          </form>
        </BottomSheet>
      ) : null}

      {assistantOpen ? (
        <BottomSheet title="AIにタスクを整理してもらう" onClose={() => setAssistantOpen(false)}>
          <div className="space-y-4">
            <div className="rounded-panel bg-indigo-50 p-3 text-sm font-semibold leading-6 text-indigo-900 dark:bg-indigo-400/15 dark:text-indigo-100">
              声でもOK。AIは提案だけ作ります。「減らして」は保留にします。
            </div>
            <div className="grid grid-cols-[1fr_48px_48px] gap-2">
              <Input value={command} onChange={(event) => setCommand(event.target.value)} placeholder="例: 今日のタスクを整理して" />
              <Button size="icon" disabled={buildPlan.isPending || !command.trim()} onClick={() => buildPlan.mutate(command)}>
                {buildPlan.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
              <Button size="icon" variant={taskVoiceListening ? "danger" : "ghost"} aria-label="音声入力" title="音声入力" onClick={startTaskVoice}>
                <Mic className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:overflow-x-auto sm:pb-1 sm:scrollbar-none">
              {["今日のタスクを整理して", "優先度が低いものを保留にして", "この作業を小タスクに分けて", "明日の準備を作って"].map((sample) => (
                <button
                  key={sample}
                  className="h-11 min-w-0 rounded-full bg-slate-100 px-3 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-slate-100 sm:shrink-0"
                  onClick={() => {
                    setCommand(sample);
                    buildPlan.mutate(sample);
                  }}
                >
                  {sample}
                </button>
              ))}
            </div>

            {plan ? (
              <div className="space-y-3">
                <div className="rounded-panel bg-white p-3 ring-1 ring-border dark:bg-white/5 dark:ring-white/10">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold text-[#0B1226] dark:text-white">整理提案</p>
                    <Badge tone={plan.source === "openai" ? "blue" : "slate"}>{plan.source === "openai" ? "OpenAI" : "Local"}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-200">提案数: {plan.actions.length}件。削除は個別確認が必要です。</p>
                  {plan.actions.some((action) => action.type !== "delete") ? (
                    <Button className="mt-3" size="sm" variant="ghost" onClick={applySafeActions}>
                      <CheckCircle2 className="h-4 w-4" />
                      削除以外を反映
                    </Button>
                  ) : null}
                </div>
                {plan.actions.map((action) => (
                  <AssistantActionCard key={action.id} action={action} applied={appliedIds.includes(action.id)} onApply={() => applyAction(action)} />
                ))}
              </div>
            ) : null}
          </div>
        </BottomSheet>
      ) : null}
    </>
  );
}

function TaskRow({
  task,
  project,
  employee,
  onOpen,
  onDone,
  disabled,
}: {
  task: Task;
  project?: Project;
  employee?: Employee;
  onOpen: () => void;
  onDone: () => void;
  disabled?: boolean;
}) {
  const distance = dayDistance(task.dueDate);
  return (
    <Card className={cn("overflow-hidden", isTestTask(task) && "bg-amber-50/50 dark:bg-amber-400/10")}>
      <CardContent className="grid grid-cols-[44px_1fr] gap-3 p-3">
        <button
          className="mt-1 grid h-11 w-11 place-items-center rounded-full border-2 border-slate-200 bg-white text-slate-300 transition hover:border-emerald-400 hover:text-emerald-500 dark:border-white/15 dark:bg-[#050816] dark:text-slate-300"
          onClick={onDone}
          disabled={disabled}
          aria-label="完了"
        >
          <Check className="h-5 w-5" />
        </button>
        <button className="min-w-0 text-left" onClick={onOpen}>
          <div className="flex flex-wrap items-center gap-2">
            {isTestTask(task) ? <Badge tone="amber">テスト</Badge> : null}
            <Badge tone={priorityTone(task.priority)}>{taskPriorityLabels[task.priority]}</Badge>
            <Badge tone={statusTone(task.status)}>{taskStatusLabels[task.status]}</Badge>
            <Badge tone={distance < 0 ? "red" : distance === 0 ? "amber" : "slate"}>{distance < 0 ? "超過" : distance === 0 ? "今日" : formatDate(task.dueDate)}</Badge>
          </div>
          <p className="mt-2 line-clamp-2 break-words text-[15px] font-extrabold leading-6 text-[#0B1226] dark:text-white">{displayTaskTitle(task)}</p>
          <TaskContext task={task} project={project} employee={employee} compact />
        </button>
      </CardContent>
    </Card>
  );
}

function TaskContext({ task, project, employee, compact = false }: { task: Task; project?: Project; employee?: Employee; compact?: boolean }) {
  return (
    <div className={cn("mt-3 flex flex-wrap gap-1.5 text-xs text-slate-500", compact && "mt-2")}>
      {project ? (
        <ContextPill icon={<BriefcaseBusiness className="h-3.5 w-3.5" />} label={`案件: ${project.name}`} />
      ) : (
        <ContextPill icon={<BriefcaseBusiness className="h-3.5 w-3.5" />} label="案件なし" />
      )}
      {task.sourceBranchTitle ? <ContextPill icon={<GitBranch className="h-3.5 w-3.5" />} label={`大タスク: ${task.sourceBranchTitle}`} ai /> : null}
      {employee ? <ContextPill icon={<UserRound className="h-3.5 w-3.5" />} label={`担当: ${employee.name}`} /> : null}
    </div>
  );
}

function ContextPill({ icon, label, ai = false }: { icon: React.ReactNode; label: string; ai?: boolean }) {
  return (
    <span className={cn("inline-flex min-w-0 max-w-full items-center gap-1 rounded-full px-2 py-1", ai ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-400/20 dark:text-indigo-100" : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-100")}>
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </span>
  );
}

function TaskSheet({
  task,
  project,
  employee,
  onClose,
  onPatch,
  onDelete,
  disabled,
}: {
  task: Task;
  project?: Project;
  employee?: Employee;
  onClose: () => void;
  onPatch: (body: Partial<Task>) => void;
  onDelete: () => void;
  disabled?: boolean;
}) {
  const icsPath = useScopedPath(`/api/calendar/tasks/${task.id}/ics`);
  const googlePath = useScopedPath(`/api/calendar/tasks/${task.id}/google`);
  return (
    <BottomSheet title="タスク詳細" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={priorityTone(task.priority)}>{taskPriorityLabels[task.priority]}</Badge>
            <Badge tone={statusTone(task.status)}>{taskStatusLabels[task.status]}</Badge>
            <Badge tone="slate">{formatDate(task.dueDate)}</Badge>
          </div>
          <h2 className="mt-3 text-xl font-extrabold leading-7 text-[#0B1226] dark:text-white">{displayTaskTitle(task)}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-200">{task.description || "説明はありません。"}</p>
          <TaskContext task={task} project={project} employee={employee} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => onPatch({ status: "in_progress" })} disabled={disabled || task.status === "in_progress"}>
            <Clock3 className="h-4 w-4" />
            開始
          </Button>
          <Button variant="ghost" onClick={() => onPatch({ status: "review" })} disabled={disabled || task.status === "review"}>
            確認待ち
          </Button>
          <Button variant="ghost" onClick={() => onPatch({ priority: task.priority === "hold" ? "normal" : "hold" })} disabled={disabled || task.status === "done"}>
            <PauseCircle className="h-4 w-4" />
            {task.priority === "hold" ? "戻す" : "保留"}
          </Button>
          <Button variant="secondary" onClick={() => onPatch({ status: "done" })} disabled={disabled || task.status === "done"}>
            <CheckCircle2 className="h-4 w-4" />
            完了
          </Button>
          <a href={icsPath} className="inline-flex h-11 items-center justify-center gap-2 rounded-panel bg-slate-100 text-sm font-bold text-[#0B1226] dark:bg-white/10 dark:text-white">
            <CalendarDays className="h-4 w-4" />
            ICS
          </a>
          <a href={googlePath} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-panel bg-slate-100 text-sm font-bold text-[#0B1226] dark:bg-white/10 dark:text-white">
            <CalendarPlus className="h-4 w-4" />
            Google
          </a>
        </div>
        <Button variant="danger" className="w-full" onClick={onDelete} disabled={disabled}>
          <Trash2 className="h-4 w-4" />
          削除する
        </Button>
      </div>
    </BottomSheet>
  );
}

function AssistantActionCard({ action, applied, onApply }: { action: TaskAssistantAction; applied: boolean; onApply: () => void }) {
  const tone = action.type === "delete" ? "red" : action.type === "update" ? "amber" : "green";
  const label = action.type === "delete" ? "削除" : action.type === "update" && action.patch.priority === "hold" ? "保留" : action.type === "update" ? "更新" : "追加";
  return (
    <div className="rounded-panel bg-white p-3 ring-1 ring-border dark:bg-white/5 dark:ring-white/10">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={tone}>{label}</Badge>
        <p className="min-w-0 flex-1 truncate font-bold text-[#0B1226] dark:text-white">{action.title}</p>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-200">{action.reason || "AIからの整理提案です。"}</p>
      <Button className="mt-3 w-full" variant={action.type === "delete" ? "danger" : "ghost"} onClick={onApply} disabled={applied}>
        {applied ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
        {applied ? "反映済み" : "反映する"}
      </Button>
    </div>
  );
}

function BottomSheet({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0B1226]/35 px-3 backdrop-blur-sm">
      <div className="safe-bottom w-full max-w-2xl rounded-t-[28px] bg-[#F4F6FA] p-4 shadow-command dark:bg-[#050816]">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-lg font-extrabold text-[#0B1226] dark:text-white">{title}</p>
          <button className="grid h-11 w-11 place-items-center rounded-full bg-white text-slate-500 shadow-soft dark:bg-white/10 dark:text-slate-100 dark:shadow-none" onClick={onClose} aria-label="閉じる">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[72vh] overflow-y-auto pb-2">{children}</div>
      </div>
    </div>
  );
}

function StatTile({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-xs font-bold text-slate-500">{label}</p>
        <p className={cn("mt-2 text-2xl font-extrabold", danger ? "text-red-600 dark:text-red-300" : "text-[#0B1226] dark:text-white")}>{value}</p>
      </CardContent>
    </Card>
  );
}

function priorityTone(priority: TaskPriority) {
  if (priority === "urgent") return "red";
  if (priority === "high") return "amber";
  if (priority === "hold") return "slate";
  return "blue";
}

function statusTone(status: TaskStatus) {
  if (status === "done") return "green";
  if (status === "review") return "amber";
  if (status === "in_progress") return "blue";
  return "slate";
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
