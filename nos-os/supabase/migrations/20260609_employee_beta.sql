create extension if not exists "pgcrypto";

do $$
begin
  update public.users set role = 'employee' where role = 'part_time';
  alter table public.users drop constraint if exists users_role_check;
  alter table public.users add constraint users_role_check check (role in ('admin', 'employee', 'sales'));
end $$;

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

alter table public.goal_trees enable row level security;

create index if not exists idx_goal_trees_scope on public.goal_trees(scope);
create index if not exists idx_goal_trees_owner on public.goal_trees(owner_employee_id);
create index if not exists idx_goal_trees_due_date on public.goal_trees(due_date);
