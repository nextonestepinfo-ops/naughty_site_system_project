# Supabase Setup For Nos OS

Supabase is the real backend target for Phase2: login, users, projects, tasks,
attendance, leave balance, notifications, audit logs, and Row Level Security.

## What Can Be Done From This Repo

- Use `supabase/schema.sql` as the initial database schema, or apply
  `supabase/migrations/20260609_employee_beta.sql` to an existing project.
- Add Supabase URL and keys to `.env.local`.
- Switch data mode with `NOS_OS_DATA_MODE=supabase`.
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
2. Go to SQL Editor and run `supabase/schema.sql` for a new project, or
   `supabase/migrations/20260609_employee_beta.sql` for an existing project.
3. Go to Project Settings, then API.
4. Copy Project URL, anon public key, and service role key.
5. Add those values to `nos-os/.env.local`.
6. Set `NOS_OS_DATA_MODE=supabase`.
7. Run `npm run supabase:seed`.
8. Restart the local server.

## Recommended Migration Order

1. Employee beta persistence: users, employees, customers, projects, tasks,
   goal trees, attendance, leave requests, and notifications.
2. Supabase Auth session adapter.
3. RLS policies and audit logs.
4. Google OAuth and Sheets sync.
5. Gmail parsing and task candidates.

The app intentionally keeps all screen code behind route handlers. That lets the
same UI run against mock data locally or shared Supabase data for the beta.
