create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text not null check (role in ('admin', 'employee', 'sales')),
  employment_type text not null default 'full_time' check (employment_type in ('full_time', 'part_time', 'contractor')),
  auth_provider text not null check (auth_provider in ('google', 'email')),
  password_salt text not null default encode(gen_random_bytes(16), 'hex'),
  password_hash text,
  must_change_password boolean not null default true,
  password_changed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  name text not null,
  position text not null,
  department text not null,
  avatar_url text,
  bio text not null default '',
  leave_balance_days numeric(5, 2) not null default 0,
  attendance_status text not null default 'off' check (attendance_status in ('working', 'break', 'out', 'meeting', 'off', 'absent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text not null,
  email text,
  phone text,
  notes text not null default '',
  health text not null default 'good' check (health in ('good', 'watch', 'risk')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  customer_id uuid references public.customers(id) on delete set null,
  primary_owner_id uuid references public.employees(id) on delete set null,
  secondary_owner_id uuid references public.employees(id) on delete set null,
  start_date date not null,
  due_date date not null,
  budget numeric(12, 0) not null default 0,
  status text not null check (status in (
    'pre_order', 'hearing', 'proposal', 'production', 'customer_review',
    'revision', 'final_review', 'delivered', 'maintenance', 'completed'
  )),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  role text not null default 'viewer' check (role in ('primary', 'secondary', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (project_id, employee_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  project_id uuid references public.projects(id) on delete set null,
  primary_assignee_id uuid references public.employees(id) on delete set null,
  due_date date not null,
  priority text not null check (priority in ('urgent', 'high', 'normal', 'low', 'hold')),
  status text not null check (status in ('todo', 'in_progress', 'review', 'done')),
  attachments jsonb not null default '[]'::jsonb,
  customer_waiting boolean not null default false,
  delay_risk integer not null default 0 check (delay_risk >= 0 and delay_risk <= 100),
  ai_priority_score integer not null default 0,
  estimated_minutes integer not null default 45,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_assignees (
  task_id uuid not null references public.tasks(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, employee_id)
);

create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_user_id uuid references public.users(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.emails (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  gmail_message_id text unique,
  sender text not null,
  subject text not null,
  body_preview text not null default '',
  received_at timestamptz not null,
  ai_summary text,
  ai_category text,
  ai_urgency integer,
  requires_reply boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.attendance_logs (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  event_type text not null check (event_type in (
    'clock_in', 'break_start', 'break_end', 'out', 'return', 'meeting', 'clock_out', 'absent'
  )),
  recorded_at timestamptz not null default now(),
  source text not null default 'manual' check (source in ('manual', 'qr', 'google_sheets')),
  note text
);

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  days numeric(5, 2) not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  severity text not null default 'info' check (severity in ('info', 'success', 'warning', 'danger')),
  target_href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_summaries (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('employee', 'project', 'task', 'company')),
  target_id uuid,
  title text not null,
  summary text not null,
  score integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  period text not null check (period in ('week', 'month', 'quarter', 'year')),
  title text not null,
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  status text not null default 'on_track' check (status in ('on_track', 'at_risk', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goal_trees (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('company', 'daily', 'personal')),
  title text not null,
  goal text not null,
  owner_employee_id uuid references public.employees(id) on delete cascade,
  due_date date not null,
  metrics jsonb not null default '[]'::jsonb,
  branches jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.employee_skills (
  employee_id uuid not null references public.employees(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  level integer not null check (level >= 1 and level <= 5),
  created_at timestamptz not null default now(),
  primary key (employee_id, skill_id)
);

alter table public.users enable row level security;
alter table public.employees enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignees enable row level security;
alter table public.task_comments enable row level security;
alter table public.customers enable row level security;
alter table public.emails enable row level security;
alter table public.attendance_logs enable row level security;
alter table public.leave_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.ai_summaries enable row level security;
alter table public.activity_logs enable row level security;
alter table public.goals enable row level security;
alter table public.goal_trees enable row level security;
alter table public.skills enable row level security;
alter table public.employee_skills enable row level security;

create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_tasks_due_date on public.tasks(due_date);
create index if not exists idx_tasks_status_priority on public.tasks(status, priority);
create index if not exists idx_attendance_employee_recorded on public.attendance_logs(employee_id, recorded_at desc);
create index if not exists idx_notifications_user_read on public.notifications(user_id, read_at);
create index if not exists idx_activity_entity on public.activity_logs(entity_type, entity_id);
create index if not exists idx_goal_trees_scope on public.goal_trees(scope);
create index if not exists idx_goal_trees_owner on public.goal_trees(owner_employee_id);
create index if not exists idx_goal_trees_due_date on public.goal_trees(due_date);
