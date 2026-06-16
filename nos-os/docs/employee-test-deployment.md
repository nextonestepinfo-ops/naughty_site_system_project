# Employee Test Deployment

## Current URLs

- Local test app: `http://localhost:3100`
- Local task screen: `http://localhost:3100/tasks`
- Local preview status: `http://localhost:3100/test`
- Local safe health check: `http://localhost:3100/api/health`
- Employee beta URL: `https://nos-os-silk.vercel.app`
- GitHub branch: `https://github.com/nextonestepinfo-ops/naughty_site_system_project/tree/codex/nos-os-daily-cockpit/nos-os`

## Current GitHub Status

Nos OS source code is on the `codex/nos-os-daily-cockpit` branch. The existing
GitHub Pages workflow publishes `naughty_site_system_project`, not `nos-os`, so
GitHub Pages is not the right live URL for the full Nos OS app.

Nos OS uses Next.js route handlers for login, task updates, calendar export,
AI secretary calls, and future Supabase data access. A static GitHub Pages export
would lose those routes, so the employee test build should be deployed through a
GitHub-connected app host such as Vercel.

## Recommended Test URL Path

1. Create a Vercel project from the GitHub repository.
2. Set the Vercel root directory to `nos-os`.
3. Set the production branch to `codex/nos-os-daily-cockpit` for the first
   internal test, or merge to `main` later.
4. Run the Supabase SQL migration and seed command below.
5. Add environment variables from `nos-os/.env.example`.
6. Deploy and share the Vercel URL with employees.

## Required Environment Variables

Set these in the deployment host, not in GitHub source files:

```text
AI_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
OPENAI_MAX_OUTPUT_TOKENS=520
OPENAI_REASONING_EFFORT=low
OPENAI_TEXT_VERBOSITY=low
NOS_OS_DATA_MODE=supabase
NEXT_PUBLIC_TEST_BUILD_LABEL=employee-preview
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Google OAuth and Sheets IDs can stay empty for this employee beta.
Put the `sk-...` secret only in `OPENAI_API_KEY`. `OPENAI_MODEL` should be a
model ID such as `gpt-5.4-mini`.

## Supabase Reality Check

Supabase is now supported behind the existing Next.js API routes. The app uses
the local mock repository when `NOS_OS_DATA_MODE=mock`, and server-side Supabase
REST calls when `NOS_OS_DATA_MODE=supabase`.

Run `supabase/migrations/20260609_employee_beta.sql` in the Supabase SQL Editor,
then run `supabase/migrations/20260609_employee_passwords.sql` in the same editor,
then seed the beta data locally:

```bash
npm run supabase:seed
```

The seed command is idempotent. It uses stable UUIDs and upserts users,
employees, customers, projects, tasks, comments, goal trees, attendance logs,
leave requests, and notifications. It also removes the old demo accounts
`admin@nostechnology.jp`, `akari@nostechnology.jp`, `ren@nostechnology.jp`, and
`mio@nostechnology.jp` after the four employee beta accounts are present.

## Employee Login

The beta login screen uses a staff dropdown instead of email entry. The seeded
accounts are:

- `浦田 和真` - host/admin
- `大崎 雄介` - host/admin
- `橋迫 翔太` - employee
- `渡邉 駿` - employee

All accounts start with password `0000`. On first login, each employee must set
their own password. Passwords can later be changed from `/settings`.

## GitHub Check

`Nos OS CI` builds the `nos-os` app on GitHub when files under `nos-os/**`
change. A green CI run means the pushed branch can compile before it is connected
to the employee preview host.

## In-App Preview Status

Open `/test` after deploying. It shows:

- whether OpenAI is configured,
- whether Supabase public and service keys are present,
- whether the app is still using demo data,
- the first workflows employees should try,
- how testers should report feedback.

The `/api/health` endpoint returns only safe booleans and labels. It does not
return API keys or secret values.

The beta is ready for employee testing when `/api/health` returns
`employeePreviewReady: true`, `dataMode: "supabase"`, and `blockers: []`.
