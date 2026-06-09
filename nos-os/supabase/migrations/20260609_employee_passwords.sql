create extension if not exists "pgcrypto";

alter table public.users add column if not exists password_salt text;
alter table public.users add column if not exists password_hash text;
alter table public.users add column if not exists must_change_password boolean not null default true;
alter table public.users add column if not exists password_changed_at timestamptz;

update public.users
set password_salt = encode(gen_random_bytes(16), 'hex')
where password_salt is null or password_salt = '';

alter table public.users alter column password_salt set default encode(gen_random_bytes(16), 'hex');
alter table public.users alter column password_salt set not null;

update public.users
set
  password_hash = encode(digest(password_salt || ':0000', 'sha256'), 'hex'),
  must_change_password = true
where password_hash is null;
