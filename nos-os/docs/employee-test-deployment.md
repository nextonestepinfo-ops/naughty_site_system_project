# Employee Test Deployment

## Current URLs

- Local test app: `http://localhost:3100`
- Local task screen: `http://localhost:3100/tasks`
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
4. Add environment variables from `nos-os/.env.example`.
5. Deploy and share the Vercel preview URL with employees.

## Required Environment Variables

Set these in the deployment host, not in GitHub source files:

```text
AI_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
OPENAI_MAX_OUTPUT_TOKENS=520
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

For a lightweight employee test, OpenAI and Supabase can be added first.
Google OAuth can wait until login is moved from demo users to production auth.

## Supabase Reality Check

Supabase project settings and connection testing exist in the app, and
`supabase/schema.sql` is the intended database schema. The task/project APIs
still use the local mock repository today. Before employees rely on shared data,
replace the mock repository in this order:

1. `users` and `employees`
2. `projects`, `project_members`, and `customers`
3. `tasks` and `task_comments`
4. `attendance_logs`, `leave_requests`, and `notifications`
5. Row Level Security and audit logs

Until that migration is done, a deployed preview is useful for UI testing,
workflow feedback, role review, and AI secretary testing, but not for durable
multi-employee task data.

## GitHub Check

`Nos OS CI` builds the `nos-os` app on GitHub when files under `nos-os/**`
change. A green CI run means the pushed branch can compile before it is connected
to the employee preview host.

