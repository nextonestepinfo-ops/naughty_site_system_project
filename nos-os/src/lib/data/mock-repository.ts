import {
  activityLogs,
  aiSummaries,
  attendanceLogs,
  customers,
  dateOffset,
  emails,
  employeeSkills,
  employees,
  goals,
  goalTrees,
  leaveRequests,
  notifications,
  projectMembers,
  projects,
  skills,
  taskComments,
  tasks,
  users,
} from "@/lib/data/mock";
import { createPasswordSalt, hashPassword, passwordIsAcceptable, verifyPassword } from "@/lib/auth/password";
import { priorityOrder } from "@/lib/data/labels";
import type {
  ActivityLog,
  AiSummary,
  AttendanceEvent,
  AttendanceLog,
  AttendanceStatus,
  Customer,
  DailyPlan,
  DashboardSummary,
  Employee,
  EmployeeProfile,
  GoalTree,
  GoalTreeBranch,
  GoalTreeMetric,
  GoalTreeScope,
  GoalTreeTask,
  LoginAccount,
  Project,
  ProjectDetail,
  ProjectStatus,
  RevenueSummary,
  Role,
  ScheduleBlock,
  Task,
  TaskFilter,
  TaskPriority,
  TaskStatus,
  User,
} from "@/lib/types";

const mutableProjects = projects;
const mutableTasks = tasks;
const mutableAttendance = attendanceLogs;
const mutableNotifications = notifications;
const mutableActivity = activityLogs;
const mutableComments = taskComments;
const mutableUsers = users;
const mutableGoalTrees = goalTrees;
const mutablePasswords = new Map(
  mutableUsers.map((user) => {
    const salt = createPasswordSalt();
    return [user.id, { salt, hash: hashPassword("0000", salt), mustChangePassword: true }];
  }),
);
const betaProfiles = new Map([
  ["emp-urata", { email: "urata@nostechnology.jp", name: "浦田 和真", role: "admin" as Role, position: "管理者 / 代表", department: "経営・営業", avatarUrl: "UK" }],
  ["emp-akari", { email: "hashisako@nostechnology.jp", name: "橋迫 翔太", role: "employee" as Role, position: "社員", department: "制作・運用", avatarUrl: "HS" }],
  ["emp-ren", { email: "watanabe@nostechnology.jp", name: "渡邉 駿", role: "employee" as Role, position: "社員", department: "システム開発", avatarUrl: "WS" }],
  ["emp-mio", { email: "osaki@nostechnology.jp", name: "大崎 雄介", role: "admin" as Role, position: "管理者 / 運用", department: "経営・運用", avatarUrl: "OY" }],
]);
const hiddenEmployeeIds = new Set(["emp-admin"]);

function betaUser(user: User): User {
  const profile = betaProfiles.get(user.employeeId);
  return profile ? { ...user, email: profile.email, name: profile.name, role: profile.role, authProvider: "email" } : user;
}

function betaEmployee(employee: (typeof employees)[number]) {
  const profile = betaProfiles.get(employee.id);
  return profile
    ? {
        ...employee,
        name: profile.name,
        position: profile.position,
        department: profile.department,
        avatarUrl: profile.avatarUrl,
      }
    : employee;
}

function betaEmployees() {
  return employees.filter((employee) => !hiddenEmployeeIds.has(employee.id)).map(betaEmployee);
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function todayAtStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function dayDiff(targetIso: string) {
  const today = todayAtStart();
  const target = new Date(targetIso);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function isVisibleToEmployee(project: Project, employeeId?: string) {
  if (!employeeId) return false;
  return project.primaryOwnerId === employeeId || project.secondaryOwnerIds.includes(employeeId);
}

function taskVisibleToEmployee(task: Task, employeeId?: string) {
  if (!employeeId) return false;
  return task.primaryAssigneeId === employeeId || task.assigneeIds.includes(employeeId);
}

function goalTreeVisibleToEmployee(tree: GoalTree, employeeId?: string) {
  return tree.scope === "company" || tree.ownerEmployeeId === employeeId;
}

function isAdmin(role: Role) {
  return role === "admin";
}

function canMutateGoalTree(tree: GoalTree, role: Role, employeeId?: string) {
  if (isAdmin(role)) return true;
  return tree.scope !== "company" && tree.ownerEmployeeId === employeeId;
}

export function calculatePriorityScore(task: Pick<Task, "dueDate" | "priority" | "customerWaiting" | "delayRisk">) {
  const diff = dayDiff(task.dueDate);
  const deadlineScore = diff < 0 ? 100 : diff === 0 ? 95 : diff <= 1 ? 85 : diff <= 3 ? 68 : diff <= 7 ? 45 : 20;
  const priorityScore: Record<TaskPriority, number> = {
    urgent: 100,
    high: 80,
    normal: 55,
    low: 30,
    hold: 10,
  };
  const customerWaitingScore = task.customerWaiting ? 100 : 0;
  return Math.round(
    deadlineScore * 0.4 +
      priorityScore[task.priority] * 0.3 +
      customerWaitingScore * 0.2 +
      task.delayRisk * 0.1,
  );
}

function taskGoalContext(taskId: string): Pick<Task, "sourceGoalTreeId" | "sourceGoalTreeTitle" | "sourceBranchId" | "sourceBranchTitle"> {
  for (const tree of mutableGoalTrees) {
    for (const branch of tree.branches) {
      const materializedTask = branch.tasks.find((task) => task.taskId === taskId);
      if (materializedTask) {
        return {
          sourceGoalTreeId: tree.id,
          sourceGoalTreeTitle: tree.title,
          sourceBranchId: branch.id,
          sourceBranchTitle: branch.title,
        };
      }
    }
  }
  return {};
}

function hydrateTask(task: Task): Task {
  return { ...task, ...taskGoalContext(task.id), aiPriorityScore: calculatePriorityScore(task) };
}

function syncTaskGoalLink(task: Task, input: Pick<Partial<Task>, "sourceGoalTreeId" | "sourceBranchId">) {
  const targetTreeId = input.sourceGoalTreeId || undefined;
  const targetBranchId = input.sourceBranchId || undefined;
  let previousLink: GoalTreeTask | undefined;

  mutableGoalTrees.forEach((tree) => {
    tree.branches = tree.branches.map((branch) => {
      const keptTasks = branch.tasks.filter((treeTask) => {
        if (treeTask.taskId === task.id) {
          previousLink = treeTask;
          return false;
        }
        return true;
      });

      if (targetTreeId && targetBranchId && tree.id === targetTreeId && branch.id === targetBranchId) {
        return {
          ...branch,
          projectId: task.projectId || branch.projectId,
          tasks: [
            ...keptTasks,
            {
              id: previousLink?.id || uid("tree-task"),
              title: task.title,
              dueDate: task.dueDate,
              assigneeId: task.primaryAssigneeId || null,
              taskId: task.id,
            },
          ],
        };
      }

      return { ...branch, tasks: keptTasks };
    });
  });
}

function visibleTasks(role: Role, employeeId?: string) {
  const scoped = isAdmin(role) ? mutableTasks : mutableTasks.filter((task) => taskVisibleToEmployee(task, employeeId));
  return scoped.map(hydrateTask);
}

function visibleProjects(role: Role, employeeId?: string) {
  return isAdmin(role) ? mutableProjects : mutableProjects.filter((project) => isVisibleToEmployee(project, employeeId));
}

function countByStatus<T extends string>(values: T[], allStatuses: T[]) {
  return allStatuses.reduce(
    (acc, status) => {
      acc[status] = values.filter((value) => value === status).length;
      return acc;
    },
    {} as Record<T, number>,
  );
}

export function loginUser(input: { employeeId?: string; email?: string; password?: string; role?: Role; provider?: "google" | "email" }) {
  const requestedRole = input.role ?? "employee";
  const found =
    mutableUsers.find((user) => user.employeeId === input.employeeId) ??
    mutableUsers.find((user) => user.email === input.email) ??
    mutableUsers.find((user) => user.role === requestedRole);
  if (!found || hiddenEmployeeIds.has(found.employeeId)) return null;
  const passwordState = mutablePasswords.get(found.id);
  if (!verifyPassword(input.password ?? "", passwordState?.salt, passwordState?.hash)) return null;
  return { ...betaUser(found), authProvider: input.provider ?? "email", mustChangePassword: passwordState?.mustChangePassword ?? true };
}

export function changePassword(input: { userId?: string; currentPassword?: string; newPassword?: string }) {
  if (!input.userId || !passwordIsAcceptable(input.newPassword ?? "")) return null;
  const user = mutableUsers.find((item) => item.id === input.userId);
  const current = input.userId ? mutablePasswords.get(input.userId) : undefined;
  if (!user || !verifyPassword(input.currentPassword ?? "", current?.salt, current?.hash)) return null;
  const salt = createPasswordSalt();
  mutablePasswords.set(user.id, { salt, hash: hashPassword(input.newPassword ?? "", salt), mustChangePassword: false });
  return { ...betaUser(user), mustChangePassword: false };
}

export function getLoginAccounts(): LoginAccount[] {
  return betaEmployees()
    .map((employee) => {
      const user = mutableUsers.find((item) => item.employeeId === employee.id);
      if (!user) return null;
      const publicUser = betaUser(user);
      return {
        userId: publicUser.id,
        employeeId: employee.id,
        name: employee.name,
        role: publicUser.role,
        department: employee.department,
        position: employee.position,
        avatarUrl: employee.avatarUrl,
        mustChangePassword: mutablePasswords.get(publicUser.id)?.mustChangePassword ?? true,
      } satisfies LoginAccount;
    })
    .filter((account): account is LoginAccount => Boolean(account))
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === "admin" ? -1 : b.role === "admin" ? 1 : 0;
      return a.name.localeCompare(b.name, "ja");
    });
}

export function getUser(userId?: string) {
  return betaUser(mutableUsers.find((user) => user.id === userId) ?? mutableUsers.find((user) => !hiddenEmployeeIds.has(user.employeeId)) ?? mutableUsers[0]);
}

export function getEmployee(employeeId?: string) {
  return betaEmployee(employees.find((employee) => employee.id === employeeId) ?? betaEmployees()[0] ?? employees[0]);
}

export function getEmployees(role: Role, employeeId?: string) {
  const scoped = isAdmin(role) ? betaEmployees() : betaEmployees().filter((employee) => employee.id === employeeId);
  return scoped;
}

export function updateEmployee(id: string, input: Partial<Employee>) {
  const index = employees.findIndex((employee) => employee.id === id);
  if (index < 0) return null;
  employees[index] = { ...employees[index], ...input };
  return betaEmployee(employees[index]);
}

export function getEmployeeProfile(role: Role, targetId: string, requesterEmployeeId?: string): EmployeeProfile | null {
  if (!isAdmin(role) && targetId !== requesterEmployeeId) return null;
  const employee = betaEmployees().find((item) => item.id === targetId);
  if (!employee) return null;
  const profileSkills = employeeSkills
    .filter((item) => item.employeeId === targetId)
    .map((item) => ({ ...skills.find((skill) => skill.id === item.skillId)!, level: item.level }));
  return {
    ...employee,
    skills: profileSkills,
    assignedProjects: mutableProjects.filter((project) => employee.assignedProjectIds.includes(project.id)),
    pastProjects: mutableProjects.filter((project) => employee.pastProjectIds.includes(project.id)),
    tasks: mutableTasks.filter((task) => taskVisibleToEmployee(task, employee.id)).map(hydrateTask),
    attendanceLogs: mutableAttendance.filter((log) => log.employeeId === employee.id),
    goals: goals.filter((goal) => goal.employeeId === employee.id),
    aiAnalysis: aiSummaries.filter((summary) => summary.targetId === employee.id),
  };
}

export function getCustomers() {
  return customers;
}

export function updateCustomer(id: string, input: Partial<Customer>) {
  const index = customers.findIndex((customer) => customer.id === id);
  if (index < 0) return null;
  customers[index] = { ...customers[index], ...input };
  mutableProjects.forEach((project) => {
    if (project.customerId === id) project.customerName = customers[index].company;
  });
  return customers[index];
}

export function getProjects(role: Role, employeeId?: string) {
  return visibleProjects(role, employeeId);
}

export function getProjectDetail(role: Role, id: string, employeeId?: string): ProjectDetail | null {
  const project = mutableProjects.find((item) => item.id === id);
  if (!project || (!isAdmin(role) && !isVisibleToEmployee(project, employeeId))) return null;
  const memberIds = projectMembers.filter((member) => member.projectId === id).map((member) => member.employeeId);
  return {
    ...project,
    customer: customers.find((customer) => customer.id === project.customerId) ?? null,
    members: employees.filter((employee) => memberIds.includes(employee.id)),
    tasks: mutableTasks.filter((task) => task.projectId === id).map(hydrateTask),
    emails: emails.filter((email) => email.projectId === id),
    history: mutableActivity.filter((item) => item.entityType === "project" && item.entityId === id),
    files: [
      { id: `${id}-file-1`, name: "requirements.md", type: "document", updatedAt: dateOffset(-2) },
      { id: `${id}-file-2`, name: "proposal.pdf", type: "pdf", updatedAt: dateOffset(-1) },
    ],
  };
}

function normalizeGoalMetric(input: Partial<GoalTreeMetric>): GoalTreeMetric {
  return {
    id: input.id || uid("metric"),
    label: input.label || "数値",
    current: Number(input.current ?? 0),
    target: Number(input.target ?? 100),
    unit: input.unit ?? "",
  };
}

function normalizeGoalTreeTask(input: Partial<GoalTreeTask>, fallbackDueDate: string, fallbackAssigneeId: string | null): GoalTreeTask {
  return {
    id: input.id || uid("tree-task"),
    title: input.title || "小タスク",
    dueDate: input.dueDate || fallbackDueDate,
    assigneeId: input.assigneeId ?? fallbackAssigneeId,
    taskId: input.taskId ?? null,
  };
}

function normalizeGoalBranch(input: Partial<GoalTreeBranch>, fallbackDueDate: string, fallbackAssigneeId: string | null): GoalTreeBranch {
  const dueDate = input.dueDate || fallbackDueDate;
  const assigneeId = input.assigneeId ?? fallbackAssigneeId;
  return {
    id: input.id || uid("branch"),
    title: input.title || "枝",
    dueDate,
    assigneeId,
    projectId: input.projectId ?? mutableProjects[0]?.id ?? null,
    tasks: input.tasks?.length
      ? input.tasks.map((task) => normalizeGoalTreeTask(task, dueDate, assigneeId))
      : [normalizeGoalTreeTask({}, dueDate, assigneeId)],
  };
}

function defaultGoalTitle(scope: GoalTreeScope) {
  return scope === "company" ? "会社" : scope === "daily" ? "今日" : "個人";
}

function defaultGoalDueDate(scope: GoalTreeScope) {
  return scope === "company" ? dateOffset(206) : scope === "daily" ? dateOffset(0) : dateOffset(7);
}

function normalizeGoalTreeInput(input: Partial<GoalTree>, fallback: GoalTree): GoalTree {
  const dueDate = input.dueDate || fallback.dueDate;
  const ownerEmployeeId = input.scope === "company" ? null : (input.ownerEmployeeId ?? fallback.ownerEmployeeId);
  return {
    ...fallback,
    title: input.title ?? fallback.title,
    goal: input.goal ?? fallback.goal,
    dueDate,
    ownerEmployeeId,
    metrics: input.metrics ? input.metrics.map(normalizeGoalMetric) : fallback.metrics,
    branches: input.branches
      ? input.branches.map((branch) => normalizeGoalBranch(branch, dueDate, ownerEmployeeId))
      : fallback.branches,
    updatedAt: new Date().toISOString(),
  };
}

export function getGoalTrees(role: Role, employeeId?: string) {
  return (isAdmin(role) ? mutableGoalTrees : mutableGoalTrees.filter((tree) => goalTreeVisibleToEmployee(tree, employeeId))).map((tree) => ({
    ...tree,
    metrics: tree.metrics.map((metric) => ({ ...metric })),
    branches: tree.branches.map((branch) => ({
      ...branch,
      tasks: branch.tasks.map((task) => ({ ...task })),
    })),
  }));
}

export function createGoalTree(input: Partial<GoalTree>, role: Role, employeeId?: string) {
  const requestedScope = (input.scope as GoalTreeScope) || "daily";
  const scope: GoalTreeScope = isAdmin(role) ? requestedScope : requestedScope === "daily" ? "daily" : "personal";
  const ownerEmployeeId = scope === "company" ? null : isAdmin(role) ? (input.ownerEmployeeId ?? employeeId ?? employees[0].id) : (employeeId ?? employees[0].id);
  const dueDate = input.dueDate || defaultGoalDueDate(scope);
  const tree: GoalTree = {
    id: uid("goal-tree"),
    scope,
    title: input.title || defaultGoalTitle(scope),
    goal: input.goal || "新しい目標",
    ownerEmployeeId,
    dueDate,
    metrics: input.metrics?.map(normalizeGoalMetric) ?? [],
    branches: input.branches?.length
      ? input.branches.map((branch) => normalizeGoalBranch(branch, dueDate, ownerEmployeeId))
      : [normalizeGoalBranch({}, dueDate, ownerEmployeeId)],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mutableGoalTrees.unshift(tree);
  return tree;
}

export function updateGoalTree(id: string, input: Partial<GoalTree>, role: Role, employeeId?: string) {
  const index = mutableGoalTrees.findIndex((tree) => tree.id === id);
  if (index < 0 || !canMutateGoalTree(mutableGoalTrees[index], role, employeeId)) return null;
  const current = mutableGoalTrees[index];
  const scope = isAdmin(role) ? ((input.scope as GoalTreeScope | undefined) ?? current.scope) : current.scope;
  const ownerEmployeeId = scope === "company" ? null : isAdmin(role) ? (input.ownerEmployeeId ?? current.ownerEmployeeId) : current.ownerEmployeeId;
  mutableGoalTrees[index] = normalizeGoalTreeInput({ ...input, id: current.id, scope, ownerEmployeeId }, { ...current, scope, ownerEmployeeId });
  return mutableGoalTrees[index];
}

export function deleteGoalTree(id: string, role: Role, employeeId?: string) {
  const index = mutableGoalTrees.findIndex((tree) => tree.id === id);
  if (index < 0 || !canMutateGoalTree(mutableGoalTrees[index], role, employeeId)) return false;
  mutableGoalTrees.splice(index, 1);
  return true;
}

export function createProject(input: Partial<Project>) {
  const customer = customers.find((item) => item.id === input.customerId) ?? customers[0];
  const project: Project = {
    id: uid("proj"),
    name: input.name || "新規案件",
    customerId: customer.id,
    customerName: customer.company,
    primaryOwnerId: input.primaryOwnerId || employees[0].id,
    secondaryOwnerIds: input.secondaryOwnerIds ?? [],
    startDate: input.startDate || new Date().toISOString(),
    dueDate: input.dueDate || dateOffset(14),
    budget: Number(input.budget ?? 0),
    status: (input.status as ProjectStatus) || "hearing",
    notes: input.notes || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mutableProjects.unshift(project);
  return project;
}

export function updateProject(id: string, input: Partial<Project>) {
  const index = mutableProjects.findIndex((project) => project.id === id);
  if (index < 0) return null;
  mutableProjects[index] = { ...mutableProjects[index], ...input, updatedAt: new Date().toISOString() };
  return mutableProjects[index];
}

export function deleteProject(id: string) {
  const index = mutableProjects.findIndex((project) => project.id === id);
  if (index < 0) return false;
  mutableProjects.splice(index, 1);
  return true;
}

export function getTasks(role: Role, employeeId: string | undefined, filters: TaskFilter = {}) {
  let result = visibleTasks(role, employeeId);
  if (filters.assigneeId) result = result.filter((task) => task.assigneeIds.includes(filters.assigneeId!));
  if (filters.projectId) result = result.filter((task) => task.projectId === filters.projectId);
  if (filters.priority) result = result.filter((task) => task.priority === filters.priority);
  if (filters.status) result = result.filter((task) => task.status === filters.status);
  if (filters.due === "today") result = result.filter((task) => dayDiff(task.dueDate) === 0);
  if (filters.due === "week") result = result.filter((task) => dayDiff(task.dueDate) <= 7 && dayDiff(task.dueDate) >= 0);
  if (filters.due === "overdue") result = result.filter((task) => dayDiff(task.dueDate) < 0 && task.status !== "done");

  if (filters.sort === "priority") result.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  else if (filters.sort === "assignee") result.sort((a, b) => a.primaryAssigneeId.localeCompare(b.primaryAssigneeId));
  else if (filters.sort === "updatedAt") result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  else result.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  return result;
}

export function createTask(input: Partial<Task>) {
  const task: Task = hydrateTask({
    id: uid("task"),
    title: input.title || "新規タスク",
    description: input.description || "",
    projectId: input.projectId || mutableProjects[0].id,
    primaryAssigneeId: input.primaryAssigneeId || employees[0].id,
    assigneeIds: input.assigneeIds?.length ? input.assigneeIds : [input.primaryAssigneeId || employees[0].id],
    dueDate: input.dueDate || dateOffset(3),
    priority: (input.priority as TaskPriority) || "normal",
    status: (input.status as TaskStatus) || "todo",
    attachments: input.attachments ?? [],
    commentsCount: 0,
    customerWaiting: Boolean(input.customerWaiting),
    delayRisk: Number(input.delayRisk ?? 10),
    aiPriorityScore: 0,
    estimatedMinutes: Number(input.estimatedMinutes ?? 45),
    scheduledStart: input.scheduledStart,
    scheduledEnd: input.scheduledEnd,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  mutableTasks.unshift(task);
  if (input.sourceGoalTreeId || input.sourceBranchId) {
    syncTaskGoalLink(task, input);
  }
  return hydrateTask(task);
}

export function updateTask(id: string, input: Partial<Task>) {
  const index = mutableTasks.findIndex((task) => task.id === id);
  if (index < 0) return null;
  mutableTasks[index] = hydrateTask({ ...mutableTasks[index], ...input, updatedAt: new Date().toISOString() });
  const task = mutableTasks[index];
  const sourceInputChanged = input.sourceGoalTreeId !== undefined || input.sourceBranchId !== undefined;
  const taskShapeChanged = input.title !== undefined || input.dueDate !== undefined || input.primaryAssigneeId !== undefined || input.projectId !== undefined;
  if (sourceInputChanged || (taskShapeChanged && task.sourceGoalTreeId && task.sourceBranchId)) {
    syncTaskGoalLink(task, {
      sourceGoalTreeId: sourceInputChanged ? input.sourceGoalTreeId : task.sourceGoalTreeId,
      sourceBranchId: sourceInputChanged ? input.sourceBranchId : task.sourceBranchId,
    });
  }
  mutableTasks[index] = hydrateTask(mutableTasks[index]);
  return mutableTasks[index];
}

export function deleteTask(id: string) {
  const index = mutableTasks.findIndex((task) => task.id === id);
  if (index < 0) return false;
  syncTaskGoalLink(mutableTasks[index], { sourceGoalTreeId: null, sourceBranchId: null });
  mutableTasks.splice(index, 1);
  return true;
}

export function addTaskComment(taskId: string, authorUserId: string, body: string) {
  const comment = { id: uid("comment"), taskId, authorUserId, body, createdAt: new Date().toISOString() };
  mutableComments.push(comment);
  const task = mutableTasks.find((item) => item.id === taskId);
  if (task) task.commentsCount += 1;
  return comment;
}

export function getAttendance(role: Role, employeeId?: string) {
  const scopedEmployees = getEmployees(role, employeeId);
  const employeeIds = scopedEmployees.map((employee) => employee.id);
  return {
    employees: scopedEmployees,
    logs: mutableAttendance.filter((log) => employeeIds.includes(log.employeeId)),
    leaveRequests: isAdmin(role) ? leaveRequests : leaveRequests.filter((request) => request.employeeId === employeeId),
  };
}

export function clockAttendance(employeeId: string, eventType: AttendanceEvent, source: AttendanceLog["source"] = "manual") {
  const log: AttendanceLog = { id: uid("att"), employeeId, eventType, source, recordedAt: new Date().toISOString() };
  mutableAttendance.unshift(log);
  const employee = employees.find((item) => item.id === employeeId);
  if (employee) {
    employee.attendanceStatus =
      eventType === "clock_in" || eventType === "break_end" || eventType === "return"
        ? "working"
        : eventType === "break_start"
          ? "break"
          : eventType === "out"
            ? "out"
            : eventType === "meeting"
              ? "meeting"
              : eventType === "absent"
                ? "absent"
                : "off";
  }
  return log;
}

export function getNotifications(role: Role, userId?: string) {
  if (isAdmin(role)) return mutableNotifications;
  return mutableNotifications.filter((notice) => notice.userId === userId);
}

export function markNotificationRead(id: string) {
  const notice = mutableNotifications.find((item) => item.id === id);
  if (!notice) return null;
  notice.readAt = new Date().toISOString();
  return notice;
}

function addMinutes(iso: string, minutes: number) {
  return new Date(new Date(iso).getTime() + minutes * 60000).toISOString();
}

function taskToScheduleBlock(task: Task, index: number): ScheduleBlock {
  const fallbackStart = addMinutes(dateOffset(0, 9), index * 70);
  const start = task.scheduledStart ?? fallbackStart;
  const end = task.scheduledEnd ?? addMinutes(start, task.estimatedMinutes);
  const nowTime = Date.now();
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  return {
    id: `block-${task.id}`,
    title: task.title,
    kind: "task",
    start,
    end,
    taskId: task.id,
    projectId: task.projectId,
    risk: task.aiPriorityScore,
    status: task.status === "done" ? "done" : endTime < nowTime ? "missed" : startTime <= nowTime && endTime >= nowTime ? "active" : "upcoming",
  };
}

function buildRevenueSummary(role: Role, employeeId?: string): RevenueSummary {
  const scopedProjects = visibleProjects(role, employeeId).filter((project) => project.status !== "completed");
  const statusWeight: Record<ProjectStatus, number> = {
    pre_order: 0.15,
    hearing: 0.25,
    proposal: 0.45,
    production: 0.75,
    customer_review: 0.82,
    revision: 0.72,
    final_review: 0.9,
    delivered: 0.95,
    maintenance: 0.65,
    completed: 1,
  };
  const monthBooked = scopedProjects
    .filter((project) => ["production", "customer_review", "revision", "final_review", "delivered", "maintenance"].includes(project.status))
    .reduce((sum, project) => sum + project.budget, 0);
  const weightedForecast = Math.round(scopedProjects.reduce((sum, project) => sum + project.budget * statusWeight[project.status], 0));
  const personalContribution = Math.round(
    scopedProjects
      .filter((project) => !employeeId || project.primaryOwnerId === employeeId || project.secondaryOwnerIds.includes(employeeId))
      .reduce((sum, project) => sum + project.budget * statusWeight[project.status], 0),
  );
  return {
    monthTarget: 500000,
    monthBooked,
    weightedForecast,
    personalContribution,
    activePipeline: scopedProjects.reduce((sum, project) => sum + project.budget, 0),
    closingHints: [
      "返信済み候補は午前中に次回確認日まで返す",
      "6月は連絡60件、返信10件、商談4件を毎日見直す",
      "高単価候補はPOCと本開発を分けて約束する",
    ],
  };
}

export function getDailyPlan(role: Role, employeeId?: string): DailyPlan {
  const scopedTasks = visibleTasks(role, employeeId).filter((task) => task.status !== "done");
  const sortedTasks = [...scopedTasks].sort((a, b) => b.aiPriorityScore - a.aiPriorityScore);
  const focusTask = sortedTasks[0] ?? null;
  const nextTasks = sortedTasks.slice(1, 5);
  const completedToday = visibleTasks(role, employeeId).filter((task) => task.status === "done" && dayDiff(task.updatedAt) === 0);
  const schedule = sortedTasks.slice(0, 5).map(taskToScheduleBlock);
  const topRisk = focusTask?.aiPriorityScore ?? 0;
  const riskLevel: DailyPlan["riskLevel"] = topRisk >= 82 ? "danger" : topRisk >= 60 ? "watch" : "safe";
  return {
    ownerEmployeeId: employeeId ?? null,
    generatedAt: new Date().toISOString(),
    focusTask,
    nextTasks,
    completedToday,
    schedule,
    riskLevel,
    riskMessage:
      riskLevel === "danger"
        ? "午前中に片付けないと、顧客返信と納期の両方に影響が出ます。"
        : riskLevel === "watch"
          ? "今日中ならまだ戻せます。先に1つだけ完了させるのが効きます。"
          : "大きな遅延リスクは低めです。集中時間を守れば十分回せます。",
    ifDoneNext: nextTasks[0] ? `終わったら次は「${nextTasks[0].title}」です。` : "終わったら通知と明日の予定を確認してください。",
    ifNotDoneImpact: focusTask
      ? `「${focusTask.title}」が残ると、AIリスク ${focusTask.aiPriorityScore} のまま明日に持ち越されます。`
      : "未完了タスクはありません。",
    voicePromptExamples: [
      "今日やることを教えて",
      "このタスクを30分後に回して",
      "終わった。次は何？",
      "売上見込みを確認したい",
    ],
    calendarExportUrl: `/api/calendar/ics?role=${role}${employeeId ? `&employeeId=${employeeId}` : ""}`,
    revenue: buildRevenueSummary(role, employeeId),
  };
}

export function getDashboard(role: Role, employeeId?: string, userId?: string): DashboardSummary {
  const scopedTasks = visibleTasks(role, employeeId);
  const todayTasks = scopedTasks.filter((task) => dayDiff(task.dueDate) === 0 && task.status !== "done");
  const weekTasks = scopedTasks.filter((task) => dayDiff(task.dueDate) >= 0 && dayDiff(task.dueDate) <= 7 && task.status !== "done");
  const urgentTasks = scopedTasks.filter((task) => task.priority === "urgent" && task.status !== "done");
  const delayedTasks = scopedTasks.filter((task) => dayDiff(task.dueDate) < 0 && task.status !== "done");
  const scopedProjects = visibleProjects(role, employeeId);
  const allProjectStatuses: ProjectStatus[] = [
    "pre_order",
    "hearing",
    "proposal",
    "production",
    "customer_review",
    "revision",
    "final_review",
    "delivered",
    "maintenance",
    "completed",
  ];
  const allAttendanceStatuses: AttendanceStatus[] = ["working", "break", "out", "meeting", "off", "absent"];
  const employee = employees.find((item) => item.id === employeeId);
  const aiRecommendations = [
    ...aiSummaries.filter((summary) => role === "admin" || summary.targetId === employeeId),
    ...scopedTasks
      .filter((task) => task.status !== "done")
      .sort((a, b) => b.aiPriorityScore - a.aiPriorityScore)
      .slice(0, 3)
      .map<AiSummary>((task) => ({
        id: `ai-${task.id}`,
        targetType: "task",
        targetId: task.id,
        title: `優先度 ${task.aiPriorityScore}: ${task.title}`,
        summary: "期限・優先度・顧客返信待ち・遅延リスクから、今日の上位候補に入っています。",
        score: task.aiPriorityScore,
      })),
  ].sort((a, b) => b.score - a.score);

  return {
    dailyPlan: getDailyPlan(role, employeeId),
    todayTasks,
    weekTasks,
    urgentTasks,
    delayedTasks,
    employeeStatus: countByStatus(employees.map((item) => item.attendanceStatus), allAttendanceStatuses),
    projectStatus: countByStatus(scopedProjects.map((item) => item.status), allProjectStatuses),
    activeProjects: scopedProjects.filter((project) => project.status !== "completed").slice(0, 6),
    notifications: getNotifications(role, userId).slice(0, 5),
    leaveBalanceDays: isAdmin(role) ? null : employee?.leaveBalanceDays ?? null,
    aiRecommendations,
  };
}

export function getRecommendations(role: Role, employeeId?: string) {
  return getDashboard(role, employeeId).aiRecommendations;
}

export function getActivityLogs(): ActivityLog[] {
  return mutableActivity;
}

export function addActivityLog(log: Omit<ActivityLog, "id" | "createdAt">) {
  const entry: ActivityLog = { ...log, id: uid("act"), createdAt: new Date().toISOString() };
  mutableActivity.unshift(entry);
  return entry;
}

export function getLookupData() {
  return {
    employees,
    projects: mutableProjects,
    customers,
  };
}

export function getUsers(role: Role) {
  return isAdmin(role) ? mutableUsers.filter((user) => !hiddenEmployeeIds.has(user.employeeId)).map(betaUser) : [];
}

export function updateUserRole(userId: string, input: Pick<User, "role" | "employmentType">) {
  const user = mutableUsers.find((item) => item.id === userId);
  if (!user) return null;
  user.role = input.role;
  user.employmentType = input.employmentType;
  addActivityLog({
    actorUserId: "user-admin",
    action: "user.permission_updated",
    entityType: "user",
    entityId: userId,
    metadata: { role: input.role, employmentType: input.employmentType },
  });
  return user;
}

export function getUserByEmployee(employeeId: string): User | undefined {
  const user = mutableUsers.find((item) => item.employeeId === employeeId && !hiddenEmployeeIds.has(item.employeeId));
  return user ? betaUser(user) : undefined;
}

export function getCustomerById(customerId: string): Customer | undefined {
  return customers.find((customer) => customer.id === customerId);
}

function icsDate(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function getCalendarIcs(role: Role, employeeId?: string) {
  const plan = getDailyPlan(role, employeeId);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nos Technology//Nos OS//JA",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...plan.schedule.flatMap((block) => [
      "BEGIN:VEVENT",
      `UID:${block.id}@nos-os.local`,
      `DTSTAMP:${icsDate(plan.generatedAt)}`,
      `DTSTART:${icsDate(block.start)}`,
      `DTEND:${icsDate(block.end)}`,
      `SUMMARY:${escapeIcs(block.title)}`,
      `DESCRIPTION:${escapeIcs(`Nos OS priority ${block.risk}. ${plan.ifNotDoneImpact}`)}`,
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}
