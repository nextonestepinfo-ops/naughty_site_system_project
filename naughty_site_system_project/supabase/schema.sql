-- NAUGHTY vNext MVP Supabase schema
-- Employee UI uses login_id + password. Auth email is internal: login_id@naughty.local.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'employee')),
  login_id text unique,
  internal_email text unique,
  staff_id uuid,
  display_name text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  roman_name text default '',
  profile_text text default '',
  short_comment text default '',
  photo_url text default '',
  hero_photo_url text default '',
  hourly_wage integer not null default 0,
  tags text[] not null default '{}',
  public_visible boolean not null default true,
  work_status text not null default 'off' check (work_status in ('working', 'scheduled', 'off')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_staff_fk foreign key (staff_id) references public.staff(id) on delete set null;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text default 'drink',
  sale_price integer not null default 0,
  back_amount integer not null default 0,
  event_only boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  business_date date not null,
  staff_id uuid not null references public.staff(id) on delete cascade,
  status text not null default 'off' check (status in ('working', 'scheduled', 'off')),
  start_time time,
  end_time time,
  public_note text default '',
  updated_at timestamptz not null default now(),
  unique (business_date, staff_id)
);

create table if not exists public.qr_checkpoints (
  id uuid primary key default gen_random_uuid(),
  label text not null default '店舗固定QR',
  code text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.punches (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  checkpoint_id uuid references public.qr_checkpoints(id) on delete set null,
  status text not null check (status in ('working', 'scheduled', 'off')),
  actual_at timestamptz not null default now(),
  rounded_at timestamptz not null,
  actual_time time not null,
  rounded_time time not null,
  business_date date not null,
  source text not null default 'employee' check (source in ('employee', 'admin')),
  method text not null default 'qr' check (method in ('qr', 'manual')),
  created_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  qty integer not null default 1 check (qty > 0),
  sale_price integer not null default 0,
  back_amount integer not null default 0,
  total integer generated always as (sale_price * qty) stored,
  back_total integer generated always as (back_amount * qty) stored,
  business_date date not null,
  source text not null default 'employee' check (source in ('employee', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  caption text default '',
  image_url text not null default '',
  kind text not null default 'photo',
  public_visible boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  event_date date,
  title text not null,
  summary text default '',
  public_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shop_settings (
  id text primary key default 'main',
  display_name text not null default 'NAUGHTY',
  concept text default '',
  hours text default '19:00-05:00',
  address text default '',
  instagram text default '',
  updated_at timestamptz not null default now()
);

insert into public.qr_checkpoints (label, code)
values ('店舗固定QR', 'NTY-HQ-2026')
on conflict (code) do nothing;

insert into public.shop_settings (id)
values ('main')
on conflict (id) do nothing;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and is_active = true
  );
$$;

create or replace function public.owns_staff(target_staff_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and staff_id = target_staff_id
      and role = 'employee'
      and is_active = true
  );
$$;

alter table public.profiles enable row level security;
alter table public.staff enable row level security;
alter table public.products enable row level security;
alter table public.shifts enable row level security;
alter table public.qr_checkpoints enable row level security;
alter table public.punches enable row level security;
alter table public.sales enable row level security;
alter table public.gallery_items enable row level security;
alter table public.events enable row level security;
alter table public.shop_settings enable row level security;

create policy "admins manage profiles" on public.profiles for all using (public.is_admin()) with check (public.is_admin());
create policy "employees read own profile" on public.profiles for select using (id = auth.uid());

create policy "admins manage staff" on public.staff for all using (public.is_admin()) with check (public.is_admin());
create policy "employees read staff" on public.staff for select using (public.owns_staff(id));

create policy "admins manage products" on public.products for all using (public.is_admin()) with check (public.is_admin());
create policy "employees read active products" on public.products for select using (active = true);

create policy "admins manage shifts" on public.shifts for all using (public.is_admin()) with check (public.is_admin());
create policy "employees read own shifts" on public.shifts for select using (public.owns_staff(staff_id));

create policy "admins manage punches" on public.punches for all using (public.is_admin()) with check (public.is_admin());
create policy "employees read own punches" on public.punches for select using (public.owns_staff(staff_id));
create policy "employees insert own punches" on public.punches for insert with check (public.owns_staff(staff_id));

create policy "admins manage sales" on public.sales for all using (public.is_admin()) with check (public.is_admin());
create policy "employees read own sales" on public.sales for select using (public.owns_staff(staff_id));
create policy "employees insert own sales" on public.sales for insert with check (public.owns_staff(staff_id));

create policy "public read gallery" on public.gallery_items for select using (public_visible = true);
create policy "admins manage gallery" on public.gallery_items for all using (public.is_admin()) with check (public.is_admin());

create policy "public read events" on public.events for select using (public_visible = true);
create policy "admins manage events" on public.events for all using (public.is_admin()) with check (public.is_admin());

create policy "public read shop settings" on public.shop_settings for select using (true);
create policy "admins manage shop settings" on public.shop_settings for all using (public.is_admin()) with check (public.is_admin());

create policy "employees read active qr" on public.qr_checkpoints for select using (is_active = true);
create policy "admins manage qr" on public.qr_checkpoints for all using (public.is_admin()) with check (public.is_admin());
