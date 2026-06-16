"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, CalendarDays, CheckCircle2, Eye, GitBranch, Plus, Target, Trash2, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { apiFetch, useScopedQuery } from "@/lib/hooks/use-api";
import { useAppStore } from "@/lib/store/app-store";
import type { Employee, GoalTree, GoalTreeBranch, GoalTreeMetric, GoalTreeScope, GoalTreeTask, Project, RevenueSummary, Task } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

const scopeLabels: Record<GoalTreeScope, string> = {
  company: "全体",
  daily: "今日",
  personal: "個人",
};

const scopeOrder: Record<GoalTreeScope, number> = {
  company: 0,
  daily: 1,
  personal: 2,
};

export function GoalTreeBoard({
  revenue,
  focusEmployeeId,
  compact = false,
}: {
  revenue: RevenueSummary;
  focusEmployeeId?: string;
  compact?: boolean;
}) {
  const queryClient = useQueryClient();
  const session = useAppStore((state) => state.session);
  const treesQuery = useScopedQuery<GoalTree[]>(["goal-trees"], "/api/goal-trees");
  const employeesQuery = useScopedQuery<Employee[]>(["goal-tree-employees"], "/api/employees");
  const projectsQuery = useScopedQuery<Project[]>(["goal-tree-projects"], "/api/projects");
  const [draftTrees, setDraftTrees] = useState<GoalTree[]>([]);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [mobileEditorOpen, setMobileEditorOpen] = useState(false);

  useEffect(() => {
    if (treesQuery.data) setDraftTrees(treesQuery.data);
  }, [treesQuery.data]);

  const employees = useMemo(() => employeesQuery.data ?? [], [employeesQuery.data]);
  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
  const employeeMap = useMemo(() => new Map(employees.map((employee) => [employee.id, employee])), [employees]);
  const visibleTrees = useMemo(
    () =>
      compact
        ? draftTrees.filter((tree) => tree.scope === "company" || tree.ownerEmployeeId === (focusEmployeeId ?? session?.employeeId))
        : draftTrees,
    [compact, draftTrees, focusEmployeeId, session?.employeeId],
  );
  const sortedTrees = useMemo(
    () => [...visibleTrees].sort((a, b) => scopeOrder[a.scope] - scopeOrder[b.scope] || a.title.localeCompare(b.title)),
    [visibleTrees],
  );
  const focusedEmployeeId = focusEmployeeId ?? session?.employeeId;
  const companyTree = sortedTrees.find((tree) => tree.scope === "company") ?? null;
  const focusedTrees = sortedTrees.filter((tree) => tree.scope !== "company" && (!focusedEmployeeId || tree.ownerEmployeeId === focusedEmployeeId));
  const todayBranch = findTodayBranch(focusedTrees, focusedEmployeeId);
  const untaskedCount = countUntaskedTreeTasks(sortedTrees, focusedEmployeeId);
  const companyProgress = companyTree ? goalTreeProgress(companyTree, revenue) : null;

  function scoped(path: string) {
    return path;
  }

  const createTree = useMutation({
    mutationFn: (scope: GoalTreeScope) =>
      apiFetch<GoalTree>(scoped("/api/goal-trees"), {
        method: "POST",
        body: JSON.stringify({
          scope,
          ownerEmployeeId: scope === "company" ? null : session?.employeeId,
          title: scopeLabels[scope],
          goal: scope === "company" ? "2026年12月に1000万円達成" : scope === "daily" ? "今日やること" : "個人目標",
        }),
      }),
    onSuccess: (tree) => {
      setDraftTrees((current) => [tree, ...current.filter((item) => item.id !== tree.id)]);
      void queryClient.invalidateQueries({ queryKey: ["goal-trees"] });
    },
  });

  const saveTree = useMutation({
    mutationFn: (tree: GoalTree) =>
      apiFetch<GoalTree>(scoped(`/api/goal-trees/${tree.id}`), {
        method: "PATCH",
        body: JSON.stringify(tree),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["goal-trees"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const deleteTree = useMutation({
    mutationFn: (treeId: string) => apiFetch<{ ok: boolean }>(scoped(`/api/goal-trees/${treeId}`), { method: "DELETE" }),
    onMutate: (treeId) => {
      setDraftTrees((current) => current.filter((tree) => tree.id !== treeId));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["goal-trees"] });
    },
  });

  function updateLocalTree(treeId: string, updater: (tree: GoalTree) => GoalTree) {
    setDraftTrees((current) => current.map((tree) => (tree.id === treeId ? updater(tree) : tree)));
  }

  function updateAndSaveTree(treeId: string, updater: (tree: GoalTree) => GoalTree) {
    const currentTree = draftTrees.find((tree) => tree.id === treeId);
    if (!currentTree) return;
    const nextTree = { ...updater(currentTree), updatedAt: new Date().toISOString() };
    setDraftTrees((current) => current.map((tree) => (tree.id === treeId ? nextTree : tree)));
    saveTree.mutate(nextTree);
  }

  function persistTree(treeId: string) {
    const tree = draftTrees.find((item) => item.id === treeId);
    if (tree) saveTree.mutate(tree);
  }

  function addMetric(treeId: string) {
    updateAndSaveTree(treeId, (tree) => ({
      ...tree,
      metrics: [...tree.metrics, { id: uid("metric"), label: "数値", current: 0, target: 100, unit: "" }],
    }));
  }

  function updateMetric(treeId: string, metricId: string, patch: Partial<GoalTreeMetric>) {
    updateLocalTree(treeId, (tree) => ({
      ...tree,
      metrics: tree.metrics.map((metric) => (metric.id === metricId ? { ...metric, ...patch } : metric)),
    }));
  }

  function deleteMetric(treeId: string, metricId: string) {
    updateAndSaveTree(treeId, (tree) => ({ ...tree, metrics: tree.metrics.filter((metric) => metric.id !== metricId) }));
  }

  function addBranch(treeId: string) {
    updateAndSaveTree(treeId, (tree) => ({
      ...tree,
      branches: [
        ...tree.branches,
        {
          id: uid("branch"),
          title: "枝",
          dueDate: tree.dueDate,
          assigneeId: tree.ownerEmployeeId ?? session?.employeeId ?? null,
          projectId: projects[0]?.id ?? null,
          tasks: [{ id: uid("tree-task"), title: "小タスク", dueDate: tree.dueDate, assigneeId: tree.ownerEmployeeId ?? session?.employeeId ?? null, taskId: null }],
        },
      ],
    }));
  }

  function updateBranch(treeId: string, branchId: string, patch: Partial<GoalTreeBranch>) {
    updateLocalTree(treeId, (tree) => ({
      ...tree,
      branches: tree.branches.map((branch) => (branch.id === branchId ? { ...branch, ...patch } : branch)),
    }));
  }

  function deleteBranch(treeId: string, branchId: string) {
    updateAndSaveTree(treeId, (tree) => ({ ...tree, branches: tree.branches.filter((branch) => branch.id !== branchId) }));
  }

  function addTreeTask(treeId: string, branchId: string) {
    updateAndSaveTree(treeId, (tree) => ({
      ...tree,
      branches: tree.branches.map((branch) =>
        branch.id === branchId
          ? {
              ...branch,
              tasks: [...branch.tasks, { id: uid("tree-task"), title: "小タスク", dueDate: branch.dueDate, assigneeId: branch.assigneeId, taskId: null }],
            }
          : branch,
      ),
    }));
  }

  function updateTreeTask(treeId: string, branchId: string, taskId: string, patch: Partial<GoalTreeTask>) {
    updateLocalTree(treeId, (tree) => ({
      ...tree,
      branches: tree.branches.map((branch) =>
        branch.id === branchId
          ? { ...branch, tasks: branch.tasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task)) }
          : branch,
      ),
    }));
  }

  function deleteTreeTask(treeId: string, branchId: string, taskId: string) {
    updateAndSaveTree(treeId, (tree) => ({
      ...tree,
      branches: tree.branches.map((branch) =>
        branch.id === branchId ? { ...branch, tasks: branch.tasks.filter((task) => task.id !== taskId) } : branch,
      ),
    }));
  }

  async function materializeTask(tree: GoalTree, branch: GoalTreeBranch, treeTask: GoalTreeTask) {
    if (treeTask.taskId || !treeTask.title.trim()) return;
    const assigneeId = treeTask.assigneeId ?? branch.assigneeId ?? tree.ownerEmployeeId ?? session?.employeeId ?? employees[0]?.id;
    if (!assigneeId) return;
    setBusyTaskId(treeTask.id);
    try {
      const created = await apiFetch<Task>(scoped("/api/tasks"), {
        method: "POST",
        body: JSON.stringify({
          title: treeTask.title,
          description: `${tree.title} > ${branch.title}`,
          projectId: branch.projectId ?? projects[0]?.id,
          primaryAssigneeId: assigneeId,
          assigneeIds: [assigneeId],
          dueDate: treeTask.dueDate || branch.dueDate || tree.dueDate,
          priority: tree.scope === "daily" ? "urgent" : "normal",
          status: "todo",
          delayRisk: tree.scope === "daily" ? 65 : 20,
          estimatedMinutes: 45,
        }),
      });
      const nextTree = {
        ...tree,
        branches: tree.branches.map((item) =>
          item.id === branch.id
            ? { ...item, tasks: item.tasks.map((task) => (task.id === treeTask.id ? { ...task, taskId: created.id } : task)) }
            : item,
        ),
        updatedAt: new Date().toISOString(),
      };
      setDraftTrees((current) => current.map((item) => (item.id === tree.id ? nextTree : item)));
      await apiFetch<GoalTree>(scoped(`/api/goal-trees/${tree.id}`), { method: "PATCH", body: JSON.stringify(nextTree) });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["goal-trees"] });
    } finally {
      setBusyTaskId(null);
    }
  }

  if (treesQuery.isLoading) return <Card className="mt-5"><CardContent className="p-4 text-sm text-slate-500">目標ツリーを読み込み中</CardContent></Card>;

  const board = (
    <Card className="mt-5" data-testid="goal-tree">
      <CardHeader className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-4 w-4 text-accent" />
            目標ツリー
          </CardTitle>
          {compact ? (
            <p className="mt-1 flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-300">
              <Eye className="h-3.5 w-3.5" />
              全体 + 自分だけ
            </p>
          ) : null}
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          {session?.role === "admin" ? (
            <Button data-testid="goal-add-company" size="sm" variant="ghost" onClick={() => createTree.mutate("company")}>
              <Plus className="h-4 w-4" />
              全体
            </Button>
          ) : null}
          <Button data-testid="goal-add-daily" size="sm" variant="ghost" onClick={() => createTree.mutate("daily")}>
            <Plus className="h-4 w-4" />
            今日
          </Button>
          <Button data-testid="goal-add-personal" size="sm" variant="secondary" onClick={() => createTree.mutate("personal")}>
            <Plus className="h-4 w-4" />
            個人
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedTrees.map((tree) => {
          const owner = tree.ownerEmployeeId ? employeeMap.get(tree.ownerEmployeeId) : null;
          const canEdit = session?.role === "admin" || tree.ownerEmployeeId === session?.employeeId;
          const Icon = tree.scope === "company" ? Building2 : tree.scope === "daily" ? CalendarDays : UserRound;

          return (
            <div key={tree.id} className="rounded-panel border border-border p-4 dark:border-white/10" data-goal-id={tree.id} data-testid="goal-card">
              <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-panel bg-slate-50 dark:bg-white/10">
                    <Icon className="h-5 w-5 text-accent" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={tree.scope === "company" ? "blue" : tree.scope === "daily" ? "red" : "green"}>{scopeLabels[tree.scope]}</Badge>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-300">{owner?.name ?? "会社全体"}</span>
                    </div>
                    <div className="mt-2 grid gap-2 md:grid-cols-[0.55fr_1fr_150px]">
                      <Input className="h-11 font-semibold" value={tree.title} disabled={!canEdit} onBlur={() => persistTree(tree.id)} onChange={(event) => updateLocalTree(tree.id, (item) => ({ ...item, title: event.target.value }))} />
                      <Input className="h-11 font-bold" value={tree.goal} disabled={!canEdit} onBlur={() => persistTree(tree.id)} onChange={(event) => updateLocalTree(tree.id, (item) => ({ ...item, goal: event.target.value }))} />
                      <Input className="h-11" type="date" value={dateInputValue(tree.dueDate)} disabled={!canEdit} onBlur={() => persistTree(tree.id)} onChange={(event) => updateLocalTree(tree.id, (item) => ({ ...item, dueDate: isoFromDateInput(event.target.value, item.dueDate) }))} />
                    </div>
                    {session?.role === "admin" && tree.scope !== "company" ? (
                      <Select className="mt-2 max-w-xs" value={tree.ownerEmployeeId ?? ""} onBlur={() => persistTree(tree.id)} onChange={(event) => updateLocalTree(tree.id, (item) => ({ ...item, ownerEmployeeId: event.target.value || null }))}>
                        {employees.map((employee) => (
                          <option key={employee.id} value={employee.id}>{employee.name}</option>
                        ))}
                      </Select>
                    ) : null}
                  </div>
                </div>
                {canEdit ? (
                  <Button aria-label="目標を削除" title="目標を削除" size="icon" variant="ghost" onClick={() => deleteTree.mutate(tree.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                ) : null}
              </div>

              {tree.scope === "company" ? <SalesSnapshot tree={tree} revenue={revenue} /> : null}

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="space-y-3">
                  {tree.metrics.map((metric) => {
                    const rate = metric.target > 0 ? Math.min(100, Math.max(0, Math.round((metric.current / metric.target) * 100))) : 0;
                    return (
                      <div key={metric.id} className="rounded-panel bg-slate-50 p-3 dark:bg-white/5">
                        <div className="grid gap-2 sm:grid-cols-[1fr_90px_90px_70px_auto]">
                          <Input className="h-11" value={metric.label} disabled={!canEdit} onBlur={() => persistTree(tree.id)} onChange={(event) => updateMetric(tree.id, metric.id, { label: event.target.value })} />
                          <Input className="h-11" inputMode="numeric" type="number" value={metric.current} disabled={!canEdit} onBlur={() => persistTree(tree.id)} onChange={(event) => updateMetric(tree.id, metric.id, { current: Number(event.target.value) })} />
                          <Input className="h-11" inputMode="numeric" type="number" value={metric.target} disabled={!canEdit} onBlur={() => persistTree(tree.id)} onChange={(event) => updateMetric(tree.id, metric.id, { target: Number(event.target.value) })} />
                          <Input className="h-11" value={metric.unit} disabled={!canEdit} onBlur={() => persistTree(tree.id)} onChange={(event) => updateMetric(tree.id, metric.id, { unit: event.target.value })} />
                          {canEdit ? (
                            <Button data-testid="metric-delete" aria-label="数値を削除" title="数値を削除" size="icon" variant="ghost" onClick={() => deleteMetric(tree.id, metric.id)}>
                              <X className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                        <div className="mt-3 flex items-center gap-3">
                          <div className="h-2 flex-1 rounded-full bg-white dark:bg-slate-950">
                            <div className="h-2 rounded-full bg-success" style={{ width: `${rate}%` }} />
                          </div>
                          <span className="w-12 text-right text-xs font-semibold">{rate}%</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {metric.current.toLocaleString()} / {metric.target.toLocaleString()}
                          {metric.unit}
                        </p>
                      </div>
                    );
                  })}
                  {canEdit ? (
                    <Button data-testid="metric-add" size="sm" variant="ghost" onClick={() => addMetric(tree.id)}>
                      <Plus className="h-4 w-4" />
                      数値
                    </Button>
                  ) : null}
                </div>

                <div className="grid gap-3">
                  {tree.branches.map((branch) => (
                    <div key={branch.id} className="rounded-panel bg-slate-50 p-3 dark:bg-white/5">
                      <div className="grid gap-2 md:grid-cols-[1fr_130px]">
                        <div className="flex min-w-0 items-center gap-2">
                          <GitBranch className="h-4 w-4 shrink-0 text-slate-400" />
                          <Input className="h-11 font-semibold" value={branch.title} disabled={!canEdit} onBlur={() => persistTree(tree.id)} onChange={(event) => updateBranch(tree.id, branch.id, { title: event.target.value })} />
                          {canEdit ? (
                            <Button data-testid="branch-delete" aria-label="枝を削除" title="枝を削除" size="icon" variant="ghost" onClick={() => deleteBranch(tree.id, branch.id)}>
                              <X className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                        <Input className="h-11" type="date" value={dateInputValue(branch.dueDate)} disabled={!canEdit} onBlur={() => persistTree(tree.id)} onChange={(event) => updateBranch(tree.id, branch.id, { dueDate: isoFromDateInput(event.target.value, branch.dueDate) })} />
                      </div>
                      <div className="mt-2 grid gap-2 md:grid-cols-2">
                        <Select value={branch.assigneeId ?? ""} disabled={!canEdit} onBlur={() => persistTree(tree.id)} onChange={(event) => updateBranch(tree.id, branch.id, { assigneeId: event.target.value || null })}>
                          <option value="">担当なし</option>
                          {employees.map((employee) => (
                            <option key={employee.id} value={employee.id}>{employee.name}</option>
                          ))}
                        </Select>
                        <Select value={branch.projectId ?? ""} disabled={!canEdit} onBlur={() => persistTree(tree.id)} onChange={(event) => updateBranch(tree.id, branch.id, { projectId: event.target.value || null })}>
                          <option value="">案件なし</option>
                          {projects.map((project) => (
                            <option key={project.id} value={project.id}>{project.name}</option>
                          ))}
                        </Select>
                      </div>

                      <div className="mt-3 grid gap-2">
                        {branch.tasks.map((treeTask) => (
                          <div key={treeTask.id} className="grid grid-cols-[1fr_auto] gap-2 rounded-panel bg-white p-2 dark:bg-slate-950 md:grid-cols-[1fr_130px_150px_auto_auto]">
                            <Input className="col-span-2 h-11 md:col-span-1" value={treeTask.title} disabled={!canEdit} onBlur={() => persistTree(tree.id)} onChange={(event) => updateTreeTask(tree.id, branch.id, treeTask.id, { title: event.target.value })} />
                            <Input className="h-11" type="date" value={dateInputValue(treeTask.dueDate)} disabled={!canEdit} onBlur={() => persistTree(tree.id)} onChange={(event) => updateTreeTask(tree.id, branch.id, treeTask.id, { dueDate: isoFromDateInput(event.target.value, treeTask.dueDate) })} />
                            <Select className="col-span-2 md:col-span-1" value={treeTask.assigneeId ?? ""} disabled={!canEdit} onBlur={() => persistTree(tree.id)} onChange={(event) => updateTreeTask(tree.id, branch.id, treeTask.id, { assigneeId: event.target.value || null })}>
                              <option value="">担当なし</option>
                              {employees.map((employee) => (
                                <option key={employee.id} value={employee.id}>{employee.name}</option>
                              ))}
                            </Select>
                            {treeTask.taskId ? (
                              <span
                                className="inline-flex h-11 w-full items-center justify-center gap-1 rounded-panel bg-emerald-50 px-3 text-sm font-extrabold text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-400/15 dark:text-emerald-100 dark:ring-emerald-400/20"
                                data-testid="tree-task-materialized"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                済み
                              </span>
                            ) : canEdit ? (
                              <Button className="w-full" data-testid="tree-task-materialize" size="sm" variant="ghost" disabled={busyTaskId === treeTask.id} onClick={() => materializeTask(tree, branch, treeTask)}>
                                <Plus className="h-4 w-4" />
                                タスク化
                              </Button>
                            ) : (
                              <span className="inline-flex h-11 w-full items-center justify-center gap-1 rounded-panel bg-slate-100 px-3 text-sm font-extrabold text-slate-600 dark:bg-white/5 dark:text-slate-200">
                                <Eye className="h-4 w-4" />
                                見るだけ
                              </span>
                            )}
                            {canEdit ? (
                              <Button data-testid="task-delete" aria-label="小タスクを削除" title="小タスクを削除" size="icon" variant="ghost" onClick={() => deleteTreeTask(tree.id, branch.id, treeTask.id)}>
                                <X className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                      {canEdit ? (
                        <Button data-testid="task-add" className="mt-3" size="sm" variant="ghost" onClick={() => addTreeTask(tree.id, branch.id)}>
                          <Plus className="h-4 w-4" />
                          小タスク
                        </Button>
                      ) : null}
                    </div>
                  ))}
                  {canEdit ? (
                    <Button data-testid="branch-add" size="sm" variant="ghost" onClick={() => addBranch(tree.id)}>
                      <Plus className="h-4 w-4" />
                      枝
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
        {sortedTrees.length === 0 ? <p className="rounded-panel bg-slate-50 p-4 text-sm text-slate-500 dark:bg-white/5">目標はまだありません。</p> : null}
      </CardContent>
    </Card>
  );

  if (compact) {
    return (
      <>
        <GoalTreeMobileSummary
          companyTree={companyTree}
          companyProgress={companyProgress}
          todayBranch={todayBranch}
          untaskedCount={untaskedCount}
          onEdit={() => setMobileEditorOpen(true)}
        />
        <div className="hidden md:block">{board}</div>
        {mobileEditorOpen ? (
          <GoalTreeMobileSheet onClose={() => setMobileEditorOpen(false)}>
            {board}
          </GoalTreeMobileSheet>
        ) : null}
      </>
    );
  }

  return board;
}

function GoalTreeMobileSummary({
  companyTree,
  companyProgress,
  todayBranch,
  untaskedCount,
  onEdit,
}: {
  companyTree: GoalTree | null;
  companyProgress: number | null;
  todayBranch: GoalTreeBranch | null;
  untaskedCount: number;
  onEdit: () => void;
}) {
  return (
    <Card className="mt-5 md:hidden" data-testid="goal-tree-mobile-summary">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <Target className="h-4 w-4 text-accent" />
          目標ツリー
        </CardTitle>
        <Button size="sm" variant="ghost" onClick={onEdit}>
          編集する
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-panel bg-slate-50 p-3 dark:bg-white/5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-slate-500 dark:text-slate-300">会社目標</p>
              <p className="mt-1 truncate font-extrabold text-[#0B1226] dark:text-white">{companyTree?.goal ?? "会社目標は未設定です"}</p>
            </div>
            <span className="shrink-0 text-2xl font-extrabold text-[#E08F12]">{companyProgress ?? 0}%</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-white dark:bg-slate-950">
            <div className="h-2 rounded-full bg-[#E08F12]" style={{ width: `${companyProgress ?? 0}%` }} />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-panel bg-indigo-50 p-3 text-indigo-900 dark:bg-indigo-400/15 dark:text-indigo-100">
            <p className="text-xs font-extrabold opacity-80">自分の今日の枝</p>
            <p className="mt-1 line-clamp-2 font-extrabold leading-6">{todayBranch?.title ?? "今日の枝は未設定です"}</p>
          </div>
          <div className="rounded-panel bg-emerald-50 p-3 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-100">
            <p className="text-xs font-extrabold opacity-80">未タスク化</p>
            <p className="mt-1 text-2xl font-extrabold">{untaskedCount}件</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function GoalTreeMobileSheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0B1226]/35 px-3 backdrop-blur-sm md:hidden">
      <div className="safe-bottom w-full max-w-2xl rounded-t-[28px] bg-[#F4F6FA] p-4 shadow-command dark:bg-[#050816]">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300" />
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-lg font-extrabold text-[#0B1226] dark:text-white">目標ツリーを編集</p>
          <button className="grid h-11 w-11 place-items-center rounded-full bg-white text-slate-500 shadow-soft dark:bg-white/10 dark:text-slate-100 dark:shadow-none" onClick={onClose} aria-label="閉じる">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[72vh] overflow-y-auto pb-2">{children}</div>
      </div>
    </div>
  );
}

function SalesSnapshot({ tree, revenue }: { tree: GoalTree; revenue: RevenueSummary }) {
  const salesMetric = tree.metrics.find((metric) => metric.label.includes("売上"));
  const target = salesMetric?.target ?? revenue.monthTarget;
  const current = salesMetric?.current ?? revenue.monthBooked;
  const remaining = Math.max(0, target - current);
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-3">
      <SalesMini label="確定" value={formatCurrency(current)} />
      <SalesMini label="見込み" value={formatCurrency(revenue.weightedForecast)} />
      <SalesMini label="残り" value={formatCurrency(remaining)} tone={remaining > 0 ? "amber" : "green"} />
    </div>
  );
}

function SalesMini({ label, value, tone = "blue" }: { label: string; value: string; tone?: "blue" | "green" | "amber" }) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-900 dark:bg-blue-500/15 dark:text-blue-100",
    green: "bg-emerald-50 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-100",
    amber: "bg-amber-50 text-amber-900 dark:bg-amber-500/15 dark:text-amber-100",
  }[tone];
  return (
    <div className={cn("rounded-panel px-3 py-2", toneClass)}>
      <p className="text-xs font-semibold">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

function goalTreeProgress(tree: GoalTree, revenue: RevenueSummary) {
  const salesMetric = tree.metrics.find((metric) => metric.label.includes("売上"));
  const target = salesMetric?.target ?? revenue.monthTarget;
  const current = salesMetric?.current ?? revenue.monthBooked;
  if (!target) return 0;
  return Math.min(100, Math.max(0, Math.round((current / target) * 100)));
}

function findTodayBranch(trees: GoalTree[], employeeId?: string | null) {
  const today = dateInputValue(new Date().toISOString());
  const branches = trees.flatMap((tree) => tree.branches);
  return (
    branches.find((branch) => dateInputValue(branch.dueDate) === today && (!employeeId || branch.assigneeId === employeeId)) ??
    branches.find((branch) => !employeeId || branch.assigneeId === employeeId) ??
    null
  );
}

function countUntaskedTreeTasks(trees: GoalTree[], employeeId?: string | null) {
  return trees
    .flatMap((tree) => tree.branches)
    .flatMap((branch) => branch.tasks)
    .filter((task) => !task.taskId && (!employeeId || task.assigneeId === employeeId))
    .length;
}

function dateInputValue(value: string) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function isoFromDateInput(value: string, fallback: string) {
  if (!value) return fallback;
  return new Date(`${value}T18:00:00`).toISOString();
}

function uid(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
