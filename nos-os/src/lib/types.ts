export type Role = "admin" | "employee" | "sales";
export type AuthProvider = "google" | "email";
export type EmploymentType = "full_time" | "part_time" | "contractor";

export type ProjectStatus =
  | "pre_order"
  | "hearing"
  | "proposal"
  | "production"
  | "customer_review"
  | "revision"
  | "final_review"
  | "delivered"
  | "maintenance"
  | "completed";

export type TaskPriority = "urgent" | "high" | "normal" | "low" | "hold";
export type TaskStatus = "todo" | "in_progress" | "review" | "done";

export type AttendanceEvent =
  | "clock_in"
  | "break_start"
  | "break_end"
  | "out"
  | "return"
  | "meeting"
  | "clock_out"
  | "absent";

export type AttendanceStatus =
  | "working"
  | "break"
  | "out"
  | "meeting"
  | "off"
  | "absent";

export type GoalPeriod = "week" | "month" | "quarter" | "year";
export type GoalTreeScope = "company" | "daily" | "personal";
export type Severity = "info" | "success" | "warning" | "danger";

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  employmentType: EmploymentType;
  employeeId: string;
  authProvider: AuthProvider;
  createdAt: string;
  mustChangePassword?: boolean;
};

export type LoginAccount = {
  userId: string;
  employeeId: string;
  name: string;
  role: Role;
  department: string;
  position: string;
  avatarUrl: string;
  mustChangePassword: boolean;
};

export type Employee = {
  id: string;
  userId: string;
  name: string;
  position: string;
  department: string;
  avatarUrl: string;
  bio: string;
  leaveBalanceDays: number;
  attendanceStatus: AttendanceStatus;
  assignedProjectIds: string[];
  pastProjectIds: string[];
  taskStats: {
    total: number;
    completed: number;
    delayed: number;
    urgent: number;
  };
};

export type Skill = {
  id: string;
  name: string;
  category: string;
};

export type EmployeeSkill = {
  employeeId: string;
  skillId: string;
  level: number;
};

export type Goal = {
  id: string;
  employeeId: string;
  period: GoalPeriod;
  title: string;
  progress: number;
  status: "on_track" | "at_risk" | "done";
};

export type GoalTreeMetric = {
  id: string;
  label: string;
  current: number;
  target: number;
  unit: string;
};

export type GoalTreeTask = {
  id: string;
  title: string;
  dueDate: string;
  assigneeId: string | null;
  taskId: string | null;
};

export type GoalTreeBranch = {
  id: string;
  title: string;
  dueDate: string;
  assigneeId: string | null;
  projectId: string | null;
  tasks: GoalTreeTask[];
};

export type GoalTree = {
  id: string;
  scope: GoalTreeScope;
  title: string;
  goal: string;
  ownerEmployeeId: string | null;
  dueDate: string;
  metrics: GoalTreeMetric[];
  branches: GoalTreeBranch[];
  createdAt: string;
  updatedAt: string;
};

export type Customer = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  notes: string;
  health: "good" | "watch" | "risk";
};

export type Project = {
  id: string;
  name: string;
  customerId: string;
  customerName: string;
  primaryOwnerId: string;
  secondaryOwnerIds: string[];
  startDate: string;
  dueDate: string;
  budget: number;
  status: ProjectStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectMember = {
  projectId: string;
  employeeId: string;
  role: "primary" | "secondary" | "viewer";
};

export type Task = {
  id: string;
  title: string;
  description: string;
  projectId: string;
  sourceGoalTreeId?: string | null;
  sourceGoalTreeTitle?: string | null;
  sourceBranchId?: string | null;
  sourceBranchTitle?: string | null;
  primaryAssigneeId: string;
  assigneeIds: string[];
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  attachments: string[];
  commentsCount: number;
  customerWaiting: boolean;
  delayRisk: number;
  aiPriorityScore: number;
  estimatedMinutes: number;
  scheduledStart?: string;
  scheduledEnd?: string;
  createdAt: string;
  updatedAt: string;
};

export type TaskAssistantAction =
  | {
      id: string;
      type: "create";
      title: string;
      description: string;
      projectId: string;
      projectName?: string;
      primaryAssigneeId: string;
      assigneeName?: string;
      sourceGoalTreeId?: string | null;
      sourceGoalTreeTitle?: string | null;
      sourceBranchId?: string | null;
      sourceBranchTitle?: string | null;
      dueDate: string;
      priority: TaskPriority;
      estimatedMinutes: number;
      reason: string;
    }
  | {
      id: string;
      type: "update";
      taskId: string;
      title: string;
      patch: Partial<Pick<Task, "title" | "description" | "projectId" | "primaryAssigneeId" | "sourceGoalTreeId" | "sourceBranchId" | "dueDate" | "priority" | "status" | "estimatedMinutes">>;
      projectName?: string;
      assigneeName?: string;
      sourceGoalTreeTitle?: string | null;
      sourceBranchTitle?: string | null;
      reason: string;
    }
  | {
      id: string;
      type: "delete";
      taskId: string;
      title: string;
      projectName?: string;
      assigneeName?: string;
      sourceGoalTreeTitle?: string | null;
      sourceBranchTitle?: string | null;
      reason: string;
    };

export type TaskAssistantPlan = {
  summary: string;
  source: "local" | "openai";
  warnings: string[];
  actions: TaskAssistantAction[];
};

export type TaskComment = {
  id: string;
  taskId: string;
  authorUserId: string;
  body: string;
  createdAt: string;
};

export type Email = {
  id: string;
  projectId: string;
  customerId: string;
  from: string;
  subject: string;
  receivedAt: string;
  aiUrgency: number;
};

export type AttendanceLog = {
  id: string;
  employeeId: string;
  eventType: AttendanceEvent;
  recordedAt: string;
  source: "manual" | "qr" | "google_sheets";
  note?: string;
};

export type LeaveRequest = {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  days: number;
  status: "pending" | "approved" | "rejected";
};

export type Notification = {
  id: string;
  userId: string;
  type:
    | "task_created"
    | "due_tomorrow"
    | "due_today"
    | "overdue"
    | "attendance_missing"
    | "admin";
  title: string;
  body: string;
  severity: Severity;
  targetHref?: string;
  readAt: string | null;
  createdAt: string;
};

export type AiSummary = {
  id: string;
  targetType: "employee" | "project" | "task" | "company";
  targetId: string;
  title: string;
  summary: string;
  score: number;
};

export type ActivityLog = {
  id: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type ScheduleBlock = {
  id: string;
  title: string;
  kind: "task" | "meeting" | "break" | "focus" | "admin";
  start: string;
  end: string;
  taskId?: string;
  projectId?: string;
  risk: number;
  status: "upcoming" | "active" | "done" | "missed";
};

export type RevenueSummary = {
  monthTarget: number;
  monthBooked: number;
  weightedForecast: number;
  personalContribution: number;
  activePipeline: number;
  closingHints: string[];
};

export type SecretaryReply = {
  reply: string;
  source: "local" | "claude" | "openai";
  configured: boolean;
};

export type DailyPlan = {
  ownerEmployeeId: string | null;
  generatedAt: string;
  focusTask: Task | null;
  nextTasks: Task[];
  completedToday: Task[];
  schedule: ScheduleBlock[];
  riskLevel: "safe" | "watch" | "danger";
  riskMessage: string;
  ifDoneNext: string;
  ifNotDoneImpact: string;
  voicePromptExamples: string[];
  calendarExportUrl: string;
  revenue: RevenueSummary;
};

export type TaskFilter = {
  assigneeId?: string;
  projectId?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  due?: "today" | "week" | "overdue";
  sort?: "dueDate" | "priority" | "assignee" | "updatedAt";
};

export type DashboardSummary = {
  dailyPlan: DailyPlan;
  todayTasks: Task[];
  weekTasks: Task[];
  urgentTasks: Task[];
  delayedTasks: Task[];
  employeeStatus: Record<AttendanceStatus, number>;
  projectStatus: Record<ProjectStatus, number>;
  activeProjects: Project[];
  notifications: Notification[];
  leaveBalanceDays: number | null;
  aiRecommendations: AiSummary[];
};

export type ProjectDetail = Project & {
  customer: Customer | null;
  members: Employee[];
  tasks: Task[];
  emails: Email[];
  history: ActivityLog[];
  files: { id: string; name: string; type: string; updatedAt: string }[];
};

export type EmployeeProfile = Employee & {
  skills: Array<Skill & { level: number }>;
  assignedProjects: Project[];
  pastProjects: Project[];
  tasks: Task[];
  attendanceLogs: AttendanceLog[];
  goals: Goal[];
  aiAnalysis: AiSummary[];
};

export type ApiEnvelope<T> = {
  data: T;
  meta?: Record<string, unknown>;
};
