import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";

loadDotEnvLocal();

const supabaseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const serviceRoleKey = cleanEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);

if (!supabaseUrl || !serviceRoleKey) {
  await applyViaProductionApi();
  process.exit(0);
}

const DUE_JUNE_11 = "2026-06-11";
const GOAL_DUE = "2026-07-20";

const knownIds = {
  urata: "0646e8a9-dbc2-525b-b99f-dddaa74dfdee",
  osaki: "e47d3925-107f-5836-b288-bc701828be71",
  hashisako: "592a547d-7c00-502e-a5a3-dd57fec5679d",
  nosCustomer: "9d0dcc9a-4625-5387-bdef-3cc5082b397c",
  companyTree: "c3020014-e7fe-5072-bef5-a9a60f999910",
  dailyTree: "ff7169ce-3226-532a-a97a-7ebf886896f4",
  hashisakoTree: "aa55407f-1efa-58f3-982b-b9f8061384b8",
};

const ids = {
  project: stableUuid("project-nos-technology-website"),
  tasks: {
    images: stableUuid("task-hashisako-nos-site-images"),
    wireframe: stableUuid("task-hashisako-nos-site-wireframe"),
    design: stableUuid("task-hashisako-nos-site-design"),
  },
  notifications: {
    hashisako: stableUuid("notice-hashisako-nos-site-june11"),
    admin: stableUuid("notice-admin-nos-site-june11"),
  },
};

const [employees, users, existingTasks] = await Promise.all([
  selectRows("employees", { order: "created_at.asc" }),
  selectRows("users", { order: "created_at.asc" }),
  selectRows("tasks", { order: "created_at.asc" }),
]);

const hashisako = findEmployee(employees, knownIds.hashisako, "橋迫");
const urata = findEmployee(employees, knownIds.urata, "浦田");
const osaki = findEmployee(employees, knownIds.osaki, "大崎");
const hashisakoUser = users.find((user) => user.id === hashisako.user_id);
const urataUser = users.find((user) => user.id === urata.user_id);

if (!hashisakoUser) throw new Error("Hashisako user account was not found.");

const testTaskIds = existingTasks
  .filter((task) => typeof task.title === "string" && task.title.includes("【テスト】"))
  .map((task) => task.id);

const notifications = await selectRows("notifications").catch(() => []);
const noticeIdsToDelete = notifications
  .filter((notice) => testTaskIds.some((taskId) => String(notice.target_href ?? "").includes(taskId)) || String(notice.title ?? "").includes("【テスト】"))
  .map((notice) => notice.id);

await deleteByIds("notifications", "id", noticeIdsToDelete);
await deleteByIds("task_comments", "task_id", testTaskIds);
await deleteByIds("task_assignees", "task_id", testTaskIds);
await deleteByIds("tasks", "id", testTaskIds);

await upsertRows(
  "customers",
  [
    {
      id: knownIds.nosCustomer,
      name: "NOStechnology 自社サイト",
      company: "NOStechnology",
      email: "info@nostechnology.jp",
      phone: "",
      notes: "自社サイト制作と7/20までの売上25万円または5件達成を追う社内案件。",
      health: "good",
      updated_at: new Date().toISOString(),
    },
  ],
  "id",
);

await upsertRows(
  "projects",
  [
    {
      id: ids.project,
      name: "NOStechnology Webサイト作成",
      customer_id: knownIds.nosCustomer,
      primary_owner_id: hashisako.id,
      secondary_owner_id: urata.id,
      start_date: "2026-06-11",
      due_date: GOAL_DUE,
      budget: 250000,
      status: "production",
      notes: "7月20日までに目標売上25万円または5件。1件目としてNOStechnologyのWebサイト作成を進める。",
      updated_at: new Date().toISOString(),
    },
  ],
  "id",
);

await deleteRows("project_members", { project_id: `eq.${ids.project}` });
await insertRows("project_members", [
  { project_id: ids.project, employee_id: hashisako.id, role: "primary" },
  { project_id: ids.project, employee_id: urata.id, role: "secondary" },
  { project_id: ids.project, employee_id: osaki.id, role: "secondary" },
]);

const taskRows = [
  {
    id: ids.tasks.images,
    title: "NOStechnology自社サイトの画像素材を作る",
    body: "ChatGPTでNOStechnology Webサイト用の画像素材を作る。トップ、サービス紹介、実績・雰囲気に使える候補を整理する。",
    project_id: ids.project,
    primary_assignee_id: hashisako.id,
    due_date: DUE_JUNE_11,
    priority: "urgent",
    status: "todo",
    attachments: [],
    customer_waiting: false,
    delay_risk: 35,
    ai_priority_score: priorityScore(DUE_JUNE_11, "urgent", false, 35),
    estimated_minutes: 90,
    scheduled_start: "2026-06-11T09:00:00+09:00",
    scheduled_end: "2026-06-11T10:30:00+09:00",
    updated_at: new Date().toISOString(),
  },
  {
    id: ids.tasks.wireframe,
    title: "NOStechnology自社サイトのワイヤーフレーム作成",
    body: "ClaudeでNOStechnology Webサイトのワイヤーフレームを作成する。コーディングはせず、構成と導線を固める。",
    project_id: ids.project,
    primary_assignee_id: hashisako.id,
    due_date: DUE_JUNE_11,
    priority: "high",
    status: "todo",
    attachments: [],
    customer_waiting: false,
    delay_risk: 28,
    ai_priority_score: priorityScore(DUE_JUNE_11, "high", false, 28),
    estimated_minutes: 120,
    scheduled_start: "2026-06-11T10:30:00+09:00",
    scheduled_end: "2026-06-11T12:30:00+09:00",
    updated_at: new Date().toISOString(),
  },
  {
    id: ids.tasks.design,
    title: "NOStechnology自社サイトのデザイン作成",
    body: "ClaudeでNOStechnology Webサイトのデザインを作成する。コーディングはしない。画像素材とワイヤーフレームを前提に見た目を固める。",
    project_id: ids.project,
    primary_assignee_id: hashisako.id,
    due_date: DUE_JUNE_11,
    priority: "high",
    status: "todo",
    attachments: [],
    customer_waiting: false,
    delay_risk: 30,
    ai_priority_score: priorityScore(DUE_JUNE_11, "high", false, 30),
    estimated_minutes: 150,
    scheduled_start: "2026-06-11T13:30:00+09:00",
    scheduled_end: "2026-06-11T16:00:00+09:00",
    updated_at: new Date().toISOString(),
  },
];

await upsertRows("tasks", taskRows, "id");
await deleteByIds("task_assignees", "task_id", Object.values(ids.tasks));
await insertRows(
  "task_assignees",
  Object.values(ids.tasks).map((taskId) => ({ task_id: taskId, employee_id: hashisako.id })),
);

const branchTasks = [
  { id: "tree-task-nos-site-images", title: "画像素材を作る", dueDate: DUE_JUNE_11, assigneeId: hashisako.id, taskId: ids.tasks.images },
  { id: "tree-task-nos-site-wireframe", title: "ワイヤーフレーム作成", dueDate: DUE_JUNE_11, assigneeId: hashisako.id, taskId: ids.tasks.wireframe },
  { id: "tree-task-nos-site-design", title: "デザイン作成", dueDate: DUE_JUNE_11, assigneeId: hashisako.id, taskId: ids.tasks.design },
];

const goalMetrics = [
  { id: "metric-20260720-revenue", label: "売上", current: 0, target: 250000, unit: "円" },
  { id: "metric-20260720-contracts", label: "受注", current: 0, target: 5, unit: "件" },
];

await upsertRows(
  "goal_trees",
  [
    {
      id: knownIds.companyTree,
      scope: "company",
      title: "会社目標",
      goal: "2026年7月20日までに売上25万円または5件を達成する。",
      owner_employee_id: null,
      due_date: GOAL_DUE,
      metrics: goalMetrics,
      branches: [
        {
          id: "branch-nos-site",
          title: "NOStechnology Webサイト作成",
          dueDate: GOAL_DUE,
          assigneeId: hashisako.id,
          projectId: ids.project,
          tasks: branchTasks,
        },
      ],
      updated_at: new Date().toISOString(),
    },
    {
      id: knownIds.dailyTree,
      scope: "daily",
      title: "6月11日の実行",
      goal: "自社サイト（NOStechnology）の画像、ワイヤー、デザインを進める。",
      owner_employee_id: hashisako.id,
      due_date: DUE_JUNE_11,
      metrics: [{ id: "metric-june11-site-steps", label: "制作準備", current: 0, target: 3, unit: "件" }],
      branches: [
        {
          id: "branch-june11-nos-site",
          title: "NOStechnologyサイト制作準備",
          dueDate: DUE_JUNE_11,
          assigneeId: hashisako.id,
          projectId: ids.project,
          tasks: branchTasks,
        },
      ],
      updated_at: new Date().toISOString(),
    },
    {
      id: knownIds.hashisakoTree,
      scope: "personal",
      title: "橋迫 翔太 7/20売上目標",
      goal: "7月20日までに売上25万円または5件を達成する。1件目としてNOStechnology Webサイト作成を進める。",
      owner_employee_id: hashisako.id,
      due_date: GOAL_DUE,
      metrics: goalMetrics,
      branches: [
        {
          id: "branch-hashisako-nos-site",
          title: "NOStechnology Webサイト作成",
          dueDate: GOAL_DUE,
          assigneeId: hashisako.id,
          projectId: ids.project,
          tasks: branchTasks,
        },
      ],
      updated_at: new Date().toISOString(),
    },
  ],
  "id",
);

await upsertRows(
  "notifications",
  [
    {
      id: ids.notifications.hashisako,
      user_id: hashisakoUser.id,
      type: "due_tomorrow",
      title: "6月11日: NOStechnologyサイト制作準備",
      body: "画像素材、ワイヤーフレーム、デザイン作成を順番に進めてください。",
      severity: "warning",
      target_href: `/tasks?taskId=${ids.tasks.images}`,
      read_at: null,
    },
    {
      id: ids.notifications.admin,
      user_id: urataUser?.id ?? null,
      type: "admin",
      title: "橋迫さんのタスクをNOStechnologyサイト制作へ入れ替えました",
      body: "サンプルタスクを削除し、6月11日の制作準備タスクと7月20日の売上目標を登録しました。",
      severity: "success",
      target_href: "/reports",
      read_at: null,
    },
  ],
  "id",
);

console.log(
  JSON.stringify(
    {
      ok: true,
      deletedTestTasks: testTaskIds.length,
      project: "NOStechnology Webサイト作成",
      owner: hashisako.name,
      dueDate: DUE_JUNE_11,
      goalDueDate: GOAL_DUE,
      taskIds: ids.tasks,
      projectId: ids.project,
    },
    null,
    2,
  ),
);

function loadDotEnvLocal() {
  const path = ".env.local";
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    if (!process.env[key]) process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

function normalizeSupabaseUrl(value = "") {
  return value.trim().replace(/\/rest\/v1\/?$/i, "").replace(/\/$/, "");
}

function cleanEnvValue(value = "") {
  const cleaned = value.trim().replace(/^["']|["']$/g, "");
  return cleaned === "undefined" || cleaned === "null" ? "" : cleaned;
}

function stableUuid(input) {
  const hex = createHash("sha1").update(`nos-os:${input}`).digest("hex").slice(0, 32).split("");
  hex[12] = "5";
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20).join("")}`;
}

function queryString(query = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) params.set(key, String(value));
  }
  const raw = params.toString();
  return raw ? `?${raw}` : "";
}

async function rest(path, init = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}${queryString(init.query)}`, {
    method: init.method ?? "GET",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(init.prefer ? { Prefer: init.prefer } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  if (!response.ok) {
    throw new Error(`Supabase ${init.method ?? "GET"} ${path} failed: ${response.status} ${await response.text()}`);
  }
  if (response.status === 204) return undefined;
  return response.json();
}

function selectRows(table, query = {}) {
  return rest(table, { query: { select: "*", ...query } });
}

function insertRows(table, rows) {
  if (!rows.length) return [];
  return rest(table, { method: "POST", body: rows, prefer: "return=representation" });
}

function upsertRows(table, rows, onConflict) {
  if (!rows.length) return [];
  return rest(table, {
    method: "POST",
    query: { on_conflict: onConflict },
    body: rows,
    prefer: "resolution=merge-duplicates,return=representation",
  });
}

function deleteRows(table, query) {
  return rest(table, {
    method: "DELETE",
    query: { select: "*", ...query },
    prefer: "return=representation",
  });
}

function deleteByIds(table, column, idsToDelete) {
  const ids = [...new Set(idsToDelete)].filter(Boolean);
  if (!ids.length) return [];
  return deleteRows(table, { [column]: `in.(${ids.join(",")})` });
}

function findEmployee(employees, fallbackId, nameNeedle) {
  const employee = employees.find((item) => item.id === fallbackId) ?? employees.find((item) => String(item.name ?? "").includes(nameNeedle));
  if (!employee) throw new Error(`Employee not found: ${nameNeedle}`);
  return employee;
}

function priorityScore(dueDate, priority, customerWaiting, delayRisk) {
  const diff = dayDiff(dueDate);
  const deadlineScore = diff < 0 ? 100 : diff === 0 ? 95 : diff <= 1 ? 85 : diff <= 3 ? 68 : diff <= 7 ? 45 : 20;
  const priorityScoreMap = { urgent: 100, high: 80, normal: 55, low: 30, hold: 10 };
  return Math.round(deadlineScore * 0.4 + priorityScoreMap[priority] * 0.3 + (customerWaiting ? 100 : 0) * 0.2 + delayRisk * 0.1);
}

function dayDiff(targetIso) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetIso);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

async function applyViaProductionApi() {
  const baseUrl = process.env.NOS_OS_PRODUCTION_URL || "https://nos-os-silk.vercel.app";

  async function api(path, init = {}) {
    const url = new URL(path, baseUrl);
    url.searchParams.set("role", "admin");
    url.searchParams.set("employeeId", knownIds.urata);
    const response = await fetch(url, {
      method: init.method ?? "GET",
      headers: { "Content-Type": "application/json" },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`${response.status} ${url.pathname}: ${text}`);
    if (!text) return null;
    const payload = JSON.parse(text);
    return payload.data;
  }

  const [employees, customers, projects, tasks, goalTrees] = await Promise.all([
    api("/api/employees"),
    api("/api/customers"),
    api("/api/projects"),
    api("/api/tasks", { method: "GET" }),
    api("/api/goal-trees"),
  ]);

  const hashisako = findEmployee(employees, knownIds.hashisako, "橋迫");
  const urata = findEmployee(employees, knownIds.urata, "浦田");
  const osaki = findEmployee(employees, knownIds.osaki, "大崎");
  const customer = customers.find((item) => item.id === knownIds.nosCustomer) ?? customers.find((item) => String(item.company ?? "").includes("NOStechnology") || String(item.company ?? "").includes("NosTechnology"));
  if (!customer) throw new Error("NOStechnology customer was not found.");

  const testTasks = tasks.filter((task) => typeof task.title === "string" && task.title.includes("【テスト】"));
  for (const task of testTasks) {
    await api(`/api/tasks/${task.id}`, { method: "DELETE" });
  }

  await api(`/api/customers/${customer.id}`, {
    method: "PATCH",
    body: {
      name: "NOStechnology 自社サイト",
      company: "NOStechnology",
      email: "info@nostechnology.jp",
      phone: "",
      notes: "自社サイト制作と7/20までの売上25万円または5件達成を追う社内案件。",
      health: "good",
    },
  });

  const projectBody = {
    name: "NOStechnology Webサイト作成",
    customerId: customer.id,
    primaryOwnerId: hashisako.id,
    secondaryOwnerIds: [urata.id, osaki.id],
    startDate: "2026-06-11",
    dueDate: GOAL_DUE,
    budget: 250000,
    status: "production",
    notes: "7月20日までに目標売上25万円または5件。1件目としてNOStechnologyのWebサイト作成を進める。",
  };
  const existingProject = projects.find((project) => project.id === ids.project || project.name === projectBody.name);
  const project = existingProject
    ? await api(`/api/projects/${existingProject.id}`, { method: "PATCH", body: projectBody })
    : await api("/api/projects", { method: "POST", body: projectBody });

  const existingAfterDelete = await api("/api/tasks");
  const newTaskInputs = [
    {
      key: "images",
      title: "NOStechnology自社サイトの画像素材を作る",
      description: "ChatGPTでNOStechnology Webサイト用の画像素材を作る。トップ、サービス紹介、実績・雰囲気に使える候補を整理する。",
      priority: "urgent",
      delayRisk: 35,
      estimatedMinutes: 90,
      scheduledStart: "2026-06-11T09:00:00+09:00",
      scheduledEnd: "2026-06-11T10:30:00+09:00",
    },
    {
      key: "wireframe",
      title: "NOStechnology自社サイトのワイヤーフレーム作成",
      description: "ClaudeでNOStechnology Webサイトのワイヤーフレームを作成する。コーディングはせず、構成と導線を固める。",
      priority: "high",
      delayRisk: 28,
      estimatedMinutes: 120,
      scheduledStart: "2026-06-11T10:30:00+09:00",
      scheduledEnd: "2026-06-11T12:30:00+09:00",
    },
    {
      key: "design",
      title: "NOStechnology自社サイトのデザイン作成",
      description: "ClaudeでNOStechnology Webサイトのデザインを作成する。コーディングはしない。画像素材とワイヤーフレームを前提に見た目を固める。",
      priority: "high",
      delayRisk: 30,
      estimatedMinutes: 150,
      scheduledStart: "2026-06-11T13:30:00+09:00",
      scheduledEnd: "2026-06-11T16:00:00+09:00",
    },
  ];

  const taskMap = {};
  for (const input of newTaskInputs) {
    const body = {
      title: input.title,
      description: input.description,
      projectId: project.id,
      primaryAssigneeId: hashisako.id,
      assigneeIds: [hashisako.id],
      dueDate: DUE_JUNE_11,
      priority: input.priority,
      status: "todo",
      attachments: [],
      customerWaiting: false,
      delayRisk: input.delayRisk,
      estimatedMinutes: input.estimatedMinutes,
      scheduledStart: input.scheduledStart,
      scheduledEnd: input.scheduledEnd,
    };
    const existingTask = existingAfterDelete.find((task) => task.title === input.title);
    taskMap[input.key] = existingTask ? await api(`/api/tasks/${existingTask.id}`, { method: "PATCH", body }) : await api("/api/tasks", { method: "POST", body });
  }

  const branchTasksForApi = [
    { id: "tree-task-nos-site-images", title: "画像素材を作る", dueDate: DUE_JUNE_11, assigneeId: hashisako.id, taskId: taskMap.images.id },
    { id: "tree-task-nos-site-wireframe", title: "ワイヤーフレーム作成", dueDate: DUE_JUNE_11, assigneeId: hashisako.id, taskId: taskMap.wireframe.id },
    { id: "tree-task-nos-site-design", title: "デザイン作成", dueDate: DUE_JUNE_11, assigneeId: hashisako.id, taskId: taskMap.design.id },
  ];
  const metricsForApi = [
    { id: "metric-20260720-revenue", label: "売上", current: 0, target: 250000, unit: "円" },
    { id: "metric-20260720-contracts", label: "受注", current: 0, target: 5, unit: "件" },
  ];

  const treeBodies = [
    {
      matchId: knownIds.companyTree,
      body: {
        scope: "company",
        title: "会社目標",
        goal: "2026年7月20日までに売上25万円または5件を達成する。",
        ownerEmployeeId: null,
        dueDate: GOAL_DUE,
        metrics: metricsForApi,
        branches: [{ id: "branch-nos-site", title: "NOStechnology Webサイト作成", dueDate: GOAL_DUE, assigneeId: hashisako.id, projectId: project.id, tasks: branchTasksForApi }],
      },
    },
    {
      matchId: knownIds.dailyTree,
      body: {
        scope: "daily",
        title: "6月11日の実行",
        goal: "自社サイト（NOStechnology）の画像、ワイヤー、デザインを進める。",
        ownerEmployeeId: hashisako.id,
        dueDate: DUE_JUNE_11,
        metrics: [{ id: "metric-june11-site-steps", label: "制作準備", current: 0, target: 3, unit: "件" }],
        branches: [{ id: "branch-june11-nos-site", title: "NOStechnologyサイト制作準備", dueDate: DUE_JUNE_11, assigneeId: hashisako.id, projectId: project.id, tasks: branchTasksForApi }],
      },
    },
    {
      matchId: knownIds.hashisakoTree,
      body: {
        scope: "personal",
        title: "橋迫 翔太 7/20売上目標",
        goal: "7月20日までに売上25万円または5件を達成する。1件目としてNOStechnology Webサイト作成を進める。",
        ownerEmployeeId: hashisako.id,
        dueDate: GOAL_DUE,
        metrics: metricsForApi,
        branches: [{ id: "branch-hashisako-nos-site", title: "NOStechnology Webサイト作成", dueDate: GOAL_DUE, assigneeId: hashisako.id, projectId: project.id, tasks: branchTasksForApi }],
      },
    },
  ];

  for (const tree of treeBodies) {
    const existingTree = goalTrees.find((item) => item.id === tree.matchId || item.title === tree.body.title);
    if (existingTree) await api(`/api/goal-trees/${existingTree.id}`, { method: "PATCH", body: tree.body });
    else await api("/api/goal-trees", { method: "POST", body: tree.body });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: "production-api",
        deletedTestTasks: testTasks.length,
        project: project.name,
        owner: hashisako.name,
        dueDate: DUE_JUNE_11,
        goalDueDate: GOAL_DUE,
        taskIds: Object.fromEntries(Object.entries(taskMap).map(([key, task]) => [key, task.id])),
        projectId: project.id,
      },
      null,
      2,
    ),
  );
}
