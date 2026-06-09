create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  user_agent text,
  delivered_notice_ids jsonb not null default '[]'::jsonb,
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create index if not exists idx_push_subscriptions_user on public.push_subscriptions(user_id);
create index if not exists idx_push_subscriptions_employee on public.push_subscriptions(employee_id);
