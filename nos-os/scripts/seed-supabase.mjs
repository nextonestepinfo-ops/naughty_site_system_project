import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv(file) {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) return;
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([^#][^=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    const value = match[2].trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv(".env.local");
loadEnv(".env");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add them to .env.local before seeding.");
  process.exit(1);
}

function stableUuid(input) {
  const hex = createHash("sha1").update(`nos-os:${input}`).digest("hex").slice(0, 32).split("");
  hex[12] = "5";
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20).join("")}`;
}

function passwordHash(password, salt) {
  return createHash("sha256").update(`${salt}:${password}`).digest("hex");
}

function dateOffset(days, hour = 18) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

function dateOnly(days, hour = 18) {
  return dateOffset(days, hour).slice(0, 10);
}

async function rest(path, { method = "GET", query = {}, body, prefer } = {}) {
  const params = new URLSearchParams({ select: "*", ...query });
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}?${params}`, {
    method,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${method} ${path} failed: ${response.status} ${text}`);
  }
  if (response.status === 204) return [];
  return response.json();
}

async function upsert(table, rows, onConflict = "id") {
  if (!rows.length) return [];
  return rest(table, {
    method: "POST",
    query: { on_conflict: onConflict },
    body: rows,
    prefer: "resolution=merge-duplicates,return=representation",
  });
}

async function patch(table, query, body) {
  return rest(table, {
    method: "PATCH",
    query,
    body,
    prefer: "return=representation",
  });
}

async function remove(table, query) {
  return rest(table, {
    method: "DELETE",
    query,
    prefer: "return=representation",
  });
}

const ids = {
  users: {
    urata: stableUuid("user-urata"),
    hashisako: stableUuid("user-hashisako"),
    watanabe: stableUuid("user-watanabe"),
    osaki: stableUuid("user-osaki"),
  },
  employees: {
    urata: stableUuid("emp-urata"),
    hashisako: stableUuid("emp-hashisako"),
    watanabe: stableUuid("emp-watanabe"),
    osaki: stableUuid("emp-osaki"),
  },
  customers: {
    nos: stableUuid("cus-nos"),
    shops: stableUuid("cus-local-shops"),
    tools: stableUuid("cus-smb-tools"),
    poc: stableUuid("cus-enterprise-poc"),
  },
  projects: {
    sales: stableUuid("proj-sales-sprint"),
    web: stableUuid("proj-web-demo"),
    tools: stableUuid("proj-tools"),
    poc: stableUuid("proj-poc"),
    media: stableUuid("proj-sales-media"),
  },
  tasks: {
    reply: stableUuid("task-urata-reply"),
    salesList: stableUuid("task-sales-list"),
    revenue: stableUuid("task-revenue-sheet"),
    webDemo: stableUuid("task-web-demo-talk"),
    outsourcing: stableUuid("task-outsourcing-copy"),
    toolsHearing: stableUuid("task-tools-hearing"),
    pocSteps: stableUuid("task-poc-steps"),
    weekly: stableUuid("task-weekly-assignments"),
  },
};

ids.users.admin = ids.users.osaki;
ids.users.akari = ids.users.hashisako;
ids.users.ren = ids.users.watanabe;
ids.users.mio = ids.users.osaki;
ids.employees.admin = ids.employees.osaki;
ids.employees.akari = ids.employees.hashisako;
ids.employees.ren = ids.employees.watanabe;
ids.employees.mio = ids.employees.osaki;

const users = [
  { id: ids.users.urata, email: "urata@nostechnology.jp", role: "admin", employment_type: "full_time", auth_provider: "email" },
  { id: ids.users.osaki, email: "osaki@nostechnology.jp", role: "admin", employment_type: "full_time", auth_provider: "email" },
  { id: ids.users.hashisako, email: "hashisako@nostechnology.jp", role: "employee", employment_type: "full_time", auth_provider: "email" },
  { id: ids.users.watanabe, email: "watanabe@nostechnology.jp", role: "employee", employment_type: "full_time", auth_provider: "email" },
];

const employees = [
  { id: ids.employees.urata, user_id: ids.users.urata, name: "浦田 和真", position: "Host / Manager", department: "Management", avatar_url: "UK", bio: "会社全体の案件、売上、タスク優先度を確認します。", leave_balance_days: 11, attendance_status: "working" },
  { id: ids.employees.osaki, user_id: ids.users.osaki, name: "大崎 雄介", position: "Host / Operations", department: "Management", avatar_url: "OY", bio: "社員βの運用、案件確認、タスク整理を担当します。", leave_balance_days: 12, attendance_status: "working" },
  { id: ids.employees.hashisako, user_id: ids.users.hashisako, name: "橋迫 翔太", position: "Staff", department: "Operations", avatar_url: "HS", bio: "制作、確認、営業準備のタスクを担当します。", leave_balance_days: 10, attendance_status: "meeting" },
  { id: ids.employees.watanabe, user_id: ids.users.watanabe, name: "渡邉 駿", position: "Staff", department: "System Development", avatar_url: "WS", bio: "システム、DB、業務改善タスクを担当します。", leave_balance_days: 10, attendance_status: "working" },
];

const customers = [
  { id: ids.customers.nos, name: "NosTechnology Operations", company: "NosTechnology", email: "ops@nostechnology.jp", phone: "03-0000-1001", notes: "Internal beta customer for the first employee test.", health: "good" },
  { id: ids.customers.shops, name: "Local Shop Leads", company: "Local Shop Leads", email: "owner@example-shop.local", phone: "06-0000-2202", notes: "Small shop web production sales candidates.", health: "watch" },
  { id: ids.customers.tools, name: "SMB Tool Leads", company: "SMB Tool Leads", email: "backoffice@example-smb.local", phone: "052-0000-3303", notes: "Back-office tool candidates.", health: "good" },
  { id: ids.customers.poc, name: "Enterprise POC Lead", company: "Enterprise POC Lead", email: "system@example-enterprise.local", phone: "03-0000-4404", notes: "High-value POC candidate.", health: "watch" },
];

const projects = [
  { id: ids.projects.sales, name: "June first-order sales sprint", customer_id: ids.customers.nos, primary_owner_id: ids.employees.urata, secondary_owner_id: ids.employees.osaki, start_date: dateOnly(-1), due_date: dateOnly(7), budget: 500000, status: "production", notes: "Daily sales sprint for first paid orders." },
  { id: ids.projects.web, name: "Local shop web demo sales", customer_id: ids.customers.shops, primary_owner_id: ids.employees.hashisako, secondary_owner_id: ids.employees.urata, start_date: dateOnly(-2), due_date: dateOnly(5), budget: 300000, status: "proposal", notes: "Prepare demo pages and simple sales explanations." },
  { id: ids.projects.tools, name: "Small business tool discovery", customer_id: ids.customers.tools, primary_owner_id: ids.employees.watanabe, secondary_owner_id: ids.employees.osaki, start_date: dateOnly(-1), due_date: dateOnly(10), budget: 450000, status: "hearing", notes: "Clarify attendance, inventory, and sales memo workflows." },
  { id: ids.projects.poc, name: "High-value system POC framing", customer_id: ids.customers.poc, primary_owner_id: ids.employees.osaki, secondary_owner_id: ids.employees.watanabe, start_date: dateOnly(0), due_date: dateOnly(21), budget: 1200000, status: "pre_order", notes: "Split POC into small validation steps." },
  { id: ids.projects.media, name: "SNS and outsourcing sales line", customer_id: ids.customers.nos, primary_owner_id: ids.employees.osaki, secondary_owner_id: ids.employees.hashisako, start_date: dateOnly(-1), due_date: dateOnly(4), budget: 150000, status: "production", notes: "Prepare Coconala, cloud work, SNS, and DM entry points." },
];

const projectMembers = [
  [ids.projects.sales, ids.employees.urata, "primary"], [ids.projects.sales, ids.employees.osaki, "secondary"], [ids.projects.sales, ids.employees.hashisako, "secondary"],
  [ids.projects.web, ids.employees.hashisako, "primary"], [ids.projects.web, ids.employees.urata, "secondary"], [ids.projects.web, ids.employees.watanabe, "secondary"],
  [ids.projects.tools, ids.employees.watanabe, "primary"], [ids.projects.tools, ids.employees.osaki, "secondary"], [ids.projects.tools, ids.employees.urata, "secondary"],
  [ids.projects.poc, ids.employees.osaki, "primary"], [ids.projects.poc, ids.employees.urata, "secondary"], [ids.projects.poc, ids.employees.watanabe, "secondary"],
  [ids.projects.media, ids.employees.osaki, "primary"], [ids.projects.media, ids.employees.hashisako, "secondary"], [ids.projects.media, ids.employees.urata, "secondary"],
].map(([project_id, employee_id, role]) => ({ project_id, employee_id, role }));

const tasks = [
  { id: ids.tasks.reply, title: "Return next confirmation dates to replied leads", body: "Send next-date replies before the opportunity cools down.", project_id: ids.projects.sales, primary_assignee_id: ids.employees.urata, due_date: dateOnly(0, 10), priority: "urgent", status: "in_progress", attachments: ["lead-replies.csv"], customer_waiting: true, delay_risk: 75, ai_priority_score: 0, estimated_minutes: 35, scheduled_start: dateOffset(0, 9), scheduled_end: dateOffset(0, 10) },
  { id: ids.tasks.salesList, title: "Pick today's 10 sales contacts", body: "Choose the highest-fit prospects and prepare one-line openings.", project_id: ids.projects.sales, primary_assignee_id: ids.employees.urata, due_date: dateOnly(0, 11), priority: "urgent", status: "todo", attachments: ["sales-list.xlsx"], customer_waiting: false, delay_risk: 72, ai_priority_score: 0, estimated_minutes: 45, scheduled_start: dateOffset(0, 10), scheduled_end: dateOffset(0, 11) },
  { id: ids.tasks.revenue, title: "Confirm first columns for the revenue sheet", body: "Set owner, source, product category, status, forecast amount, confidence, and next action.", project_id: ids.projects.sales, primary_assignee_id: ids.employees.admin, due_date: dateOnly(0, 13), priority: "high", status: "todo", attachments: [], customer_waiting: false, delay_risk: 58, ai_priority_score: 0, estimated_minutes: 40, scheduled_start: dateOffset(0, 11), scheduled_end: dateOffset(0, 12) },
  { id: ids.tasks.webDemo, title: "Make the web demo explanation sales-ready", body: "Rewrite demo differences, price entry points, and delivery flow in sales language.", project_id: ids.projects.web, primary_assignee_id: ids.employees.akari, due_date: dateOnly(0, 15), priority: "high", status: "in_progress", attachments: ["demo-sites.md"], customer_waiting: false, delay_risk: 48, ai_priority_score: 0, estimated_minutes: 50, scheduled_start: dateOffset(0, 13), scheduled_end: dateOffset(0, 14) },
  { id: ids.tasks.outsourcing, title: "Review Coconala and cloud work copy before publishing", body: "Polish public copy for web production, small tools, and material creation.", project_id: ids.projects.media, primary_assignee_id: ids.employees.akari, due_date: dateOnly(0, 17), priority: "high", status: "review", attachments: ["coconala-draft.md"], customer_waiting: false, delay_risk: 43, ai_priority_score: 0, estimated_minutes: 45, scheduled_start: dateOffset(0, 15), scheduled_end: dateOffset(0, 16) },
  { id: ids.tasks.toolsHearing, title: "Prepare one-page hearing questions for small tools", body: "Focus on attendance, stock, sales memos, and daily reporting.", project_id: ids.projects.tools, primary_assignee_id: ids.employees.ren, due_date: dateOnly(1, 12), priority: "high", status: "todo", attachments: [], customer_waiting: false, delay_risk: 42, ai_priority_score: 0, estimated_minutes: 60, scheduled_start: dateOffset(1, 10), scheduled_end: dateOffset(1, 11) },
  { id: ids.tasks.pocSteps, title: "Split the high-value POC into validation steps", body: "Define sample confirmation, POC, evaluation, and main development milestones.", project_id: ids.projects.poc, primary_assignee_id: ids.employees.mio, due_date: dateOnly(1, 16), priority: "high", status: "review", attachments: ["poc-framing.md"], customer_waiting: true, delay_risk: 57, ai_priority_score: 0, estimated_minutes: 70, scheduled_start: dateOffset(1, 14), scheduled_end: dateOffset(1, 15) },
  { id: ids.tasks.weekly, title: "Register each member's weekly deliverable", body: "Each member decides one visible result for this week.", project_id: ids.projects.sales, primary_assignee_id: ids.employees.admin, due_date: dateOnly(0, 14), priority: "urgent", status: "todo", attachments: [], customer_waiting: false, delay_risk: 68, ai_priority_score: 0, estimated_minutes: 30, scheduled_start: dateOffset(0, 14), scheduled_end: dateOffset(0, 15) },
];

const taskAssignees = [
  [ids.tasks.reply, ids.employees.urata], [ids.tasks.reply, ids.employees.osaki],
  [ids.tasks.salesList, ids.employees.urata], [ids.tasks.salesList, ids.employees.hashisako],
  [ids.tasks.revenue, ids.employees.osaki], [ids.tasks.revenue, ids.employees.urata],
  [ids.tasks.webDemo, ids.employees.hashisako], [ids.tasks.webDemo, ids.employees.watanabe],
  [ids.tasks.outsourcing, ids.employees.hashisako], [ids.tasks.outsourcing, ids.employees.osaki],
  [ids.tasks.toolsHearing, ids.employees.watanabe], [ids.tasks.toolsHearing, ids.employees.osaki],
  [ids.tasks.pocSteps, ids.employees.osaki], [ids.tasks.pocSteps, ids.employees.urata], [ids.tasks.pocSteps, ids.employees.watanabe],
  [ids.tasks.weekly, ids.employees.osaki], [ids.tasks.weekly, ids.employees.urata], [ids.tasks.weekly, ids.employees.hashisako], [ids.tasks.weekly, ids.employees.watanabe],
].map(([task_id, employee_id]) => ({ task_id, employee_id }));

const goalTrees = [
  {
    id: stableUuid("goal-tree-company-2026"),
    scope: "company",
    title: "Company",
    goal: "Reach 10,000,000 yen by December 2026",
    owner_employee_id: null,
    due_date: dateOnly(206),
    metrics: [
      { id: "metric-company-revenue", label: "Revenue", current: 0, target: 10000000, unit: "yen" },
      { id: "metric-company-contracts", label: "Contracts", current: 0, target: 3, unit: "deals" },
    ],
    branches: [
      {
        id: "branch-company-web",
        title: "Create first paid web production order",
        dueDate: dateOnly(22),
        assigneeId: ids.employees.urata,
        projectId: ids.projects.sales,
        tasks: [
          { id: "tree-task-company-list", title: "Build sales list", dueDate: dateOnly(1), assigneeId: ids.employees.urata, taskId: ids.tasks.salesList },
          { id: "tree-task-company-reply", title: "Turn replied leads into meetings", dueDate: dateOnly(3), assigneeId: ids.employees.urata, taskId: ids.tasks.reply },
        ],
      },
    ],
  },
  {
    id: stableUuid("goal-tree-daily-urata"),
    scope: "daily",
    title: "Today",
    goal: "Move replies, sales contacts, and sample checks today",
    owner_employee_id: ids.employees.urata,
    due_date: dateOnly(0),
    metrics: [{ id: "metric-daily-contact", label: "Contacts", current: 0, target: 10, unit: "items" }],
    branches: [
      {
        id: "branch-daily-sales",
        title: "Start sales before noon",
        dueDate: dateOnly(0, 12),
        assigneeId: ids.employees.urata,
        projectId: ids.projects.sales,
        tasks: [
          { id: "tree-task-daily-reply", title: "Reply to 3 candidates", dueDate: dateOnly(0, 10), assigneeId: ids.employees.urata, taskId: ids.tasks.reply },
          { id: "tree-task-daily-ten", title: "Pick 10 contacts", dueDate: dateOnly(0, 11), assigneeId: ids.employees.urata, taskId: ids.tasks.salesList },
        ],
      },
    ],
  },
  {
    id: stableUuid("goal-tree-personal-hashisako"),
    scope: "personal",
    title: "Hashisako personal",
    goal: "Make web samples easy to sell",
    owner_employee_id: ids.employees.hashisako,
    due_date: dateOnly(7),
    metrics: [{ id: "metric-hashisako-samples", label: "Samples", current: 5, target: 10, unit: "items" }],
    branches: [
      {
        id: "branch-hashisako-design",
        title: "Prepare design samples",
        dueDate: dateOnly(3),
        assigneeId: ids.employees.hashisako,
        projectId: ids.projects.web,
        tasks: [
          { id: "tree-task-hashisako-restaurant", title: "Review restaurant sample for sales", dueDate: dateOnly(1), assigneeId: ids.employees.hashisako, taskId: null },
        ],
      },
    ],
  },
];

const attendanceLogs = [
  { id: stableUuid("att-urata-1"), employee_id: ids.employees.urata, event_type: "clock_in", recorded_at: dateOffset(0, 8), source: "manual" },
  { id: stableUuid("att-osaki-1"), employee_id: ids.employees.osaki, event_type: "clock_in", recorded_at: dateOffset(0, 9), source: "manual" },
  { id: stableUuid("att-hashisako-1"), employee_id: ids.employees.hashisako, event_type: "meeting", recorded_at: dateOffset(0, 13), source: "manual" },
  { id: stableUuid("att-watanabe-1"), employee_id: ids.employees.watanabe, event_type: "clock_in", recorded_at: dateOffset(0, 10), source: "manual" },
];

const leaveRequests = [
  { id: stableUuid("leave-hashisako-1"), employee_id: ids.employees.hashisako, start_date: dateOnly(10), end_date: dateOnly(11), days: 2, status: "pending" },
  { id: stableUuid("leave-watanabe-1"), employee_id: ids.employees.watanabe, start_date: dateOnly(20), end_date: dateOnly(20), days: 1, status: "approved" },
];

const taskComments = [
  { id: stableUuid("comment-1"), task_id: ids.tasks.reply, author_user_id: ids.users.urata, body: "Reply before noon so the lead does not cool down." },
];

const notifications = [
  { id: stableUuid("notice-urata-1"), user_id: ids.users.urata, type: "due_today", title: "Reply and sales contacts are due today", body: "Move replies first, then choose today's 10 sales contacts.", severity: "warning", target_href: "/", read_at: null },
  { id: stableUuid("notice-osaki-1"), user_id: ids.users.osaki, type: "due_today", title: "Weekly deliverables are due today", body: "Ask each member to register one visible weekly result.", severity: "warning", target_href: "/tasks", read_at: null },
];

const tables = [
  ["users", users, "id"],
  ["employees", employees, "id"],
  ["customers", customers, "id"],
  ["projects", projects, "id"],
  ["project_members", projectMembers, "project_id,employee_id"],
  ["tasks", tasks, "id"],
  ["task_assignees", taskAssignees, "task_id,employee_id"],
  ["task_comments", taskComments, "id"],
  ["goal_trees", goalTrees, "id"],
  ["attendance_logs", attendanceLogs, "id"],
  ["leave_requests", leaveRequests, "id"],
  ["notifications", notifications, "id"],
];

async function ensureInitialPasswords() {
  const userIds = users.map((user) => user.id).join(",");
  const rows = await rest("users", { query: { id: `in.(${userIds})` } });

  for (const row of rows) {
    if (row.password_hash) continue;
    const salt = row.password_salt || stableUuid(`password-salt-${row.id}`);
    await patch(
      "users",
      { id: `eq.${row.id}` },
      {
        password_salt: salt,
        password_hash: passwordHash("0000", salt),
        must_change_password: true,
        password_changed_at: null,
      },
    );
    console.log(`users: initialized password for ${row.email}`);
  }
}

async function removeDeprecatedDemoUsers() {
  const deprecatedEmails = ["admin@nostechnology.jp", "akari@nostechnology.jp", "ren@nostechnology.jp", "mio@nostechnology.jp"];
  const removed = await remove("users", { email: `in.(${deprecatedEmails.join(",")})` });
  console.log(`users: removed ${Array.isArray(removed) ? removed.length : 0} deprecated demo accounts`);
}

for (const [table, rows, conflict] of tables) {
  const result = await upsert(table, rows, conflict);
  console.log(`${table}: upserted ${result.length}`);
}

await ensureInitialPasswords();
await removeDeprecatedDemoUsers();

console.log("Supabase employee beta seed complete.");
