import { createPasswordSalt, hashPassword, passwordIsAcceptable, verifyPassword } from "@/lib/auth/password";
import { priorityOrder } from "@/lib/data/labels";
import { deleteRows, insertRows, newUuid, patchRows, selectOne, selectRows, stableUuid, upsertRows } from "@/lib/data/supabase-rest";
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
  Goal,
  GoalTree,
  GoalTreeBranch,
  GoalTreeMetric,
  GoalTreeScope,
  GoalTreeTask,
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
  LoginAccount,
  Notification as AppNotification,
  WorkReport,
  WorkReportPeriod,
} from "@/lib/types";

type UserRow = {
  id: string;
  email: string;
  role: string;
  employment_type: string;
  auth_provider: string;
  password_salt?: string | null;
  password_hash?: string | null;
  must_change_password?: boolean | null;
  password_changed_at?: string | null;
  created_at: string;
  updated_at?: string;
};

type EmployeeRow = {
  id: string;
  user_id: string;
  name: string;
  position: string;
  department: string;
  avatar_url: string | null;
  bio: string;
  leave_balance_days: number | string;
  attendance_status: string;
  created_at: string;
  updated_at?: string;
};

const deprecatedDemoEmails = new Set(["admin@nostechnology.jp", "akari@nostechnology.jp", "ren@nostechnology.jp", "mio@nostechnology.jp"]);

type CustomerRow = {
  id: string;
  name: string;
  company: string;
  email: string | null;
  phone: string | null;
  notes: string;
  health: string;
};

type ProjectRow = {
  id: string;
  name: string;
  customer_id: string | null;
  primary_owner_id: string | null;
  secondary_owner_id?: string | null;
  start_date: string;
  due_date: string;
  budget: number | string;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

type ProjectMemberRow = {
  project_id: string;
  employee_id: string;
  role: "primary" | "secondary" | "viewer";
};

type TaskRow = {
  id: string;
  title: string;
  body: string;
  project_id: string | null;
  primary_assignee_id: string | null;
  due_date: string;
  priority: string;
  status: string;
  attachments: string[] | null;
  customer_waiting: boolean;
  delay_risk: number;
  ai_priority_score: number;
  estimated_minutes: number;
  scheduled_start: string | null;
  scheduled_end: string | null;
  created_at: string;
  updated_at: string;
};

type TaskAssigneeRow = {
  task_id: string;
  employee_id: string;
};

type TaskCommentRow = {
  id: string;
  task_id: string;
  author_user_id: string | null;
  body: string;
  created_at: string;
};

type GoalTreeRow = {
  id: string;
  scope: GoalTreeScope;
  title: string;
  goal: string;
  owner_employee_id: string | null;
  due_date: string;
  metrics: GoalTreeMetric[] | null;
  branches: GoalTreeBranch[] | null;
  created_at: string;
  updated_at: string;
};

type AttendanceLogRow = {
  id: string;
  employee_id: string;
  event_type: AttendanceEvent;
  recorded_at: string;
  source: "manual" | "qr" | "google_sheets";
  note?: string | null;
};

type LeaveRequestRow = {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  days: number | string;
  status: "pending" | "approved" | "rejected";
};

type NotificationRow = {
  id: string;
  user_id: string | null;
  type: string;
  title: string;
  body: string;
  severity: "info" | "success" | "warning" | "danger";
  target_href: string | null;
  read_at?: string | null;
  created_at: string;
};

type AiSummaryRow = {
  id: string;
  target_type: "employee" | "project" | "task" | "company";
  target_id: string | null;
  title: string;
  summary: string;
  score: number;
  created_at: string;
};

type ActivityLogRow = {
  id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function dbId(id?: string | null) {
  if (!id) return undefined;
  return uuidPattern.test(id) ? id : stableUuid(id);
}

function defined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
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

function toDate(value?: string) {
  return (value ? new Date(value) : new Date()).toISOString().slice(0, 10);
}

function roleFrom(value: string): Role {
  return value === "admin" || value === "sales" ? value : "employee";
}

function isAdmin(role: Role) {
  return role === "admin";
}

function canMutateGoalTree(tree: GoalTree, role: Role, employeeId?: string) {
  if (isAdmin(role)) return true;
  return tree.scope !== "company" && tree.ownerEmployeeId === dbId(employeeId);
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
  return Math.round(deadlineScore * 0.4 + priorityScore[task.priority] * 0.3 + customerWaitingScore * 0.2 + task.delayRisk * 0.1);
}

async function readCore() {
  const [users, employees, customers, projects, projectMembers, tasks, taskAssignees, taskComments, goalTrees] = await Promise.all([
    selectRows<UserRow>("users", { order: "created_at.asc" }),
    selectRows<EmployeeRow>("employees", { order: "created_at.asc" }),
    selectRows<CustomerRow>("customers", { order: "created_at.asc" }),
    selectRows<ProjectRow>("projects", { order: "created_at.asc" }),
    selectRows<ProjectMemberRow>("project_members"),
    selectRows<TaskRow>("tasks", { order: "due_date.asc" }),
    selectRows<TaskAssigneeRow>("task_assignees"),
    selectRows<TaskCommentRow>("task_comments"),
    selectRows<GoalTreeRow>("goal_trees", { order: "created_at.asc" }).catch(() => []),
  ]);
  return { users, employees, customers, projects, projectMembers, tasks, taskAssignees, taskComments, goalTrees };
}

function taskAssigneesFor(taskId: string, assignees: TaskAssigneeRow[], primaryAssigneeId?: string | null) {
  const ids = assignees.filter((row) => row.task_id === taskId).map((row) => row.employee_id);
  return ids.length ? ids : [primaryAssigneeId].filter(defined);
}

function taskGoalContext(taskId: string, goalTrees: GoalTreeRow[] = []): Pick<Task, "sourceGoalTreeId" | "sourceGoalTreeTitle" | "sourceBranchId" | "sourceBranchTitle"> {
  for (const treeRow of goalTrees) {
    const tree = mapGoalTree(treeRow);
    for (const branch of tree.branches) {
      const materializedTask = branch.tasks.find((task) => task.taskId && dbId(task.taskId) === taskId);
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

function mapTask(row: TaskRow, assignees: TaskAssigneeRow[] = [], comments: TaskCommentRow[] = [], goalTrees: GoalTreeRow[] = []): Task {
  const task: Task = {
    id: row.id,
    title: row.title,
    description: row.body ?? "",
    projectId: row.project_id ?? "",
    ...taskGoalContext(row.id, goalTrees),
    primaryAssigneeId: row.primary_assignee_id ?? "",
    assigneeIds: taskAssigneesFor(row.id, assignees, row.primary_assignee_id),
    dueDate: row.due_date,
    priority: (row.priority as TaskPriority) || "normal",
    status: (row.status as TaskStatus) || "todo",
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    commentsCount: comments.filter((comment) => comment.task_id === row.id).length,
    customerWaiting: Boolean(row.customer_waiting),
    delayRisk: Number(row.delay_risk ?? 0),
    aiPriorityScore: 0,
    estimatedMinutes: Number(row.estimated_minutes ?? 45),
    scheduledStart: row.scheduled_start ?? undefined,
    scheduledEnd: row.scheduled_end ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  return { ...task, aiPriorityScore: calculatePriorityScore(task) };
}

function projectSecondaryOwners(projectId: string, members: ProjectMemberRow[]) {
  return members.filter((member) => member.project_id === projectId && member.role !== "primary").map((member) => member.employee_id);
}

function mapProject(row: ProjectRow, customers: CustomerRow[] = [], members: ProjectMemberRow[] = []): Project {
  const customer = customers.find((item) => item.id === row.customer_id);
  return {
    id: row.id,
    name: row.name,
    customerId: row.customer_id ?? "",
    customerName: customer?.company ?? "",
    primaryOwnerId: row.primary_owner_id ?? "",
    secondaryOwnerIds: projectSecondaryOwners(row.id, members),
    startDate: row.start_date,
    dueDate: row.due_date,
    budget: Number(row.budget ?? 0),
    status: (row.status as ProjectStatus) || "hearing",
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    email: row.email ?? "",
    phone: row.phone ?? "",
    notes: row.notes,
    health: row.health === "risk" || row.health === "watch" ? row.health : "good",
  };
}

function mapUser(row: UserRow, employees: EmployeeRow[]): User {
  const employee = employees.find((item) => item.user_id === row.id);
  return {
    id: row.id,
    email: row.email,
    name: employee?.name ?? row.email,
    role: roleFrom(row.role),
    employmentType: row.employment_type === "part_time" || row.employment_type === "contractor" ? row.employment_type : "full_time",
    employeeId: employee?.id ?? "",
    authProvider: row.auth_provider === "email" ? "email" : "google",
    createdAt: row.created_at,
    mustChangePassword: row.must_change_password ?? !row.password_hash,
  };
}

function mapEmployee(row: EmployeeRow, members: ProjectMemberRow[] = [], tasks: Task[] = []): Employee {
  const assignedProjectIds = members.filter((member) => member.employee_id === row.id).map((member) => member.project_id);
  const employeeTasks = tasks.filter((task) => task.primaryAssigneeId === row.id || task.assigneeIds.includes(row.id));
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    position: row.position,
    department: row.department,
    avatarUrl: row.avatar_url ?? row.name.slice(0, 2).toUpperCase(),
    bio: row.bio,
    leaveBalanceDays: Number(row.leave_balance_days ?? 0),
    attendanceStatus: (row.attendance_status as AttendanceStatus) || "off",
    assignedProjectIds,
    pastProjectIds: [],
    taskStats: {
      total: employeeTasks.length,
      completed: employeeTasks.filter((task) => task.status === "done").length,
      delayed: employeeTasks.filter((task) => dayDiff(task.dueDate) < 0 && task.status !== "done").length,
      urgent: employeeTasks.filter((task) => task.priority === "urgent").length,
    },
  };
}

function visibleToEmployee(project: Project, employeeId?: string) {
  const normalized = dbId(employeeId);
  return Boolean(normalized && (project.primaryOwnerId === normalized || project.secondaryOwnerIds.includes(normalized)));
}

function taskVisibleToEmployee(task: Task, employeeId?: string) {
  const normalized = dbId(employeeId);
  return Boolean(normalized && (task.primaryAssigneeId === normalized || task.assigneeIds.includes(normalized)));
}

function filterProjectsForRole(projects: Project[], role: Role, employeeId?: string) {
  return isAdmin(role) ? projects : projects.filter((project) => visibleToEmployee(project, employeeId));
}

function filterTasksForRole(tasks: Task[], role: Role, employeeId?: string) {
  return isAdmin(role) ? tasks : tasks.filter((task) => taskVisibleToEmployee(task, employeeId));
}

export async function loginUser(input: { employeeId?: string; email?: string; password?: string; role?: Role; provider?: "google" | "email" }) {
  const { users, employees } = await readCore();
  const requestedRole = input.role ?? "employee";
  const selectedEmployee = employees.find((employee) => employee.id === dbId(input.employeeId));
  const found =
    (selectedEmployee ? users.find((user) => user.id === selectedEmployee.user_id) : undefined) ??
    users.find((user) => user.email === input.email) ??
    users.find((user) => roleFrom(user.role) === requestedRole) ??
    users[0];
  if (!found || deprecatedDemoEmails.has(found.email)) return null;
  if (!verifyPassword(input.password ?? "", found.password_salt, found.password_hash)) return null;
  return { ...mapUser(found, employees), authProvider: input.provider ?? (found.auth_provider === "email" ? "email" : "google") };
}

export async function changePassword(input: { userId?: string; currentPassword?: string; newPassword?: string }) {
  const normalized = dbId(input.userId);
  if (!normalized || !passwordIsAcceptable(input.newPassword ?? "")) return null;

  const { users, employees } = await readCore();
  const current = users.find((user) => user.id === normalized);
  if (!current || !verifyPassword(input.currentPassword ?? "", current.password_salt, current.password_hash)) return null;

  const salt = createPasswordSalt();
  const [row] = await patchRows<UserRow>(
    "users",
    { id: `eq.${normalized}` },
    {
      password_salt: salt,
      password_hash: hashPassword(input.newPassword ?? "", salt),
      must_change_password: false,
      password_changed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  );
  return row ? mapUser(row, employees) : null;
}

export async function getLoginAccounts(): Promise<LoginAccount[]> {
  const { users, employees } = await readCore();
  return employees
    .map((employee) => {
      const user = users.find((item) => item.id === employee.user_id);
      if (!user || deprecatedDemoEmails.has(user.email)) return null;
      return {
        userId: user.id,
        employeeId: employee.id,
        name: employee.name,
        role: roleFrom(user.role),
        department: employee.department,
        position: employee.position,
        avatarUrl: employee.avatar_url ?? "",
        mustChangePassword: user.must_change_password ?? !user.password_hash,
      } satisfies LoginAccount;
    })
    .filter((account): account is LoginAccount => Boolean(account))
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === "admin" ? -1 : b.role === "admin" ? 1 : 0;
      return a.name.localeCompare(b.name, "ja");
    });
}

export async function getUser(userId?: string) {
  const { users, employees } = await readCore();
  const normalized = dbId(userId);
  const row = users.find((user) => user.id === normalized) ?? users[0];
  return mapUser(row, employees);
}

export async function getEmployee(employeeId?: string) {
  const { employees, projectMembers, tasks, taskAssignees, taskComments, goalTrees } = await readCore();
  const normalized = dbId(employeeId);
  const mappedTasks = tasks.map((task) => mapTask(task, taskAssignees, taskComments, goalTrees));
  const row = employees.find((employee) => employee.id === normalized) ?? employees[0];
  return mapEmployee(row, projectMembers, mappedTasks);
}

export async function getEmployees(role: Role, employeeId?: string) {
  const { employees, projectMembers, tasks, taskAssignees, taskComments, goalTrees } = await readCore();
  const normalized = dbId(employeeId);
  const mappedTasks = tasks.map((task) => mapTask(task, taskAssignees, taskComments, goalTrees));
  const scopedRows = isAdmin(role) ? employees : employees.filter((employee) => employee.id === normalized);
  return scopedRows.map((employee) => mapEmployee(employee, projectMembers, mappedTasks));
}

export async function updateEmployee(id: string, input: Partial<Employee>) {
  const normalized = dbId(id);
  if (!normalized) return null;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.position !== undefined) patch.position = input.position;
  if (input.department !== undefined) patch.department = input.department;
  if (input.avatarUrl !== undefined) patch.avatar_url = input.avatarUrl;
  if (input.bio !== undefined) patch.bio = input.bio;
  if (input.leaveBalanceDays !== undefined) patch.leave_balance_days = Number(input.leaveBalanceDays);
  if (input.attendanceStatus !== undefined) patch.attendance_status = input.attendanceStatus;
  await patchRows<EmployeeRow>("employees", { id: `eq.${normalized}` }, patch);
  const { employees, projectMembers, tasks, taskAssignees, taskComments, goalTrees } = await readCore();
  const row = employees.find((employee) => employee.id === normalized);
  return row ? mapEmployee(row, projectMembers, tasks.map((task) => mapTask(task, taskAssignees, taskComments, goalTrees))) : null;
}

export async function getCustomers() {
  return (await selectRows<CustomerRow>("customers", { order: "created_at.asc" })).map(mapCustomer);
}

export async function updateCustomer(id: string, input: Partial<Customer>) {
  const normalized = dbId(id);
  if (!normalized) return null;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.company !== undefined) patch.company = input.company;
  if (input.email !== undefined) patch.email = input.email || null;
  if (input.phone !== undefined) patch.phone = input.phone || null;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.health !== undefined) patch.health = input.health;
  const [row] = await patchRows<CustomerRow>("customers", { id: `eq.${normalized}` }, patch);
  return row ? mapCustomer(row) : null;
}

export async function getProjects(role: Role, employeeId?: string) {
  const { customers, projects, projectMembers } = await readCore();
  return filterProjectsForRole(
    projects.map((project) => mapProject(project, customers, projectMembers)),
    role,
    employeeId,
  );
}

export async function getTasks(role: Role, employeeId: string | undefined, filters: TaskFilter = {}) {
  const { tasks, taskAssignees, taskComments, goalTrees } = await readCore();
  let result = filterTasksForRole(
    tasks.map((task) => mapTask(task, taskAssignees, taskComments, goalTrees)),
    role,
    employeeId,
  );

  const filterAssigneeId = dbId(filters.assigneeId);
  const filterProjectId = dbId(filters.projectId);
  if (filterAssigneeId) result = result.filter((task) => task.assigneeIds.includes(filterAssigneeId));
  if (filterProjectId) result = result.filter((task) => task.projectId === filterProjectId);
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

async function firstProjectAndEmployee() {
  const { projects, employees } = await readCore();
  return { projectId: projects[0]?.id ?? null, employeeId: employees[0]?.id ?? null };
}

async function writeTaskAssignees(taskId: string, assigneeIds: string[]) {
  await deleteRows("task_assignees", { task_id: `eq.${taskId}` });
  const rows = Array.from(new Set(assigneeIds.map((id) => dbId(id)).filter(defined))).map((employee_id) => ({ task_id: taskId, employee_id }));
  if (rows.length) await insertRows<TaskAssigneeRow>("task_assignees", rows);
}

async function getTaskById(id: string) {
  const { tasks, taskAssignees, taskComments, goalTrees } = await readCore();
  const row = tasks.find((task) => task.id === id);
  return row ? mapTask(row, taskAssignees, taskComments, goalTrees) : null;
}

export async function createTask(input: Partial<Task>) {
  const fallback = await firstProjectAndEmployee();
  const primaryAssigneeId = dbId(input.primaryAssigneeId) ?? fallback.employeeId;
  const assigneeIds = input.assigneeIds?.length ? input.assigneeIds.map((id) => dbId(id)).filter(defined) : [primaryAssigneeId].filter(defined);
  const baseTask: Pick<Task, "dueDate" | "priority" | "customerWaiting" | "delayRisk"> = {
    dueDate: input.dueDate || new Date().toISOString(),
    priority: (input.priority as TaskPriority) || "normal",
    customerWaiting: Boolean(input.customerWaiting),
    delayRisk: Number(input.delayRisk ?? 10),
  };
  const [created] = await insertRows<TaskRow>("tasks", [
    {
      title: input.title || "新規タスク",
      body: input.description || "",
      project_id: dbId(input.projectId) ?? fallback.projectId,
      primary_assignee_id: primaryAssigneeId,
      due_date: toDate(input.dueDate),
      priority: baseTask.priority,
      status: (input.status as TaskStatus) || "todo",
      attachments: input.attachments ?? [],
      customer_waiting: Boolean(input.customerWaiting),
      delay_risk: baseTask.delayRisk,
      ai_priority_score: calculatePriorityScore(baseTask),
      estimated_minutes: Number(input.estimatedMinutes ?? 45),
      scheduled_start: input.scheduledStart ?? null,
      scheduled_end: input.scheduledEnd ?? null,
    },
  ]);
  await writeTaskAssignees(created.id, assigneeIds);
  const task = (await getTaskById(created.id)) ?? mapTask(created);
  if (input.sourceGoalTreeId || input.sourceBranchId) {
    await syncTaskGoalLink(task, input);
  }
  return (await getTaskById(created.id)) ?? task;
}

export async function updateTask(id: string, input: Partial<Task>) {
  const normalized = dbId(id);
  if (!normalized) return null;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.body = input.description;
  if (input.projectId !== undefined) patch.project_id = dbId(input.projectId) ?? null;
  if (input.primaryAssigneeId !== undefined) patch.primary_assignee_id = dbId(input.primaryAssigneeId) ?? null;
  if (input.dueDate !== undefined) patch.due_date = toDate(input.dueDate);
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.status !== undefined) patch.status = input.status;
  if (input.attachments !== undefined) patch.attachments = input.attachments;
  if (input.customerWaiting !== undefined) patch.customer_waiting = input.customerWaiting;
  if (input.delayRisk !== undefined) patch.delay_risk = Number(input.delayRisk);
  if (input.estimatedMinutes !== undefined) patch.estimated_minutes = Number(input.estimatedMinutes);
  if (input.scheduledStart !== undefined) patch.scheduled_start = input.scheduledStart ?? null;
  if (input.scheduledEnd !== undefined) patch.scheduled_end = input.scheduledEnd ?? null;
  await patchRows<TaskRow>("tasks", { id: `eq.${normalized}` }, patch);
  if (input.assigneeIds?.length) await writeTaskAssignees(normalized, input.assigneeIds);
  else if (input.primaryAssigneeId !== undefined && typeof patch.primary_assignee_id === "string") await writeTaskAssignees(normalized, [patch.primary_assignee_id]);
  const task = await getTaskById(normalized);
  if (!task) return null;
  const sourceInputChanged = input.sourceGoalTreeId !== undefined || input.sourceBranchId !== undefined;
  const taskShapeChanged = input.title !== undefined || input.dueDate !== undefined || input.primaryAssigneeId !== undefined || input.projectId !== undefined;
  if (sourceInputChanged || (taskShapeChanged && task.sourceGoalTreeId && task.sourceBranchId)) {
    await syncTaskGoalLink(task, {
      sourceGoalTreeId: sourceInputChanged ? input.sourceGoalTreeId : task.sourceGoalTreeId,
      sourceBranchId: sourceInputChanged ? input.sourceBranchId : task.sourceBranchId,
    });
  }
  return getTaskById(normalized);
}

export async function deleteTask(id: string) {
  const normalized = dbId(id);
  if (!normalized) return false;
  const task = await getTaskById(normalized);
  if (!task) return false;
  await deleteRows<TaskCommentRow>("task_comments", { task_id: `eq.${normalized}` });
  await deleteRows<TaskAssigneeRow>("task_assignees", { task_id: `eq.${normalized}` });
  if (task) {
    await syncTaskGoalLink(task, { sourceGoalTreeId: null, sourceBranchId: null });
  }
  const deletedRows = await deleteRows<TaskRow>("tasks", { id: `eq.${normalized}` });
  if (!deletedRows.length) return !(await getTaskById(normalized));
  return !(await getTaskById(normalized));
}

export async function addTaskComment(taskId: string, authorUserId: string, body: string) {
  const [comment] = await insertRows<TaskCommentRow>("task_comments", [
    {
      task_id: dbId(taskId),
      author_user_id: dbId(authorUserId) ?? null,
      body,
    },
  ]);
  return {
    id: comment.id,
    taskId: comment.task_id,
    authorUserId: comment.author_user_id ?? "",
    body: comment.body,
    createdAt: comment.created_at,
  };
}

async function writeProjectMembers(projectId: string, primaryOwnerId: string | null, secondaryOwnerIds: string[]) {
  await deleteRows("project_members", { project_id: `eq.${projectId}` });
  const rows: ProjectMemberRow[] = [
    primaryOwnerId ? ({ project_id: projectId, employee_id: primaryOwnerId, role: "primary" } satisfies ProjectMemberRow) : null,
    ...secondaryOwnerIds.map<ProjectMemberRow>((employeeId) => ({ project_id: projectId, employee_id: employeeId, role: "secondary" })),
  ].filter(defined);
  if (rows.length) await insertRows<ProjectMemberRow>("project_members", rows);
}

export async function createProject(input: Partial<Project>) {
  const { customers, employees } = await readCore();
  const customerId = dbId(input.customerId) ?? customers[0]?.id ?? null;
  const primaryOwnerId = dbId(input.primaryOwnerId) ?? employees[0]?.id ?? null;
  const secondaryOwnerIds = (input.secondaryOwnerIds ?? []).map((id) => dbId(id)).filter(defined);
  const [created] = await insertRows<ProjectRow>("projects", [
    {
      name: input.name || "新規案件",
      customer_id: customerId,
      primary_owner_id: primaryOwnerId,
      secondary_owner_id: secondaryOwnerIds[0] ?? null,
      start_date: toDate(input.startDate),
      due_date: toDate(input.dueDate || new Date(Date.now() + 14 * 86400000).toISOString()),
      budget: Number(input.budget ?? 0),
      status: (input.status as ProjectStatus) || "hearing",
      notes: input.notes || "",
    },
  ]);
  await writeProjectMembers(created.id, primaryOwnerId, secondaryOwnerIds);
  const projects = await getProjects("admin");
  return projects.find((project) => project.id === created.id) ?? mapProject(created, customers, []);
}

export async function updateProject(id: string, input: Partial<Project>) {
  const normalized = dbId(id);
  if (!normalized) return null;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.customerId !== undefined) patch.customer_id = dbId(input.customerId) ?? null;
  if (input.primaryOwnerId !== undefined) patch.primary_owner_id = dbId(input.primaryOwnerId) ?? null;
  if (input.startDate !== undefined) patch.start_date = toDate(input.startDate);
  if (input.dueDate !== undefined) patch.due_date = toDate(input.dueDate);
  if (input.budget !== undefined) patch.budget = Number(input.budget);
  if (input.status !== undefined) patch.status = input.status;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.secondaryOwnerIds !== undefined) patch.secondary_owner_id = input.secondaryOwnerIds.map((item) => dbId(item)).filter(defined)[0] ?? null;
  await patchRows<ProjectRow>("projects", { id: `eq.${normalized}` }, patch);
  if (input.primaryOwnerId !== undefined || input.secondaryOwnerIds !== undefined) {
    const [row, currentMembers] = await Promise.all([
      selectOne<ProjectRow>("projects", { id: `eq.${normalized}` }),
      selectRows<ProjectMemberRow>("project_members", { project_id: `eq.${normalized}` }),
    ]);
    const secondaryOwnerIds =
      input.secondaryOwnerIds !== undefined
        ? input.secondaryOwnerIds.map((item) => dbId(item)).filter(defined)
        : currentMembers.filter((member) => member.role !== "primary").map((member) => member.employee_id);
    await writeProjectMembers(normalized, row?.primary_owner_id ?? null, secondaryOwnerIds);
  }
  const projects = await getProjects("admin");
  return projects.find((project) => project.id === normalized) ?? null;
}

export async function deleteProject(id: string) {
  const normalized = dbId(id);
  if (!normalized) return false;
  await deleteRows("projects", { id: `eq.${normalized}` });
  return true;
}

export async function getProjectDetail(role: Role, id: string, employeeId?: string): Promise<ProjectDetail | null> {
  const normalized = dbId(id);
  const projects = await getProjects(role, employeeId);
  const project = projects.find((item) => item.id === normalized);
  if (!project) return null;
  const [customers, employees, tasks, emails, activity] = await Promise.all([
    getCustomers(),
    getEmployees("admin"),
    getTasks("admin", undefined, { projectId: normalized }),
    selectRows<{ id: string; project_id: string | null; customer_id: string | null; sender: string; subject: string; received_at: string; ai_urgency: number | null }>("emails").catch(() => []),
    selectRows<ActivityLogRow>("activity_logs", { entity_type: "eq.project", entity_id: `eq.${normalized}` }).catch(() => []),
  ]);
  const memberIds = new Set([project.primaryOwnerId, ...project.secondaryOwnerIds]);
  return {
    ...project,
    customer: customers.find((customer) => customer.id === project.customerId) ?? null,
    members: employees.filter((employee) => memberIds.has(employee.id)),
    tasks,
    emails: emails
      .filter((email) => email.project_id === normalized)
      .map((email) => ({
        id: email.id,
        projectId: email.project_id ?? "",
        customerId: email.customer_id ?? "",
        from: email.sender,
        subject: email.subject,
        receivedAt: email.received_at,
        aiUrgency: Number(email.ai_urgency ?? 0),
      })),
    history: activity.map(mapActivityLog),
    files: [
      { id: `${normalized}-file-1`, name: "requirements.md", type: "document", updatedAt: project.updatedAt },
      { id: `${normalized}-file-2`, name: "proposal.pdf", type: "pdf", updatedAt: project.updatedAt },
    ],
  };
}

function mapGoalTree(row: GoalTreeRow): GoalTree {
  return {
    id: row.id,
    scope: row.scope,
    title: row.title,
    goal: row.goal,
    ownerEmployeeId: row.owner_employee_id,
    dueDate: row.due_date,
    metrics: row.metrics ?? [],
    branches: row.branches ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function syncTaskGoalLink(task: Task, input: Pick<Partial<Task>, "sourceGoalTreeId" | "sourceBranchId">) {
  const targetTreeId = dbId(input.sourceGoalTreeId);
  const targetBranchId = input.sourceBranchId || undefined;
  const rows = await selectRows<GoalTreeRow>("goal_trees", { order: "created_at.asc" }).catch(() => []);
  let previousLink: GoalTreeTask | undefined;

  await Promise.all(
    rows.map(async (row) => {
      let changed = false;
      const tree = mapGoalTree(row);
      const nextBranches = tree.branches.map((branch) => {
        const keptTasks = branch.tasks.filter((treeTask) => {
          if (treeTask.taskId && dbId(treeTask.taskId) === task.id) {
            previousLink = treeTask;
            changed = true;
            return false;
          }
          return true;
        });

        if (targetTreeId && targetBranchId && tree.id === targetTreeId && branch.id === targetBranchId) {
          changed = true;
          return {
            ...branch,
            projectId: task.projectId || branch.projectId,
            tasks: [
              ...keptTasks,
              {
                id: previousLink?.id || `tree-task-${newUuid()}`,
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

      if (changed) {
        await patchRows<GoalTreeRow>("goal_trees", { id: `eq.${row.id}` }, { branches: nextBranches, updated_at: new Date().toISOString() });
      }
    }),
  );
}

function defaultGoalTitle(scope: GoalTreeScope) {
  return scope === "company" ? "会社" : scope === "daily" ? "今日" : "個人";
}

function defaultGoalDueDate(scope: GoalTreeScope) {
  const date = new Date();
  date.setDate(date.getDate() + (scope === "company" ? 206 : scope === "daily" ? 0 : 7));
  return date.toISOString().slice(0, 10);
}

function normalizeGoalMetric(input: Partial<GoalTreeMetric>): GoalTreeMetric {
  return {
    id: input.id || `metric-${newUuid()}`,
    label: input.label || "数値",
    current: Number(input.current ?? 0),
    target: Number(input.target ?? 100),
    unit: input.unit ?? "",
  };
}

function normalizeGoalTreeTask(input: Partial<GoalTreeTask>, fallbackDueDate: string, fallbackAssigneeId: string | null): GoalTreeTask {
  return {
    id: input.id || `tree-task-${newUuid()}`,
    title: input.title || "小タスク",
    dueDate: input.dueDate || fallbackDueDate,
    assigneeId: dbId(input.assigneeId) ?? fallbackAssigneeId,
    taskId: dbId(input.taskId) ?? null,
  };
}

function normalizeGoalBranch(input: Partial<GoalTreeBranch>, fallbackDueDate: string, fallbackAssigneeId: string | null, fallbackProjectId: string | null): GoalTreeBranch {
  const dueDate = input.dueDate || fallbackDueDate;
  const assigneeId = dbId(input.assigneeId) ?? fallbackAssigneeId;
  return {
    id: input.id || `branch-${newUuid()}`,
    title: input.title || "枝",
    dueDate,
    assigneeId,
    projectId: dbId(input.projectId) ?? fallbackProjectId,
    tasks: input.tasks?.length
      ? input.tasks.map((task) => normalizeGoalTreeTask(task, dueDate, assigneeId))
      : [normalizeGoalTreeTask({}, dueDate, assigneeId)],
  };
}

async function normalizeGoalTreeInput(input: Partial<GoalTree>, fallback?: GoalTree): Promise<Omit<GoalTreeRow, "created_at" | "updated_at">> {
  const { projects, employees } = await readCore();
  const scope = (input.scope ?? fallback?.scope ?? "daily") as GoalTreeScope;
  const ownerEmployeeId = scope === "company" ? null : dbId(input.ownerEmployeeId) ?? fallback?.ownerEmployeeId ?? employees[0]?.id ?? null;
  const dueDate = input.dueDate || fallback?.dueDate || defaultGoalDueDate(scope);
  const fallbackProjectId = projects[0]?.id ?? null;
  const metrics = input.metrics ? input.metrics.map(normalizeGoalMetric) : fallback?.metrics ?? [];
  const branches = input.branches?.length
    ? input.branches.map((branch) => normalizeGoalBranch(branch, dueDate, ownerEmployeeId, fallbackProjectId))
    : fallback?.branches ?? [normalizeGoalBranch({}, dueDate, ownerEmployeeId, fallbackProjectId)];
  return {
    id: dbId(input.id) ?? fallback?.id ?? newUuid(),
    scope,
    title: input.title ?? fallback?.title ?? defaultGoalTitle(scope),
    goal: input.goal ?? fallback?.goal ?? "新しい目標",
    owner_employee_id: ownerEmployeeId,
    due_date: dueDate,
    metrics,
    branches,
  };
}

export async function getGoalTrees(role: Role, employeeId?: string) {
  const rows = (await selectRows<GoalTreeRow>("goal_trees", { order: "created_at.asc" })).map(mapGoalTree);
  const normalized = dbId(employeeId);
  return isAdmin(role) ? rows : rows.filter((tree) => tree.scope === "company" || tree.ownerEmployeeId === normalized);
}

export async function createGoalTree(input: Partial<GoalTree>, role: Role, employeeId?: string) {
  const requestedScope = (input.scope as GoalTreeScope) || "daily";
  const scope: GoalTreeScope = isAdmin(role) ? requestedScope : requestedScope === "daily" ? "daily" : "personal";
  const row = await normalizeGoalTreeInput({ ...input, scope, ownerEmployeeId: scope === "company" ? null : input.ownerEmployeeId ?? employeeId });
  const [created] = await insertRows<GoalTreeRow>("goal_trees", [row]);
  return mapGoalTree(created);
}

export async function updateGoalTree(id: string, input: Partial<GoalTree>, role: Role, employeeId?: string) {
  const normalized = dbId(id);
  if (!normalized) return null;
  const current = (await selectOne<GoalTreeRow>("goal_trees", { id: `eq.${normalized}` }));
  if (!current) return null;
  const currentTree = mapGoalTree(current);
  if (!canMutateGoalTree(currentTree, role, employeeId)) return null;
  const scope = isAdmin(role) ? ((input.scope as GoalTreeScope | undefined) ?? currentTree.scope) : currentTree.scope;
  const next = await normalizeGoalTreeInput({ ...input, id: normalized, scope }, currentTree);
  const [updated] = await patchRows<GoalTreeRow>("goal_trees", { id: `eq.${normalized}` }, { ...next, updated_at: new Date().toISOString() });
  return mapGoalTree(updated);
}

export async function deleteGoalTree(id: string, role: Role, employeeId?: string) {
  const normalized = dbId(id);
  if (!normalized) return false;
  const current = await selectOne<GoalTreeRow>("goal_trees", { id: `eq.${normalized}` });
  if (!current || !canMutateGoalTree(mapGoalTree(current), role, employeeId)) return false;
  await deleteRows("goal_trees", { id: `eq.${normalized}` });
  return true;
}

function mapAttendanceLog(row: AttendanceLogRow): AttendanceLog {
  return {
    id: row.id,
    employeeId: row.employee_id,
    eventType: row.event_type,
    recordedAt: row.recorded_at,
    source: row.source,
    note: row.note ?? undefined,
  };
}

function mapLeaveRequest(row: LeaveRequestRow) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    startDate: row.start_date,
    endDate: row.end_date,
    days: Number(row.days ?? 0),
    status: row.status,
  };
}

export async function getAttendance(role: Role, employeeId?: string) {
  const [employees, logs, leaveRequests] = await Promise.all([
    getEmployees(role, employeeId),
    selectRows<AttendanceLogRow>("attendance_logs", { order: "recorded_at.desc" }),
    selectRows<LeaveRequestRow>("leave_requests", { order: "created_at.desc" }),
  ]);
  const employeeIds = new Set(employees.map((employee) => employee.id));
  const normalized = dbId(employeeId);
  return {
    employees,
    logs: logs.filter((log) => employeeIds.has(log.employee_id)).map(mapAttendanceLog),
    leaveRequests: isAdmin(role) ? leaveRequests.map(mapLeaveRequest) : leaveRequests.filter((request) => request.employee_id === normalized).map(mapLeaveRequest),
  };
}

export async function clockAttendance(employeeId: string, eventType: AttendanceEvent, source: AttendanceLog["source"] = "manual") {
  const normalized = dbId(employeeId);
  const [log] = await insertRows<AttendanceLogRow>("attendance_logs", [
    {
      employee_id: normalized,
      event_type: eventType,
      source,
    },
  ]);
  const status =
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
  await patchRows<EmployeeRow>("employees", { id: `eq.${normalized}` }, { attendance_status: status, updated_at: new Date().toISOString() });
  return mapAttendanceLog(log);
}

function mapNotification(row: NotificationRow) {
  return {
    id: row.id,
    userId: row.user_id ?? "",
    type: row.type as "task_created" | "due_tomorrow" | "due_today" | "overdue" | "attendance_missing" | "admin",
    title: row.title,
    body: row.body,
    severity: row.severity,
    targetHref: row.target_href ?? undefined,
    readAt: row.read_at ?? null,
    createdAt: row.created_at,
  };
}

function taskDueNoticeType(task: Task): Pick<AppNotification, "type" | "severity"> | null {
  if (task.status === "done") return null;
  const diff = dayDiff(task.dueDate);
  if (diff < 0) return { type: "overdue", severity: "danger" };
  if (diff === 0) return { type: "due_today", severity: "warning" };
  if (diff === 1) return { type: "due_tomorrow", severity: "info" };
  return null;
}

function autoNoticeId(taskId: string, type: AppNotification["type"], userId: string) {
  return stableUuid(`auto-notice:${type}:${taskId}:${userId}`);
}

function autoNoticeIdsForTask(taskId: string, userId: string) {
  return (["overdue", "due_today", "due_tomorrow"] as const).map((type) => autoNoticeId(taskId, type, userId));
}

function taskDueNoticeRow(task: Task, userId: string, projectName?: string): NotificationRow | null {
  const notice = taskDueNoticeType(task);
  if (!notice) return null;
  const diff = dayDiff(task.dueDate);
  const context = [projectName, task.sourceBranchTitle].filter(Boolean).join(" / ");
  const contextText = context ? `${context} の ` : "";
  const dateText = toDate(task.dueDate);
  const title =
    notice.type === "overdue"
      ? `期限超過: ${task.title}`
      : notice.type === "due_today"
        ? `本日期限: ${task.title}`
        : `明日期限: ${task.title}`;
  const body =
    notice.type === "overdue"
      ? `${contextText}タスクが${Math.abs(diff)}日遅れています。今日中に完了、または期限変更してください。`
      : notice.type === "due_today"
        ? `${contextText}タスクは本日期限です。進行中か完了に更新してください。`
        : `${contextText}タスクは明日 ${dateText} が期限です。今日のうちに着手準備をしてください。`;

  return {
    id: autoNoticeId(task.id, notice.type, userId),
    user_id: userId,
    type: notice.type,
    title,
    body,
    severity: notice.severity,
    target_href: `/tasks?taskId=${task.id}`,
    created_at: task.updatedAt || new Date().toISOString(),
  };
}

async function ensureTaskDueNotifications(role: Role, userId?: string, employeeId?: string) {
  const { users, employees, projects, projectMembers, taskAssignees, taskComments, goalTrees, tasks } = await readCore();
  const mappedProjects = projects.map((project) => mapProject(project, [], projectMembers));
  const projectNames = new Map(mappedProjects.map((project) => [project.id, project.name]));
  const mappedTasks = filterTasksForRole(
    tasks.map((task) => mapTask(task, taskAssignees, taskComments, goalTrees)),
    role,
    employeeId,
  );

  const userByEmployee = new Map(employees.map((employee) => [employee.id, users.find((user) => user.id === employee.user_id)?.id]).filter((entry): entry is [string, string] => Boolean(entry[1])));
  const rows = mappedTasks.flatMap((task) =>
    Array.from(new Set([task.primaryAssigneeId, ...task.assigneeIds].filter(Boolean)))
      .map((assigneeId) => userByEmployee.get(assigneeId))
      .filter((assigneeUserId): assigneeUserId is string => Boolean(assigneeUserId))
      .filter((assigneeUserId) => isAdmin(role) || assigneeUserId === dbId(userId))
      .map((assigneeUserId) => taskDueNoticeRow(task, assigneeUserId, projectNames.get(task.projectId)))
      .filter((row): row is NotificationRow => Boolean(row)),
  );

  const currentIds = new Set(rows.map((row) => row.id));
  const staleIds = mappedTasks.flatMap((task) =>
    Array.from(new Set([task.primaryAssigneeId, ...task.assigneeIds].filter(Boolean)))
      .map((assigneeId) => userByEmployee.get(assigneeId))
      .filter((assigneeUserId): assigneeUserId is string => Boolean(assigneeUserId))
      .filter((assigneeUserId) => isAdmin(role) || assigneeUserId === dbId(userId))
      .flatMap((assigneeUserId) => autoNoticeIdsForTask(task.id, assigneeUserId))
      .filter((id) => !currentIds.has(id)),
  );

  await Promise.all(staleIds.map((id) => deleteRows<NotificationRow>("notifications", { id: `eq.${id}` })));
  if (rows.length) await upsertRows<NotificationRow>("notifications", rows, "id");
}

export async function getNotifications(role: Role, userId?: string, employeeId?: string) {
  await ensureTaskDueNotifications(role, userId, employeeId);
  const rows = await selectRows<NotificationRow>("notifications", { order: "created_at.desc" });
  const normalized = dbId(userId);
  return (isAdmin(role) ? rows : rows.filter((notice) => notice.user_id === normalized)).map(mapNotification);
}

export async function markNotificationRead(id: string) {
  const normalized = dbId(id);
  if (!normalized) return null;
  const [notice] = await patchRows<NotificationRow>("notifications", { id: `eq.${normalized}` }, { read_at: new Date().toISOString() });
  return notice ? mapNotification(notice) : null;
}

function mapAiSummary(row: AiSummaryRow): AiSummary {
  return {
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id ?? "",
    title: row.title,
    summary: row.summary,
    score: row.score,
  };
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

function addMinutes(iso: string, minutes: number) {
  return new Date(new Date(iso).getTime() + minutes * 60000).toISOString();
}

function taskToScheduleBlock(task: Task, index: number): ScheduleBlock {
  const fallbackStart = addMinutes(new Date().toISOString(), index * 70);
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

async function buildRevenueSummary(role: Role, employeeId?: string): Promise<RevenueSummary> {
  const scopedProjects = (await getProjects(role, employeeId)).filter((project) => project.status !== "completed");
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
  const normalized = dbId(employeeId);
  const monthBooked = scopedProjects
    .filter((project) => ["production", "customer_review", "revision", "final_review", "delivered", "maintenance"].includes(project.status))
    .reduce((sum, project) => sum + project.budget, 0);
  const weightedForecast = Math.round(scopedProjects.reduce((sum, project) => sum + project.budget * statusWeight[project.status], 0));
  const personalContribution = Math.round(
    scopedProjects
      .filter((project) => !normalized || project.primaryOwnerId === normalized || project.secondaryOwnerIds.includes(normalized))
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
      "連絡数、返信数、商談数を毎日同じ粒度で見る",
      "高単価POCは小さな検証単位に分けて提案する",
    ],
  };
}

export async function getDailyPlan(role: Role, employeeId?: string): Promise<DailyPlan> {
  const scopedTasks = (await getTasks(role, employeeId)).filter((task) => task.status !== "done");
  const sortedTasks = [...scopedTasks].sort((a, b) => b.aiPriorityScore - a.aiPriorityScore);
  const normalizedEmployeeId = dbId(employeeId);
  const personalTasks = normalizedEmployeeId ? sortedTasks.filter((task) => task.primaryAssigneeId === normalizedEmployeeId || task.assigneeIds.includes(normalizedEmployeeId)) : sortedTasks;
  const focusTask = personalTasks[0] ?? null;
  const nextTasks = personalTasks.slice(1, 5);
  const completedToday = (await getTasks(role, employeeId)).filter(
    (task) =>
      task.status === "done" &&
      dayDiff(task.updatedAt) === 0 &&
      (!normalizedEmployeeId || task.primaryAssigneeId === normalizedEmployeeId || task.assigneeIds.includes(normalizedEmployeeId)),
  );
  const schedule = sortedTasks.slice(0, 5).map(taskToScheduleBlock);
  const topRisk = focusTask?.aiPriorityScore ?? 0;
  const riskLevel: DailyPlan["riskLevel"] = topRisk >= 82 ? "danger" : topRisk >= 60 ? "watch" : "safe";
  return {
    ownerEmployeeId: normalizedEmployeeId ?? null,
    generatedAt: new Date().toISOString(),
    focusTask,
    nextTasks,
    completedToday,
    schedule,
    riskLevel,
    riskMessage:
      riskLevel === "danger"
        ? "午前中に手を付けないと、顧客返信と納期の両方に影響が出ます。"
        : riskLevel === "watch"
          ? "今日中なら戻せます。先に1つだけ完了させるのが効きます。"
          : "大きな遅延リスクは低めです。集中時間を守れば十分回せます。",
    ifDoneNext: nextTasks[0] ? `終わったら次は「${nextTasks[0].title}」です。` : "終わったら通知と明日の予定を確認してください。",
    ifNotDoneImpact: focusTask ? `「${focusTask.title}」が残ると、AIリスク ${focusTask.aiPriorityScore} のまま明日に持ち越されます。` : "未完了タスクはありません。",
    voicePromptExamples: ["今日やることを教えて", "このタスクを30分後に回して", "終わった。次は何？", "売上見込みを確認したい"],
    calendarExportUrl: `/api/calendar/ics?role=${role}${employeeId ? `&employeeId=${employeeId}` : ""}`,
    revenue: await buildRevenueSummary(role, employeeId),
  };
}

export async function getDashboard(role: Role, employeeId?: string, userId?: string): Promise<DashboardSummary> {
  const [dailyPlan, scopedTasks, scopedProjects, allEmployees, notifications, aiRows] = await Promise.all([
    getDailyPlan(role, employeeId),
    getTasks(role, employeeId),
    getProjects(role, employeeId),
    getEmployees("admin"),
    getNotifications(role, userId, employeeId),
    selectRows<AiSummaryRow>("ai_summaries", { order: "created_at.desc" }).catch(() => []),
  ]);
  const todayTasks = scopedTasks.filter((task) => dayDiff(task.dueDate) === 0 && task.status !== "done");
  const weekTasks = scopedTasks.filter((task) => dayDiff(task.dueDate) >= 0 && dayDiff(task.dueDate) <= 7 && task.status !== "done");
  const urgentTasks = scopedTasks.filter((task) => task.priority === "urgent" && task.status !== "done");
  const delayedTasks = scopedTasks.filter((task) => dayDiff(task.dueDate) < 0 && task.status !== "done");
  const allProjectStatuses: ProjectStatus[] = ["pre_order", "hearing", "proposal", "production", "customer_review", "revision", "final_review", "delivered", "maintenance", "completed"];
  const allAttendanceStatuses: AttendanceStatus[] = ["working", "break", "out", "meeting", "off", "absent"];
  const normalized = dbId(employeeId);
  const employee = allEmployees.find((item) => item.id === normalized);
  const aiRecommendations = [
    ...aiRows.filter((summary) => role === "admin" || summary.target_id === normalized).map(mapAiSummary),
    ...scopedTasks
      .filter((task) => task.status !== "done")
      .sort((a, b) => b.aiPriorityScore - a.aiPriorityScore)
      .slice(0, 3)
      .map<AiSummary>((task) => ({
        id: `ai-${task.id}`,
        targetType: "task",
        targetId: task.id,
        title: `優先度 ${task.aiPriorityScore}: ${task.title}`,
        summary: "期限、優先度、顧客待ち、遅延リスクから今日の上位候補に入っています。",
        score: task.aiPriorityScore,
      })),
  ].sort((a, b) => b.score - a.score);

  return {
    dailyPlan,
    todayTasks,
    weekTasks,
    urgentTasks,
    delayedTasks,
    employeeStatus: countByStatus(allEmployees.map((item) => item.attendanceStatus), allAttendanceStatuses),
    projectStatus: countByStatus(scopedProjects.map((item) => item.status), allProjectStatuses),
    activeProjects: scopedProjects.filter((project) => project.status !== "completed").slice(0, 6),
    notifications: notifications.slice(0, 5),
    leaveBalanceDays: isAdmin(role) ? null : employee?.leaveBalanceDays ?? null,
    aiRecommendations,
  };
}

export async function getRecommendations(role: Role, employeeId?: string) {
  return (await getDashboard(role, employeeId)).aiRecommendations;
}

export async function getEmployeeProfile(role: Role, targetId: string, requesterEmployeeId?: string): Promise<EmployeeProfile | null> {
  const normalizedTarget = dbId(targetId);
  if (!isAdmin(role) && normalizedTarget !== dbId(requesterEmployeeId)) return null;
  const [employees, projects, tasks, attendance, goals, aiRows] = await Promise.all([
    getEmployees("admin"),
    getProjects("admin"),
    getTasks("admin", undefined),
    selectRows<AttendanceLogRow>("attendance_logs", { employee_id: `eq.${normalizedTarget}`, order: "recorded_at.desc" }),
    selectRows<{ id: string; employee_id: string; period: "week" | "month" | "quarter" | "year"; title: string; progress: number; status: "on_track" | "at_risk" | "done" }>("goals").catch(() => []),
    selectRows<AiSummaryRow>("ai_summaries", { target_id: `eq.${normalizedTarget}` }).catch(() => []),
  ]);
  const employee = employees.find((item) => item.id === normalizedTarget);
  if (!employee) return null;
  const assignedIds = new Set(employee.assignedProjectIds);
  return {
    ...employee,
    skills: [],
    assignedProjects: projects.filter((project) => assignedIds.has(project.id)),
    pastProjects: [],
    tasks: tasks.filter((task) => taskVisibleToEmployee(task, normalizedTarget)),
    attendanceLogs: attendance.map(mapAttendanceLog),
    goals: goals.map<Goal>((goal) => ({
      id: goal.id,
      employeeId: goal.employee_id,
      period: goal.period,
      title: goal.title,
      progress: goal.progress,
      status: goal.status,
    })),
    aiAnalysis: aiRows.map(mapAiSummary),
  };
}

export async function getUsers(role: Role) {
  if (!isAdmin(role)) return [];
  const { users, employees } = await readCore();
  return users.filter((user) => !deprecatedDemoEmails.has(user.email)).map((user) => mapUser(user, employees));
}

export async function updateUserRole(userId: string, input: Pick<User, "role" | "employmentType">) {
  const normalized = dbId(userId);
  if (!normalized) return null;
  const [row] = await patchRows<UserRow>("users", { id: `eq.${normalized}` }, { role: input.role, employment_type: input.employmentType, updated_at: new Date().toISOString() });
  const { employees } = await readCore();
  return row ? mapUser(row, employees) : null;
}

function mapActivityLog(row: ActivityLogRow): ActivityLog {
  return {
    id: row.id,
    actorUserId: row.actor_user_id ?? "",
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id ?? "",
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

export async function getActivityLogs(): Promise<ActivityLog[]> {
  return (await selectRows<ActivityLogRow>("activity_logs", { order: "created_at.desc" })).map(mapActivityLog);
}

export async function addActivityLog(log: Omit<ActivityLog, "id" | "createdAt">) {
  const [row] = await insertRows<ActivityLogRow>("activity_logs", [
    {
      actor_user_id: dbId(log.actorUserId) ?? null,
      action: log.action,
      entity_type: log.entityType,
      entity_id: dbId(log.entityId) ?? null,
      metadata: log.metadata,
    },
  ]);
  return mapActivityLog(row);
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function reportDateValue(value?: string) {
  return (value ? new Date(value) : new Date()).toISOString().slice(0, 10);
}

function weekStartValue(value?: string) {
  const date = value ? new Date(value) : new Date();
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + mondayOffset);
  return date.toISOString().slice(0, 10);
}

function reportFromActivity(row: ActivityLogRow, employees: EmployeeRow[] = []): WorkReport | null {
  if (row.entity_type !== "work_report") return null;
  const metadata = row.metadata ?? {};
  const employeeId = typeof metadata.employeeId === "string" ? metadata.employeeId : (row.entity_id ?? "");
  if (!employeeId) return null;
  const employee = employees.find((item) => item.id === employeeId);
  const period: WorkReportPeriod = metadata.period === "weekly" ? "weekly" : "daily";
  const reportDate = reportDateValue(typeof metadata.reportDate === "string" ? metadata.reportDate : row.created_at);
  return {
    id: row.id,
    employeeId,
    employeeName: typeof metadata.employeeName === "string" ? metadata.employeeName : (employee?.name ?? "未設定"),
    authorUserId: row.actor_user_id ?? "",
    period,
    reportDate,
    weekStart: typeof metadata.weekStart === "string" ? metadata.weekStart : weekStartValue(reportDate),
    title: typeof metadata.title === "string" ? metadata.title : period === "weekly" ? "週報" : "日報",
    body: typeof metadata.body === "string" ? metadata.body : "",
    completed: stringArray(metadata.completed),
    blockers: stringArray(metadata.blockers),
    nextActions: stringArray(metadata.nextActions),
    createdAt: row.created_at,
    updatedAt: typeof metadata.updatedAt === "string" ? metadata.updatedAt : row.created_at,
  };
}

function reportMetadata(input: Partial<WorkReport>, employee: EmployeeRow, period: WorkReportPeriod, createdAt?: string) {
  const reportDate = reportDateValue(input.reportDate);
  return {
    employeeId: employee.id,
    employeeName: employee.name,
    period,
    reportDate,
    weekStart: input.weekStart || weekStartValue(reportDate),
    title: input.title || (period === "weekly" ? "週報" : "日報"),
    body: input.body || "",
    completed: input.completed ?? [],
    blockers: input.blockers ?? [],
    nextActions: input.nextActions ?? [],
    updatedAt: new Date().toISOString(),
    createdAt,
  };
}

export async function getWorkReports(
  role: Role,
  employeeId?: string,
  filters: { period?: WorkReportPeriod; targetEmployeeId?: string } = {},
) {
  const { employees } = await readCore();
  const rows = await selectRows<ActivityLogRow>("activity_logs", { entity_type: "eq.work_report", order: "created_at.desc" }).catch(() => []);
  const targetEmployeeId = dbId(isAdmin(role) ? filters.targetEmployeeId : employeeId);
  return rows
    .map((row) => reportFromActivity(row, employees))
    .filter((report): report is WorkReport => Boolean(report))
    .filter((report) => (isAdmin(role) ? true : report.employeeId === dbId(employeeId)))
    .filter((report) => (targetEmployeeId ? report.employeeId === targetEmployeeId : true))
    .filter((report) => (filters.period ? report.period === filters.period : true))
    .sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime() || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function saveWorkReport(input: Partial<WorkReport> & { authorUserId?: string }, role: Role, employeeId?: string) {
  const { users, employees } = await readCore();
  const targetEmployeeId = dbId(isAdmin(role) ? input.employeeId || employeeId : employeeId);
  if (!targetEmployeeId || (!isAdmin(role) && targetEmployeeId !== dbId(employeeId))) return null;
  const employee = employees.find((item) => item.id === targetEmployeeId);
  if (!employee) return null;
  const authorUserId = dbId(input.authorUserId) ?? users.find((user) => user.id === employee.user_id)?.id ?? null;
  const period: WorkReportPeriod = input.period === "weekly" ? "weekly" : "daily";

  if (input.id) {
    const normalized = dbId(input.id);
    if (!normalized) return null;
    const current = await selectOne<ActivityLogRow>("activity_logs", { id: `eq.${normalized}`, entity_type: "eq.work_report" });
    const currentReport = current ? reportFromActivity(current, employees) : null;
    if (!current || !currentReport || (!isAdmin(role) && currentReport.employeeId !== dbId(employeeId))) return null;
    const [updated] = await patchRows<ActivityLogRow>(
      "activity_logs",
      { id: `eq.${normalized}` },
      {
        actor_user_id: authorUserId,
        action: "work_report.upserted",
        entity_id: targetEmployeeId,
        metadata: reportMetadata(input, employee, period, current.created_at),
      },
    );
    return reportFromActivity(updated, employees);
  }

  const [row] = await insertRows<ActivityLogRow>("activity_logs", [
    {
      actor_user_id: authorUserId,
      action: "work_report.upserted",
      entity_type: "work_report",
      entity_id: targetEmployeeId,
      metadata: reportMetadata(input, employee, period),
    },
  ]);
  return reportFromActivity(row, employees);
}

export async function deleteWorkReport(id: string, role: Role, employeeId?: string) {
  const normalized = dbId(id);
  if (!normalized) return false;
  const { employees } = await readCore();
  const current = await selectOne<ActivityLogRow>("activity_logs", { id: `eq.${normalized}`, entity_type: "eq.work_report" });
  const currentReport = current ? reportFromActivity(current, employees) : null;
  if (!current || !currentReport || (!isAdmin(role) && currentReport.employeeId !== dbId(employeeId))) return false;
  await deleteRows<ActivityLogRow>("activity_logs", { id: `eq.${normalized}` });
  return true;
}

export async function getLookupData() {
  const [employees, projects, customers] = await Promise.all([getEmployees("admin"), getProjects("admin"), getCustomers()]);
  return { employees, projects, customers };
}

export async function getUserByEmployee(employeeId: string): Promise<User | undefined> {
  const { users, employees } = await readCore();
  const employee = employees.find((item) => item.id === dbId(employeeId));
  const user = employee ? users.find((item) => item.id === employee.user_id) : undefined;
  return user ? mapUser(user, employees) : undefined;
}

export async function getCustomerById(customerId: string): Promise<Customer | undefined> {
  return (await getCustomers()).find((customer) => customer.id === dbId(customerId));
}

function icsDate(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export async function getCalendarIcs(role: Role, employeeId?: string) {
  const plan = await getDailyPlan(role, employeeId);
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
