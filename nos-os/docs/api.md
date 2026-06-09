# Nos OS API List

Phase1 route handlers return typed local data. They are intentionally shaped so
Supabase and Google integrations can replace the mock repository later. The AI
secretary already supports OpenAI via the server route when `OPENAI_API_KEY` is
set.

| Method | Path | Purpose | Role |
| --- | --- | --- | --- |
| `POST` | `/api/auth/login` | Demo login by email/provider/role | public |
| `POST` | `/api/auth/logout` | Clear current session | all |
| `GET` | `/api/me` | Current profile and permissions | all |
| `GET` | `/api/dashboard` | Role-aware dashboard summary | all |
| `GET` | `/api/daily-plan` | Employee-first daily plan, schedule, risk, revenue | all |
| `GET` | `/api/calendar/ics` | Download today's schedule as `.ics` calendar file | all |
| `GET` | `/api/calendar/tasks/:id/ics` | Download one task as `.ics` calendar file | all |
| `GET` | `/api/calendar/tasks/:id/google` | Open Google Calendar event creation for one task | all |
| `GET` | `/api/users` | User and permission list | admin |
| `PATCH` | `/api/users/:id/role` | Update role and employment status | admin |
| `GET` | `/api/employees` | Employee list | admin |
| `GET` | `/api/employees/:id` | Employee profile | admin/self |
| `GET` | `/api/projects` | Project list | all |
| `POST` | `/api/projects` | Create project | admin |
| `GET` | `/api/projects/:id` | Project detail | all |
| `PATCH` | `/api/projects/:id` | Update project | admin/owner |
| `DELETE` | `/api/projects/:id` | Delete project | admin |
| `GET` | `/api/tasks` | Task list with filters/sort | all |
| `POST` | `/api/tasks` | Create task | admin/owner |
| `POST` | `/api/tasks/assistant-plan` | Voice/text task planning with OpenAI/local safe fallback | all |
| `PATCH` | `/api/tasks/:id` | Update task | admin/assignee |
| `DELETE` | `/api/tasks/:id` | Delete task | admin |
| `POST` | `/api/tasks/:id/comments` | Add task comment | all |
| `GET` | `/api/customers` | Customer list | admin |
| `GET` | `/api/attendance` | Attendance history | admin/self |
| `POST` | `/api/attendance/clock` | Record attendance event | all |
| `GET` | `/api/leave` | Leave balance and requests | admin/self |
| `GET` | `/api/notifications` | Notification inbox | all |
| `PATCH` | `/api/notifications/:id/read` | Mark read | all |
| `POST` | `/api/notifications/push-subscription` | Save PWA push subscription | all |
| `GET` | `/api/ai/recommendations` | Priority-scored suggestions | all |
| `POST` | `/api/ai/secretary` | OpenAI-ready AI secretary chat with Claude/local fallback | all |
| `POST` | `/api/integrations/google-sheets/sync` | Phase1 placeholder sync | admin |

## Priority Score Formula

`score = deadline * 0.4 + priority * 0.3 + customer_wait * 0.2 + delay_risk * 0.1`

The UI sorts "today's must-do" cards by this score.
