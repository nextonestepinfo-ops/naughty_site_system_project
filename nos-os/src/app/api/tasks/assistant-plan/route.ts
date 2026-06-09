import { NextRequest, NextResponse } from "next/server";
import { getEmployees, getGoalTrees, getProjects, getTasks } from "@/lib/data/repository";
import { getRequestScope } from "@/lib/data/request";
import type { Employee, GoalTree, Project, Task, TaskAssistantAction, TaskAssistantPlan, TaskPriority } from "@/lib/types";

type BranchOption = {
  treeId: string;
  treeTitle: string;
  branchId: string;
  branchTitle: string;
  projectId: string;
  assigneeId: string | null;
  dueDate: string;
};

function todayOffset(days: number) {
  const date = new Date(Date.now() + 9 * 60 * 60 * 1000);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function compact(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function stripCommand(value: string) {
  return compact(
    value
      .replace(/明日までに|今日までに|本日までに|今日中に|明日中に|来週までに/g, "")
      .replace(/小タスク|サブタスク/g, "")
      .replace(/タスク/g, "")
      .replace(/追加|作って|作成|登録|増やして|増やす|消して|削除|減らして|減らす|完了|終わった|分解|編集|変更/g, "")
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
  return employees.find((employee) => message.includes(employee.name) || message.includes(employee.name.replace(/\s/g, "")));
}

function findEmployee(message: string, employees: Employee[], fallbackEmployeeId?: string) {
  return mentionedEmployee(message, employees) ?? employees.find((employee) => employee.id === fallbackEmployeeId) ?? employees[0];
}

function findProject(message: string, projects: Project[]) {
  return projects.find((project) => message.includes(project.name) || message.includes(project.customerName));
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
    branches.find((branch) => project && branch.projectId === project.id) ??
    branches[0]
  );
}

function focusTask(tasks: Task[]) {
  return [...tasks].filter((task) => task.status !== "done").sort((a, b) => b.aiPriorityScore - a.aiPriorityScore)[0] ?? tasks[0];
}

function taskFromMessage(message: string, tasks: Task[]) {
  const query = stripCommand(message);
  return tasks.find((task) => message.includes(task.title) || (query && task.title.includes(query))) ?? null;
}

function deleteActions(message: string, tasks: Task[]): TaskAssistantAction[] {
  const query = stripCommand(message);
  let candidates = tasks
    .filter((task) => {
      if (/完了済み|終わった|done/i.test(message)) return task.status === "done";
      if (!query) return false;
      return task.title.includes(query) || query.includes(task.title);
    })
    .slice(0, 4);

  if (!candidates.length && !/完了済み|終わった|done/i.test(message)) {
    candidates = [...tasks]
      .filter((task) => task.status === "done" || task.priority === "low" || task.priority === "hold" || task.aiPriorityScore < 45)
      .sort((a, b) => {
        if (a.status === "done" && b.status !== "done") return -1;
        if (b.status === "done" && a.status !== "done") return 1;
        return a.aiPriorityScore - b.aiPriorityScore;
      })
      .slice(0, 4);
  }

  if (!candidates.length && !/完了済み|終わった|done/i.test(message)) {
    candidates = [...tasks]
      .filter((task) => task.status !== "done")
      .sort((a, b) => a.aiPriorityScore - b.aiPriorityScore)
      .slice(0, 4);
  }

  return candidates.map((task) => ({
    id: `delete-${task.id}`,
    type: "delete",
    taskId: task.id,
    title: task.title,
    reason:
      task.status === "done"
        ? "完了済みとして減らす候補です。"
        : /完了済み|終わった|done/i.test(message)
          ? "完了済みとして減らす候補です。"
          : "優先度やAIスコアが低く、減らす候補です。必要なら削除ではなく保留にしてください。",
  }));
}

function updateActions(message: string, tasks: Task[], projects: Project[], employees: Employee[], branches: BranchOption[]): TaskAssistantAction[] {
  const requestedAssignee = mentionedEmployee(message, employees);
  const explicitTarget = taskFromMessage(message, tasks);
  const target =
    explicitTarget ??
    (/担当|任せ|アサイン|お願い/.test(message) && requestedAssignee ? tasks.find((task) => task.status !== "done" && task.primaryAssigneeId !== requestedAssignee.id) : undefined) ??
    focusTask(tasks);
  if (!target) return [];
  const assignee = requestedAssignee ?? findEmployee(message, employees, target.primaryAssigneeId);
  const project = findProject(message, projects);
  const branch = findBranch(message, branches, project);

  if (/担当|任せ|アサイン|お願い/.test(message) && assignee && assignee.id !== target.primaryAssigneeId) {
    return [{ id: `assign-${target.id}`, type: "update", taskId: target.id, title: target.title, patch: { primaryAssigneeId: assignee.id }, reason: `担当者を「${assignee.name}」に変更します。` }];
  }
  if (/大タスク|親タスク|案件/.test(message) && branch) {
    return [
      {
        id: `context-${target.id}`,
        type: "update",
        taskId: target.id,
        title: target.title,
        patch: { projectId: branch.projectId || project?.id || target.projectId, sourceGoalTreeId: branch.treeId, sourceBranchId: branch.branchId },
        reason: `大タスク「${branch.branchTitle}」の小タスクとして紐づけます。`,
      },
    ];
  }
  if (/完了|終わった/.test(message)) {
    return [{ id: `done-${target.id}`, type: "update", taskId: target.id, title: target.title, patch: { status: "done" }, reason: "完了指示として状態を完了にします。" }];
  }
  if (/開始|着手/.test(message)) {
    return [{ id: `start-${target.id}`, type: "update", taskId: target.id, title: target.title, patch: { status: "in_progress" }, reason: "開始指示として進行中にします。" }];
  }
  if (/明日|あした|今日|本日|来週/.test(message)) {
    return [{ id: `due-${target.id}`, type: "update", taskId: target.id, title: target.title, patch: { dueDate: dueDateFrom(message) }, reason: "日付変更の指示として期限を更新します。" }];
  }
  return [];
}

function createAction(message: string, projects: Project[], employees: Employee[], branches: BranchOption[], fallbackEmployeeId?: string, titleOverride?: string): TaskAssistantAction {
  const project = findProject(message, projects);
  const branch = findBranch(message, branches, project);
  const assignee = findEmployee(message, employees, branch?.assigneeId ?? fallbackEmployeeId);
  const projectId = project?.id ?? branch?.projectId ?? projects[0]?.id ?? "";
  const title = compact(titleOverride || stripCommand(message) || "新しいタスク");
  return {
    id: `create-${Math.random().toString(16).slice(2)}`,
    type: "create",
    title,
    description: `AI/音声メモ: ${message}`,
    projectId,
    primaryAssigneeId: assignee?.id ?? employees[0]?.id ?? "",
    sourceGoalTreeId: branch?.treeId ?? null,
    sourceBranchId: branch?.branchId ?? null,
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
  const pieces = ["目的と完了条件を決める", "必要情報を集める", "初稿を作る", "確認して修正する", "関係者に共有する", "修正を反映する", "完了条件を確認する", "完了報告する"];
  return pieces.slice(0, splitCountFrom(message)).map((piece) => createAction(message, projects, employees, branches, fallbackEmployeeId, `${base}: ${piece}`));
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
  let actions: TaskAssistantAction[] = [];

  if (/消して|削除|減らして|減らす/.test(message)) {
    actions = deleteActions(message, tasks);
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
