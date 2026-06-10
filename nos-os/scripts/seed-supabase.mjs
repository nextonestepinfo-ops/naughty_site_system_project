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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/rest\/v1\/?$/i, "").replace(/\/$/, "");
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
  { id: ids.employees.urata, user_id: ids.users.urata, name: "浦田 和真", position: "事業責任者", department: "事業運営", avatar_url: "UK", bio: "NOStechnology Webサイト事業の責任者として、案件、売上、今日の優先度を確認します。", leave_balance_days: 11, attendance_status: "working" },
  { id: ids.employees.osaki, user_id: ids.users.osaki, name: "大崎 雄介", position: "社長", department: "経営", avatar_url: "OY", bio: "会社全体の判断、社員βの運用、案件確認を担当します。", leave_balance_days: 12, attendance_status: "working" },
  { id: ids.employees.hashisako, user_id: ids.users.hashisako, name: "橋迫 翔太", position: "社員", department: "", avatar_url: "HS", bio: "制作、確認、営業準備のタスクを担当します。", leave_balance_days: 10, attendance_status: "meeting" },
  { id: ids.employees.watanabe, user_id: ids.users.watanabe, name: "渡邉 駿", position: "社員", department: "", avatar_url: "WS", bio: "システム、DB、業務改善タスクを担当します。", leave_balance_days: 10, attendance_status: "working" },
];

const customers = [
  { id: ids.customers.nos, name: "NosTechnology 事業運営", company: "NosTechnology", email: "ops@nostechnology.jp", phone: "03-0000-1001", notes: "社員βで使う社内運用データ。営業、案件、タスク、勤怠の確認に使います。", health: "good" },
  { id: ids.customers.shops, name: "店舗向けWeb制作候補", company: "店舗向けWeb制作候補", email: "owner@example-shop.local", phone: "06-0000-2202", notes: "飲食店、カフェ、店舗向けにWeb制作デモを見せて初回商談につなげる候補。", health: "watch" },
  { id: ids.customers.tools, name: "中小企業ツール候補", company: "中小企業ツール候補", email: "backoffice@example-smb.local", phone: "052-0000-3303", notes: "勤怠、在庫、売上メモ、問い合わせ管理など小さい業務改善ツールの相談候補。", health: "good" },
  { id: ids.customers.poc, name: "高単価POC候補", company: "高単価POC候補", email: "system@example-enterprise.local", phone: "03-0000-4404", notes: "ヒアリング、サンプル確認、POC、検証、本開発の順で無理なく進める候補。", health: "watch" },
];

const projects = [
  { id: ids.projects.sales, name: "6月 初受注・営業スプリント", customer_id: ids.customers.nos, primary_owner_id: ids.employees.urata, secondary_owner_id: ids.employees.osaki, start_date: dateOnly(-1), due_date: dateOnly(7), budget: 500000, status: "production", notes: "初回受注に向けて、連絡先選定、返信対応、商談化、見積提出まで毎日確認します。" },
  { id: ids.projects.web, name: "店舗向けWeb制作デモ販売", customer_id: ids.customers.shops, primary_owner_id: ids.employees.hashisako, secondary_owner_id: ids.employees.urata, start_date: dateOnly(-2), due_date: dateOnly(5), budget: 300000, status: "proposal", notes: "店舗向けデモページと説明文を整え、営業で見せられる状態にします。" },
  { id: ids.projects.tools, name: "小規模業務改善ツール雛形", customer_id: ids.customers.tools, primary_owner_id: ids.employees.watanabe, secondary_owner_id: ids.employees.osaki, start_date: dateOnly(-1), due_date: dateOnly(10), budget: 450000, status: "hearing", notes: "勤怠、在庫、売上メモ、問い合わせ管理を小さく作れる型にします。" },
  { id: ids.projects.poc, name: "高単価システム開発 POC準備", customer_id: ids.customers.poc, primary_owner_id: ids.employees.osaki, secondary_owner_id: ids.employees.watanabe, start_date: dateOnly(0), due_date: dateOnly(21), budget: 1200000, status: "pre_order", notes: "サンプル確認、POC、検証、本開発の段階に分けて提案します。" },
  { id: ids.projects.media, name: "SNS・受託サイト営業導線", customer_id: ids.customers.nos, primary_owner_id: ids.employees.osaki, secondary_owner_id: ids.employees.hashisako, start_date: dateOnly(-1), due_date: dateOnly(4), budget: 150000, status: "production", notes: "ココナラ、クラウドワークス、SNS、DM、紹介営業の入口を準備します。" },
];

const projectMembers = [
  [ids.projects.sales, ids.employees.urata, "primary"], [ids.projects.sales, ids.employees.osaki, "secondary"], [ids.projects.sales, ids.employees.hashisako, "secondary"],
  [ids.projects.web, ids.employees.hashisako, "primary"], [ids.projects.web, ids.employees.urata, "secondary"], [ids.projects.web, ids.employees.watanabe, "secondary"],
  [ids.projects.tools, ids.employees.watanabe, "primary"], [ids.projects.tools, ids.employees.osaki, "secondary"], [ids.projects.tools, ids.employees.urata, "secondary"],
  [ids.projects.poc, ids.employees.osaki, "primary"], [ids.projects.poc, ids.employees.urata, "secondary"], [ids.projects.poc, ids.employees.watanabe, "secondary"],
  [ids.projects.media, ids.employees.osaki, "primary"], [ids.projects.media, ids.employees.hashisako, "secondary"], [ids.projects.media, ids.employees.urata, "secondary"],
].map(([project_id, employee_id, role]) => ({ project_id, employee_id, role }));

const tasks = [
  { id: ids.tasks.reply, title: "【テスト】返信が来た候補へ次回確認日を返す", body: "温度が下がる前に、日程候補と次に確認する内容を短く返します。", project_id: ids.projects.sales, primary_assignee_id: ids.employees.urata, due_date: dateOnly(0, 10), priority: "urgent", status: "in_progress", attachments: ["lead-replies.csv"], customer_waiting: true, delay_risk: 75, ai_priority_score: 0, estimated_minutes: 35, scheduled_start: dateOffset(0, 9), scheduled_end: dateOffset(0, 10) },
  { id: ids.tasks.salesList, title: "【テスト】今日連絡する営業先10件を決める", body: "見込みが高い候補を選び、最初の一言まで用意します。", project_id: ids.projects.sales, primary_assignee_id: ids.employees.urata, due_date: dateOnly(0, 11), priority: "urgent", status: "todo", attachments: ["sales-list.xlsx"], customer_waiting: false, delay_risk: 72, ai_priority_score: 0, estimated_minutes: 45, scheduled_start: dateOffset(0, 10), scheduled_end: dateOffset(0, 11) },
  { id: ids.tasks.revenue, title: "【テスト】売上管理シートの初期項目を確定", body: "担当、流入元、商品カテゴリ、状態、見込み金額、確度、次アクションを固定します。", project_id: ids.projects.sales, primary_assignee_id: ids.employees.admin, due_date: dateOnly(0, 13), priority: "high", status: "todo", attachments: [], customer_waiting: false, delay_risk: 58, ai_priority_score: 0, estimated_minutes: 40, scheduled_start: dateOffset(0, 11), scheduled_end: dateOffset(0, 12) },
  { id: ids.tasks.webDemo, title: "【テスト】Webデモの説明を営業向けに整える", body: "デモの違い、価格の入口、納品までの流れを営業で話しやすい言葉に直します。", project_id: ids.projects.web, primary_assignee_id: ids.employees.akari, due_date: dateOnly(0, 15), priority: "high", status: "in_progress", attachments: ["demo-sites.md"], customer_waiting: false, delay_risk: 48, ai_priority_score: 0, estimated_minutes: 50, scheduled_start: dateOffset(0, 13), scheduled_end: dateOffset(0, 14) },
  { id: ids.tasks.outsourcing, title: "【テスト】ココナラ出品文と応募文を公開前確認", body: "Web制作、小ツール、資料作成の3カテゴリで最初に出せる文面を整えます。", project_id: ids.projects.media, primary_assignee_id: ids.employees.akari, due_date: dateOnly(0, 17), priority: "high", status: "review", attachments: ["coconala-draft.md"], customer_waiting: false, delay_risk: 43, ai_priority_score: 0, estimated_minutes: 45, scheduled_start: dateOffset(0, 15), scheduled_end: dateOffset(0, 16) },
  { id: ids.tasks.toolsHearing, title: "【テスト】小規模ツールのヒアリング質問を1枚にする", body: "勤怠、在庫、売上メモ、日報の確認項目に絞って商談で使える形にします。", project_id: ids.projects.tools, primary_assignee_id: ids.employees.ren, due_date: dateOnly(1, 12), priority: "high", status: "todo", attachments: [], customer_waiting: false, delay_risk: 42, ai_priority_score: 0, estimated_minutes: 60, scheduled_start: dateOffset(1, 10), scheduled_end: dateOffset(1, 11) },
  { id: ids.tasks.pocSteps, title: "【テスト】高単価POCの検証ステップを整理", body: "サンプル確認、POC、検証、本開発を分け、見積前に潰す不確実性を書きます。", project_id: ids.projects.poc, primary_assignee_id: ids.employees.mio, due_date: dateOnly(1, 16), priority: "high", status: "review", attachments: ["poc-framing.md"], customer_waiting: true, delay_risk: 57, ai_priority_score: 0, estimated_minutes: 70, scheduled_start: dateOffset(1, 14), scheduled_end: dateOffset(1, 15) },
  { id: ids.tasks.weekly, title: "【テスト】メンバー別の今週成果物を登録", body: "各メンバーが今週出す見える成果物を1つずつ決めます。", project_id: ids.projects.sales, primary_assignee_id: ids.employees.admin, due_date: dateOnly(0, 14), priority: "urgent", status: "todo", attachments: [], customer_waiting: false, delay_risk: 68, ai_priority_score: 0, estimated_minutes: 30, scheduled_start: dateOffset(0, 14), scheduled_end: dateOffset(0, 15) },
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
    title: "会社",
    goal: "2026年12月までに売上1000万円を達成する",
    owner_employee_id: null,
    due_date: dateOnly(206),
    metrics: [
      { id: "metric-company-revenue", label: "売上", current: 0, target: 10000000, unit: "円" },
      { id: "metric-company-contracts", label: "契約", current: 0, target: 3, unit: "件" },
    ],
    branches: [
      {
        id: "branch-company-web",
        title: "Web制作で初受注を作る",
        dueDate: dateOnly(22),
        assigneeId: ids.employees.urata,
        projectId: ids.projects.sales,
        tasks: [
          { id: "tree-task-company-list", title: "【テスト】営業リストを作る", dueDate: dateOnly(1), assigneeId: ids.employees.urata, taskId: ids.tasks.salesList },
          { id: "tree-task-company-reply", title: "【テスト】返信候補を商談につなげる", dueDate: dateOnly(3), assigneeId: ids.employees.urata, taskId: ids.tasks.reply },
        ],
      },
    ],
  },
  {
    id: stableUuid("goal-tree-daily-urata"),
    scope: "daily",
    title: "今日",
    goal: "返信対応、営業先選定、サンプル確認を今日進める",
    owner_employee_id: ids.employees.urata,
    due_date: dateOnly(0),
    metrics: [{ id: "metric-daily-contact", label: "連絡", current: 0, target: 10, unit: "件" }],
    branches: [
      {
        id: "branch-daily-sales",
        title: "午前中に営業を動かす",
        dueDate: dateOnly(0, 12),
        assigneeId: ids.employees.urata,
        projectId: ids.projects.sales,
        tasks: [
          { id: "tree-task-daily-reply", title: "【テスト】返信候補に次回確認日を返す", dueDate: dateOnly(0, 10), assigneeId: ids.employees.urata, taskId: ids.tasks.reply },
          { id: "tree-task-daily-ten", title: "【テスト】今日連絡する10件を決める", dueDate: dateOnly(0, 11), assigneeId: ids.employees.urata, taskId: ids.tasks.salesList },
        ],
      },
    ],
  },
  {
    id: stableUuid("goal-tree-personal-hashisako"),
    scope: "personal",
    title: "橋迫 個人目標",
    goal: "Webサンプルを営業で売りやすい状態にする",
    owner_employee_id: ids.employees.hashisako,
    due_date: dateOnly(7),
    metrics: [{ id: "metric-hashisako-samples", label: "サンプル", current: 5, target: 10, unit: "個" }],
    branches: [
      {
        id: "branch-hashisako-design",
        title: "デザインサンプルを整える",
        dueDate: dateOnly(3),
        assigneeId: ids.employees.hashisako,
        projectId: ids.projects.web,
        tasks: [
          { id: "tree-task-hashisako-restaurant", title: "【テスト】飲食店サンプルを営業向けに見直す", dueDate: dateOnly(1), assigneeId: ids.employees.hashisako, taskId: null },
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
  { id: stableUuid("comment-1"), task_id: ids.tasks.reply, author_user_id: ids.users.urata, body: "午前中に一言だけでも返して、商談化の温度を落とさないようにします。" },
];

const notifications = [
  { id: stableUuid("notice-urata-1"), user_id: ids.users.urata, type: "due_today", title: "返信対応と営業先選定が本日期限です", body: "先に返信対応を済ませてから、今日連絡する10件を決めてください。", severity: "warning", target_href: "/", read_at: null },
  { id: stableUuid("notice-osaki-1"), user_id: ids.users.osaki, type: "due_today", title: "今週成果物の登録が本日期限です", body: "各メンバーに、今週出す見える成果物を1つずつ登録してもらってください。", severity: "warning", target_href: "/tasks", read_at: null },
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
