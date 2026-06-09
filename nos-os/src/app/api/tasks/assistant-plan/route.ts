import { NextRequest, NextResponse } from "next/server";
import { getEmployees, getGoalTrees, getProjects, getTasks } from "@/lib/data/repository";
import { getRequestScope } from "@/lib/data/request";
import { cleanOpenAIEnvValue, resolveOpenAIApiKey, resolveOpenAIModel, supportsOpenAITuning } from "@/lib/integrations/openai-config";
import type { Employee, GoalTree, Project, Task, TaskAssistantAction, TaskAssistantPlan, TaskPriority, TaskStatus } from "@/lib/types";

type BranchOption = {
  treeId: string;
  treeTitle: string;
  branchId: string;
  branchTitle: string;
  projectId: string;
  assigneeId: string | null;
  dueDate: string;
};

type OpenAIContentItem = {
  type?: string;
  text?: string;
};

type OpenAIOutputItem = {
  content?: OpenAIContentItem[];
};

type OpenAIResponsePayload = {
  output_text?: string;
  output?: OpenAIOutputItem[];
};

type RawPlannerAction = {
  type?: string;
  taskId?: string | null;
  title?: string | null;
  description?: string | null;
  projectId?: string | null;
  primaryAssigneeId?: string | null;
  assigneeId?: string | null;
  sourceGoalTreeId?: string | null;
  sourceBranchId?: string | null;
  dueDate?: string | null;
  priority?: string | null;
  status?: string | null;
  estimatedMinutes?: number | null;
  reason?: string;
};

type RawPlannerPlan = {
  summary?: string;
  warnings?: string[];
  actions?: RawPlannerAction[];
};

const openaiEndpoint = "https://api.openai.com/v1/responses";
const defaultPlannerModel = "gpt-5.4-mini";
const priorities: TaskPriority[] = ["urgent", "high", "normal", "low", "hold"];
const statuses: TaskStatus[] = ["todo", "in_progress", "review", "done"];
const taskPlannerSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "warnings", "actions"],
  properties: {
    summary: { type: "string" },
    warnings: { type: "array", items: { type: "string" } },
    actions: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "type",
          "taskId",
          "title",
          "description",
          "projectId",
          "primaryAssigneeId",
          "sourceGoalTreeId",
          "sourceBranchId",
          "dueDate",
          "priority",
          "status",
          "estimatedMinutes",
          "reason",
        ],
        properties: {
          type: { type: "string", enum: ["create", "update", "delete"] },
          taskId: { type: ["string", "null"] },
          title: { type: ["string", "null"] },
          description: { type: ["string", "null"] },
          projectId: { type: ["string", "null"] },
          primaryAssigneeId: { type: ["string", "null"] },
          sourceGoalTreeId: { type: ["string", "null"] },
          sourceBranchId: { type: ["string", "null"] },
          dueDate: { type: ["string", "null"] },
          priority: { type: ["string", "null"], enum: ["urgent", "high", "normal", "low", "hold", null] },
          status: { type: ["string", "null"], enum: ["todo", "in_progress", "review", "done", null] },
          estimatedMinutes: { type: ["number", "null"] },
          reason: { type: "string" },
        },
      },
    },
  },
};

function todayOffset(days: number) {
  const date = new Date(Date.now() + 9 * 60 * 60 * 1000);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function compact(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function numericEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function extractOpenAIText(payload: OpenAIResponsePayload) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if ((content.type === "output_text" || content.type === "text") && content.text?.trim()) {
        return content.text.trim();
      }
    }
  }

  return null;
}

function extractJsonObject(value: string) {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? value;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as RawPlannerPlan;
  } catch {
    return null;
  }
}

function summarizeOpenAIError(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const error = (value as { error?: { type?: string; code?: string; message?: string } }).error;
  if (!error) return null;
  return {
    type: error.type,
    code: error.code,
    message: error.message?.slice(0, 180),
  };
}

function validPriority(value?: string | null): TaskPriority | null {
  return priorities.includes(value as TaskPriority) ? (value as TaskPriority) : null;
}

function validStatus(value?: string | null): TaskStatus | null {
  return statuses.includes(value as TaskStatus) ? (value as TaskStatus) : null;
}

function validDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function explicitDelete(message: string) {
  return /削除|消して|delete/i.test(message);
}

function stripCommand(value: string) {
  return compact(
    value
      .replace(/明日までに|今日までに|本日までに|今日中に|明日中に|来週までに/g, "")
      .replace(/小タスク|サブタスク/g, "")
      .replace(/タスク/g, "")
      .replace(/追加|作って|作成|登録|増やして|増やす|消して|削除|減らして|減らす|減らせる|減らしたい|外して|保留|完了|終わった|分解|編集|変更/g, "")
      .replace(/[「」"']/g, ""),
  ).replace(/[をに、。,. ]+$/g, "");
}

function priorityFrom(message: string): TaskPriority {
  if (/急ぎ|緊急|至急|今日中/.test(message)) return "urgent";
  if (/高め|優先|大事/.test(message)) return "high";
  if (/低め|後で|余裕/.test(message)) return "low";
  return "normal";
}

function dueDateFrom(message: string) {
  if (/明後日/.test(message)) return todayOffset(2);
  if (/明日|あした/.test(message)) return todayOffset(1);
  if (/来週/.test(message)) return todayOffset(7);
  if (/今日|本日|今日中|今/.test(message)) return todayOffset(0);
  return todayOffset(1);
}

function mentionedEmployee(message: string, employees: Employee[]) {
  return employees.find((employee) => {
    const compactName = employee.name.replace(/\s/g, "");
    const familyName = employee.name.split(/\s+/)[0];
    return message.includes(employee.name) || message.includes(compactName) || Boolean(familyName && message.includes(familyName));
  });
}

function findEmployee(message: string, employees: Employee[], fallbackEmployeeId?: string) {
  return mentionedEmployee(message, employees) ?? employees.find((employee) => employee.id === fallbackEmployeeId) ?? employees[0];
}

function findProject(message: string, projects: Project[]) {
  return projects.find((project) => message.includes(project.name) || message.includes(project.customerName));
}

function findProjectById(projects: Project[], projectId?: string | null) {
  return projects.find((project) => project.id === projectId);
}

function branchOptions(goalTrees: GoalTree[]): BranchOption[] {
  return goalTrees.flatMap((tree) =>
    tree.branches.map((branch) => ({
      treeId: tree.id,
      treeTitle: tree.title,
      branchId: branch.id,
      branchTitle: branch.title,
      projectId: branch.projectId ?? "",
      assigneeId: branch.assigneeId,
      dueDate: branch.dueDate,
    })),
  );
}

function findBranch(message: string, branches: BranchOption[], project?: Project) {
  return (
    branches.find((branch) => message.includes(branch.branchTitle) || message.includes(branch.treeTitle)) ??
    branches.find((branch) => project && branch.projectId === project.id)
  );
}

function findBranchByIds(branches: BranchOption[], treeId?: string | null, branchId?: string | null) {
  return branches.find((branch) => branch.treeId === treeId && branch.branchId === branchId);
}

function actionContext(task: Task, projects: Project[], employees: Employee[], branches: BranchOption[]) {
  const project = findProjectById(projects, task.projectId);
  const assignee = employees.find((employee) => employee.id === task.primaryAssigneeId);
  const branch = findBranchByIds(branches, task.sourceGoalTreeId, task.sourceBranchId);
  return {
    projectName: project?.name,
    assigneeName: assignee?.name,
    sourceGoalTreeTitle: task.sourceGoalTreeTitle ?? branch?.treeTitle ?? null,
    sourceBranchTitle: task.sourceBranchTitle ?? branch?.branchTitle ?? null,
  };
}

function focusTask(tasks: Task[]) {
  return [...tasks].filter((task) => task.status !== "done").sort((a, b) => b.aiPriorityScore - a.aiPriorityScore)[0] ?? tasks[0];
}

function taskFromMessage(message: string, tasks: Task[]) {
  const query = stripCommand(message);
  return tasks.find((task) => message.includes(task.title) || (query && task.title.includes(query))) ?? null;
}

function deleteActions(message: string, tasks: Task[], projects: Project[], employees: Employee[], branches: BranchOption[]): TaskAssistantAction[] {
  const query = stripCommand(message);
  const reduceWithoutDelete = /減ら|保留|外して/.test(message) && !/消して|削除/.test(message);
  const requestedProject = findProject(message, projects);
  const requestedBranch = findBranch(message, branches, requestedProject);
  const scopedTasks = tasks.filter((task) => {
    if (requestedBranch) return task.sourceGoalTreeId === requestedBranch.treeId && task.sourceBranchId === requestedBranch.branchId;
    if (requestedProject) return task.projectId === requestedProject.id;
    return true;
  });
  let candidates = scopedTasks
    .filter((task) => {
      if (/完了済み|終わった|done/i.test(message)) return task.status === "done";
      if (!query) return false;
      return task.title.includes(query) || query.includes(task.title);
    })
    .slice(0, 4);

  if (!candidates.length && !/完了済み|終わった|done/i.test(message)) {
    candidates = [...scopedTasks]
      .filter((task) => task.status === "done" || task.priority === "low" || task.priority === "hold" || task.aiPriorityScore < 45)
      .sort((a, b) => {
        if (a.status === "done" && b.status !== "done") return -1;
        if (b.status === "done" && a.status !== "done") return 1;
        return a.aiPriorityScore - b.aiPriorityScore;
      })
      .slice(0, 4);
  }

  if (!candidates.length && !/完了済み|終わった|done/i.test(message)) {
    candidates = [...scopedTasks]
      .filter((task) => task.status !== "done")
      .sort((a, b) => a.aiPriorityScore - b.aiPriorityScore)
      .slice(0, 4);
  }

  return candidates.map((task) => {
    const context = actionContext(task, projects, employees, branches);
    if (reduceWithoutDelete && task.status !== "done") {
      return {
        id: `hold-${task.id}`,
        type: "update",
        taskId: task.id,
        title: task.title,
        patch: { priority: "hold" },
        ...context,
        reason: "今やるリストから外すため、削除ではなく保留にします。完全に不要なら削除を指定してください。",
      };
    }
    return {
      id: `delete-${task.id}`,
      type: "delete",
      taskId: task.id,
      title: task.title,
      ...context,
      reason:
        task.status === "done"
          ? "完了済みとして減らす候補です。"
          : /完了済み|終わった|done/i.test(message)
            ? "完了済みとして減らす候補です。"
            : "優先度やAIスコアが低く、減らす候補です。必要なら削除ではなく保留にしてください。",
    };
  });
}

function updateActions(message: string, tasks: Task[], projects: Project[], employees: Employee[], branches: BranchOption[]): TaskAssistantAction[] {
  const requestedAssignee = mentionedEmployee(message, employees);
  const explicitTarget = taskFromMessage(message, tasks);
  const target =
    explicitTarget ??
    (/担当|任せ|アサイン|お願い/.test(message) && requestedAssignee ? tasks.find((task) => task.status !== "done" && task.primaryAssigneeId !== requestedAssignee.id) : undefined) ??
    focusTask(tasks);
  if (!target) return [];
  const targetContext = actionContext(target, projects, employees, branches);
  const assignee = requestedAssignee ?? findEmployee(message, employees, target.primaryAssigneeId);
  const project = findProject(message, projects);
  const branch = findBranch(message, branches, project);

  if (/担当|任せ|アサイン|お願い/.test(message) && assignee && assignee.id !== target.primaryAssigneeId) {
    return [{ id: `assign-${target.id}`, type: "update", taskId: target.id, title: target.title, patch: { primaryAssigneeId: assignee.id }, ...targetContext, assigneeName: assignee.name, reason: `担当者を「${assignee.name}」に変更します。` }];
  }
  if (/大タスク|親タスク|案件/.test(message) && (branch || project)) {
    return [
      {
        id: `context-${target.id}`,
        type: "update",
        taskId: target.id,
        title: target.title,
        patch: {
          projectId: branch?.projectId || project?.id || target.projectId,
          ...(branch ? { sourceGoalTreeId: branch.treeId, sourceBranchId: branch.branchId } : {}),
        },
        ...targetContext,
        projectName: project?.name ?? findProjectById(projects, branch?.projectId)?.name ?? targetContext.projectName,
        sourceGoalTreeTitle: branch?.treeTitle ?? targetContext.sourceGoalTreeTitle,
        sourceBranchTitle: branch?.branchTitle ?? targetContext.sourceBranchTitle,
        reason: branch ? `大タスク「${branch.branchTitle}」の小タスクとして紐づけます。` : `案件「${project?.name}」の作業として紐づけます。`,
      },
    ];
  }
  if (/完了|終わった/.test(message)) {
    return [{ id: `done-${target.id}`, type: "update", taskId: target.id, title: target.title, patch: { status: "done" }, ...targetContext, reason: "完了指示として状態を完了にします。" }];
  }
  if (/開始|着手/.test(message)) {
    return [{ id: `start-${target.id}`, type: "update", taskId: target.id, title: target.title, patch: { status: "in_progress" }, ...targetContext, reason: "開始指示として進行中にします。" }];
  }
  if (/明日|あした|今日|本日|来週/.test(message)) {
    return [{ id: `due-${target.id}`, type: "update", taskId: target.id, title: target.title, patch: { dueDate: dueDateFrom(message) }, ...targetContext, reason: "日付変更の指示として期限を更新します。" }];
  }
  return [];
}

function createAction(
  message: string,
  projects: Project[],
  employees: Employee[],
  branches: BranchOption[],
  fallbackEmployeeId?: string,
  titleOverride?: string,
  context: { projectId?: string | null; assigneeId?: string | null; branch?: BranchOption } = {},
): TaskAssistantAction {
  const project = findProject(message, projects);
  const branch = context.branch ?? findBranch(message, branches, project);
  const projectId = project?.id ?? branch?.projectId ?? context.projectId ?? projects[0]?.id ?? "";
  const resolvedProject = findProjectById(projects, projectId);
  const assignee =
    mentionedEmployee(message, employees) ??
    employees.find((employee) => employee.id === context.assigneeId) ??
    employees.find((employee) => employee.id === branch?.assigneeId) ??
    employees.find((employee) => employee.id === fallbackEmployeeId) ??
    employees[0];
  const title = compact(titleOverride || stripCommand(message) || "新しいタスク");
  return {
    id: `create-${Math.random().toString(16).slice(2)}`,
    type: "create",
    title,
    description: `AI/音声メモ: ${message}`,
    projectId,
    projectName: resolvedProject?.name,
    primaryAssigneeId: assignee?.id ?? employees[0]?.id ?? "",
    assigneeName: assignee?.name,
    sourceGoalTreeId: branch?.treeId ?? null,
    sourceGoalTreeTitle: branch?.treeTitle ?? null,
    sourceBranchId: branch?.branchId ?? null,
    sourceBranchTitle: branch?.branchTitle ?? null,
    dueDate: dueDateFrom(message),
    priority: priorityFrom(message),
    estimatedMinutes: /すぐ|短/.test(message) ? 20 : 45,
    reason: branch ? `大タスク「${branch.branchTitle}」の小タスクとして作成します。` : "音声/テキストから新規タスクを作成します。",
  };
}

function splitCountFrom(message: string) {
  const digit = message.match(/([2-8])\s*(つ|個|件)/)?.[1];
  if (digit) return Number(digit);
  const table: Record<string, number> = { 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8 };
  const kanji = message.match(/([二三四五六七八])\s*(つ|個|件)/)?.[1];
  return kanji ? table[kanji] : 5;
}

function splitActions(message: string, tasks: Task[], projects: Project[], employees: Employee[], branches: BranchOption[], fallbackEmployeeId?: string): TaskAssistantAction[] {
  const existingTask = taskFromMessage(message, tasks);
  const fallbackTitle = stripCommand(message).replace(/今日の|本日の|今週の|この作業/g, "").trim();
  const base = existingTask?.title || fallbackTitle || focusTask(tasks)?.title || "作業";
  const requestedProject = findProject(message, projects);
  const branch = findBranch(message, branches, requestedProject) ?? findBranchByIds(branches, existingTask?.sourceGoalTreeId, existingTask?.sourceBranchId);
  const projectId = requestedProject?.id ?? branch?.projectId ?? existingTask?.projectId;
  const assigneeId = mentionedEmployee(message, employees)?.id ?? existingTask?.primaryAssigneeId ?? branch?.assigneeId ?? fallbackEmployeeId;
  const pieces = ["目的と完了条件を決める", "必要情報を集める", "初稿を作る", "確認して修正する", "関係者に共有する", "修正を反映する", "完了条件を確認する", "完了報告する"];
  return pieces
    .slice(0, splitCountFrom(message))
    .map((piece) => createAction(message, projects, employees, branches, fallbackEmployeeId, `${base}: ${piece}`, { projectId, assigneeId, branch }));
}

function compactCatalog(tasks: Task[], projects: Project[], employees: Employee[], branches: BranchOption[]) {
  return {
    tasks: tasks
      .filter((task) => task.status !== "done")
      .sort((a, b) => b.aiPriorityScore - a.aiPriorityScore)
      .slice(0, 40)
      .map((task) => ({
        id: task.id,
        title: task.title,
        projectId: task.projectId,
        projectName: findProjectById(projects, task.projectId)?.name,
        primaryAssigneeId: task.primaryAssigneeId,
        assigneeName: employees.find((employee) => employee.id === task.primaryAssigneeId)?.name,
        sourceGoalTreeId: task.sourceGoalTreeId,
        sourceBranchId: task.sourceBranchId,
        sourceBranchTitle: task.sourceBranchTitle,
        dueDate: task.dueDate,
        priority: task.priority,
        status: task.status,
        aiPriorityScore: task.aiPriorityScore,
        estimatedMinutes: task.estimatedMinutes,
      })),
    projects: projects.slice(0, 30).map((project) => ({ id: project.id, name: project.name, customerName: project.customerName })),
    employees: employees.map((employee) => ({ id: employee.id, name: employee.name, department: employee.department })),
    branches: branches.slice(0, 40).map((branch) => ({
      treeId: branch.treeId,
      treeTitle: branch.treeTitle,
      branchId: branch.branchId,
      branchTitle: branch.branchTitle,
      projectId: branch.projectId,
      assigneeId: branch.assigneeId,
      dueDate: branch.dueDate,
    })),
  };
}

function coerceOpenAIPlan(
  rawPlan: RawPlannerPlan,
  message: string,
  tasks: Task[],
  projects: Project[],
  employees: Employee[],
  branches: BranchOption[],
  fallbackEmployeeId?: string,
): TaskAssistantPlan | null {
  const actions: TaskAssistantAction[] = [];
  const allowDelete = explicitDelete(message);

  for (const raw of (rawPlan.actions ?? []).slice(0, 8)) {
    const type = raw.type === "delete" || raw.type === "update" || raw.type === "create" ? raw.type : null;
    if (!type) continue;

    const target = raw.taskId ? tasks.find((task) => task.id === raw.taskId) : raw.title ? tasks.find((task) => task.title.includes(raw.title!) || raw.title!.includes(task.title)) : undefined;
    const rawBranch = findBranchByIds(branches, raw.sourceGoalTreeId, raw.sourceBranchId);
    const project = findProjectById(projects, rawBranch?.projectId || raw.projectId) ?? findProject(message, projects);
    const assignee =
      employees.find((employee) => employee.id === (raw.primaryAssigneeId ?? raw.assigneeId)) ??
      employees.find((employee) => employee.id === rawBranch?.assigneeId) ??
      mentionedEmployee(message, employees) ??
      employees.find((employee) => employee.id === fallbackEmployeeId) ??
      employees[0];

    if (type === "create") {
      const branch = rawBranch ?? findBranch(message, branches, project);
      const projectId = project?.id ?? branch?.projectId ?? projects[0]?.id ?? "";
      const resolvedProject = findProjectById(projects, projectId);
      const title = compact(raw.title ?? stripCommand(message) ?? "新しいタスク");
      if (!title) continue;
      actions.push({
        id: `openai-create-${actions.length + 1}`,
        type: "create",
        title,
        description: compact(raw.description ?? `AI/音声メモ: ${message}`),
        projectId,
        projectName: resolvedProject?.name,
        primaryAssigneeId: assignee?.id ?? "",
        assigneeName: assignee?.name,
        sourceGoalTreeId: branch?.treeId ?? null,
        sourceGoalTreeTitle: branch?.treeTitle ?? null,
        sourceBranchId: branch?.branchId ?? null,
        sourceBranchTitle: branch?.branchTitle ?? null,
        dueDate: validDate(raw.dueDate) ?? dueDateFrom(message),
        priority: validPriority(raw.priority) ?? priorityFrom(message),
        estimatedMinutes: Number.isFinite(raw.estimatedMinutes) ? Math.min(480, Math.max(5, Number(raw.estimatedMinutes))) : 45,
        reason: compact(raw.reason ?? (branch ? `大タスク「${branch.branchTitle}」の小タスクとして作成します。` : "AIが内容から新規タスク候補を作成しました。")),
      });
      continue;
    }

    if (!target) continue;
    const context = actionContext(target, projects, employees, branches);

    if (type === "delete" && allowDelete) {
      actions.push({
        id: `openai-delete-${target.id}`,
        type: "delete",
        taskId: target.id,
        title: target.title,
        ...context,
        reason: compact(raw.reason ?? "明示された削除指示として削除候補にします。"),
      });
      continue;
    }

    const patch: Extract<TaskAssistantAction, { type: "update" }>["patch"] = {};
    const status = validStatus(raw.status);
    const priority = validPriority(raw.priority);
    const dueDate = validDate(raw.dueDate);
    const branch = rawBranch ?? findBranch(message, branches, project);

    if (type === "delete" && !allowDelete) {
      patch.priority = "hold";
    }
    if (status) patch.status = status;
    if (priority) patch.priority = priority;
    if (dueDate) patch.dueDate = dueDate;
    if (project?.id) patch.projectId = project.id;
    if (assignee?.id && assignee.id !== target.primaryAssigneeId) patch.primaryAssigneeId = assignee.id;
    if (branch) {
      patch.projectId = branch.projectId || patch.projectId || target.projectId;
      patch.sourceGoalTreeId = branch.treeId;
      patch.sourceBranchId = branch.branchId;
    }
    if (Number.isFinite(raw.estimatedMinutes)) patch.estimatedMinutes = Math.min(480, Math.max(5, Number(raw.estimatedMinutes)));

    if (!Object.keys(patch).length) continue;

    actions.push({
      id: `openai-update-${target.id}-${actions.length + 1}`,
      type: "update",
      taskId: target.id,
      title: target.title,
      patch,
      ...context,
      projectName: project?.name ?? findProjectById(projects, branch?.projectId)?.name ?? context.projectName,
      assigneeName: assignee?.name ?? context.assigneeName,
      sourceGoalTreeTitle: branch?.treeTitle ?? context.sourceGoalTreeTitle,
      sourceBranchTitle: branch?.branchTitle ?? context.sourceBranchTitle,
      reason: compact(raw.reason ?? (patch.priority === "hold" ? "削除ではなく保留候補として整理します。" : "AIが指示から更新候補を作成しました。")),
    });
  }

  if (!actions.length) return null;

  return {
    summary: compact(rawPlan.summary ?? `${actions.length}件のAI実行前プランを作りました。内容を確認してから反映してください。`),
    source: "openai",
    warnings: [
      ...(rawPlan.warnings ?? []).filter((warning) => typeof warning === "string" && warning.trim()).slice(0, 3),
      ...(actions.some((action) => action.type === "delete") ? ["削除は元に戻せません。実行前に必ず確認してください。"] : []),
    ],
    actions,
  };
}

async function buildOpenAIPlan(
  message: string,
  tasks: Task[],
  projects: Project[],
  employees: Employee[],
  branches: BranchOption[],
  fallbackEmployeeId?: string,
) {
  const apiKey = resolveOpenAIApiKey(process.env.OPENAI_API_KEY);
  if (!apiKey) return null;

  const model = resolveOpenAIModel(process.env.OPENAI_TASK_PLANNER_MODEL || process.env.OPENAI_MODEL, defaultPlannerModel);
  const maxOutputTokens = numericEnv("OPENAI_TASK_PLANNER_MAX_OUTPUT_TOKENS", 1400);
  const textConfig: Record<string, unknown> = {
    format: {
      type: "json_schema",
      name: "nos_task_planner",
      strict: true,
      schema: taskPlannerSchema,
    },
  };
  const textVerbosity = cleanOpenAIEnvValue(process.env.OPENAI_TASK_PLANNER_TEXT_VERBOSITY);
  if (textVerbosity) textConfig.verbosity = textVerbosity;
  const reasoningEffort =
    cleanOpenAIEnvValue(process.env.OPENAI_TASK_PLANNER_REASONING_EFFORT) || cleanOpenAIEnvValue(process.env.OPENAI_REASONING_EFFORT);
  const body: Record<string, unknown> = {
    model,
    instructions:
      "You are the Nos OS task planning engine. Return only one JSON object. Never execute changes. Build safe task action candidates for Japanese voice/text commands. Use only IDs present in the provided catalog. For reduce/decrease/hold requests, prefer update priority hold. Use delete only when the user explicitly says delete/remove/消して/削除. Keep actions practical for employee task management.",
    input: JSON.stringify({
      userMessage: message,
      today: todayOffset(0),
      outputShape: {
        summary: "string",
        warnings: ["string"],
        actions: [
          {
            type: "create | update | delete",
            taskId: "required for update/delete; must be existing task id",
            title: "task title for create, or matching existing task title",
            description: "create only",
            projectId: "existing project id",
            primaryAssigneeId: "existing employee id",
            sourceGoalTreeId: "existing tree id",
            sourceBranchId: "existing branch id",
            dueDate: "YYYY-MM-DD",
            priority: "urgent | high | normal | low | hold",
            status: "todo | in_progress | review | done",
            estimatedMinutes: 45,
            reason: "short Japanese reason",
          },
        ],
      },
      catalog: compactCatalog(tasks, projects, employees, branches),
    }),
    max_output_tokens: maxOutputTokens,
    text: textConfig,
  };
  if (!supportsOpenAITuning(model)) delete textConfig.verbosity;
  if (reasoningEffort && supportsOpenAITuning(model)) body.reasoning = { effort: reasoningEffort };

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };
    if (process.env.OPENAI_ORGANIZATION_ID) headers["OpenAI-Organization"] = process.env.OPENAI_ORGANIZATION_ID;
    if (process.env.OPENAI_PROJECT_ID) headers["OpenAI-Project"] = process.env.OPENAI_PROJECT_ID;

    const response = await fetch(openaiEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null);
      console.warn("[openai] task planner request failed", { status: response.status, model, error: summarizeOpenAIError(errorPayload) });
      return null;
    }
    const payload = (await response.json()) as OpenAIResponsePayload;
    const text = extractOpenAIText(payload);
    const rawPlan = text ? extractJsonObject(text) : null;
    if (!text || !rawPlan) console.warn("[openai] task planner response had no JSON plan", { model, hasText: Boolean(text) });
    return rawPlan ? coerceOpenAIPlan(rawPlan, message, tasks, projects, employees, branches, fallbackEmployeeId) : null;
  } catch (error) {
    console.warn("[openai] task planner request threw", { model, message: error instanceof Error ? error.message.slice(0, 180) : String(error).slice(0, 180) });
    return null;
  }
}

export async function POST(request: NextRequest) {
  const { role, employeeId } = getRequestScope(request);
  const body = await request.json().catch(() => ({}));
  const message = compact(String(body.message ?? ""));

  if (!message) {
    return NextResponse.json({ data: { summary: "指示が空です。", source: "local", warnings: ["音声またはテキストで指示してください。"], actions: [] } satisfies TaskAssistantPlan });
  }

  const [tasks, projects, employees, goalTrees] = await Promise.all([getTasks(role, employeeId), getProjects(role, employeeId), getEmployees(role, employeeId), getGoalTrees(role, employeeId)]);
  const branches = branchOptions(goalTrees);
  const openAIPlan = await buildOpenAIPlan(message, tasks, projects, employees, branches, employeeId);
  if (openAIPlan) {
    return NextResponse.json({ data: openAIPlan });
  }

  let actions: TaskAssistantAction[] = [];

  if (/消して|削除|減ら|保留|外して/.test(message)) {
    actions = deleteActions(message, tasks, projects, employees, branches);
  } else if (/分解|小タスク/.test(message)) {
    actions = splitActions(message, tasks, projects, employees, branches, employeeId);
  } else if (/完了|終わった|開始|着手|変更|明日|あした|今日|来週|担当|任せ|アサイン|お願い|大タスク|親タスク|案件/.test(message) && !/追加|作って|作成|登録|増や/.test(message)) {
    actions = updateActions(message, tasks, projects, employees, branches);
  } else {
    actions = [createAction(message, projects, employees, branches, employeeId)];
  }

  const plan: TaskAssistantPlan = {
    summary: actions.length ? `${actions.length}件の実行前プランを作りました。内容を確認してから反映してください。` : "候補が見つかりませんでした。タスク名や案件名をもう少し具体的に言ってください。",
    source: "local",
    warnings: actions.some((action) => action.type === "delete") ? ["削除は元に戻せません。実行前に必ず確認してください。"] : [],
    actions,
  };

  return NextResponse.json({ data: plan });
}
