# Supabase Setup For Nos OS

Supabase is the real backend target for Phase2: login, users, projects, tasks,
attendance, leave balance, notifications, audit logs, and Row Level Security.

## What Can Be Done From This Repo

- Use `supabase/schema.sql` as the initial database schema.
- Add Supabase URL and keys to `.env.local`.
- Replace the local mock repository with Supabase queries step by step.
- Keep UI components unchanged while the data layer is swapped.

## What The Owner Needs To Provide

Do not paste secrets in chat. Put them in `.env.local` or share them through a
safe secret manager.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Also needed for production auth:

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

## Dashboard Steps

1. Create or open a Supabase project for Nos OS.
2. Go to SQL Editor and run `supabase/schema.sql`.
3. Go to Project Settings, then API.
4. Copy Project URL, anon public key, and service role key.
5. Add those values to `nos-os/.env.local`.
6. Restart the local server.

## Recommended Migration Order

1. Supabase Auth session adapter.
2. `users` and `employees`.
3. `projects`, `project_members`, and `customers`.
4. `tasks` and `task_comments`.
5. `attendance_logs`, `leave_requests`, and `notifications`.
6. RLS policies and audit logs.

The current app intentionally keeps all screen code behind route handlers so
this can be done like the Beauty app style: connect the backend under the same
UI, then replace mock reads/writes one module at a time.
