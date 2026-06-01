# Nos OS DB Table Definition

The canonical executable SQL lives in `supabase/schema.sql`. This document is a
human-readable table map for Phase1.

| Table | Purpose | Key Columns |
| --- | --- | --- |
| `users` | Auth identity, role, and employment status | `id`, `email`, `role`, `employment_type`, `auth_provider` |
| `employees` | Staff profile and leave/attendance summary | `user_id`, `name`, `position`, `department`, `bio`, `leave_balance_days` |
| `customers` | Client companies and contacts | `name`, `company`, `email`, `phone` |
| `projects` | Project records | `customer_id`, `primary_owner_id`, `secondary_owner_id`, `status`, `budget`, `due_date` |
| `project_members` | Many-to-many employee assignment | `project_id`, `employee_id`, `role` |
| `tasks` | Task management and daily scheduling | `project_id`, `primary_assignee_id`, `title`, `priority`, `status`, `due_date`, `estimated_minutes`, `scheduled_start`, `scheduled_end`, `ai_priority_score` |
| `task_assignees` | Multiple task assignees | `task_id`, `employee_id` |
| `task_comments` | Task comments and discussion | `task_id`, `author_user_id`, `body` |
| `emails` | Phase2 Gmail-linked messages | `project_id`, `customer_id`, `gmail_message_id`, `subject`, `ai_urgency` |
| `attendance_logs` | Work clock events | `employee_id`, `event_type`, `recorded_at`, `source` |
| `leave_requests` | Paid leave tracking | `employee_id`, `start_date`, `end_date`, `days`, `status` |
| `notifications` | In-app and push notifications | `user_id`, `type`, `title`, `body`, `read_at` |
| `ai_summaries` | AI-generated analysis and recommendations | `target_type`, `target_id`, `summary`, `score` |
| `activity_logs` | Audit trail | `actor_user_id`, `action`, `entity_type`, `entity_id`, `metadata` |
| `goals` | Weekly/monthly/quarterly/yearly employee goals | `employee_id`, `period`, `title`, `status`, `progress` |
| `skills` | Skill catalog | `name`, `category` |
| `employee_skills` | Employee skill levels | `employee_id`, `skill_id`, `level` |

## Enums

- User role: `admin`, `employee`, `sales`, `part_time`
- Employment type: `full_time`, `part_time`, `contractor`
- Project status: `pre_order`, `hearing`, `proposal`, `production`,
  `customer_review`, `revision`, `final_review`, `delivered`, `maintenance`,
  `completed`
- Task priority: `urgent`, `high`, `normal`, `low`, `hold`
- Task status: `todo`, `in_progress`, `review`, `done`
- Attendance status/event: `clock_in`, `break_start`, `break_end`, `out`,
  `return`, `meeting`, `clock_out`, `absent`
- Goal period: `week`, `month`, `quarter`, `year`

## Audit Policy

Phase1 writes audit-ready activity records through the domain repository shape.
Phase2 should add database triggers for critical tables and row-level security
policies based on `users.role` and employee ownership.
