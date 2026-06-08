# Nos OS Usage Guide

This is the short operating guide for managers and employees.

## First Setup For Admins

1. Open the deployed Nos OS URL.
2. Login as `うらた`.
3. Open `設定`.
4. Check `AI秘書`.
5. If it says `サーバー未設定`, add `OPENAI_API_KEY` to the host environment.
6. Run `AI接続テスト`.

API keys are managed by the host, such as Vercel. Do not paste API keys into
employee browsers, chat, GitHub, screenshots, or documents.

## Daily Flow For Managers

1. Open `ホーム`.
2. Check today's priority tasks and calendar.
3. Open `タスク` and confirm overdue or high-priority work.
4. Open `案件` and check active project status.
5. Open `営業素材` for sales/demo material.
6. Open `社員` when assigning or reviewing work.
7. Open `設定` or `テスト` when checking system readiness.

Managers should use the goal tree and task list together:

- Company goals decide the big direction.
- Daily goals decide what must move today.
- Personal goals become individual tasks.

## Daily Flow For Employees

1. Open `ホーム` at the start of the day.
2. Look at the top task first.
3. Check `次にやること`.
4. Use the calendar section to see today's rough schedule.
5. Open `タスク` and update task status.
6. Ask `AI秘書` when unsure what to do next.
7. Use `勤怠` for attendance checks.

Good AI secretary prompts:

- `今日やること`
- `次に何？`
- `売上は？`
- `予定を出して`
- `遅れているものは？`

## AI Secretary

The AI secretary is shared through the server.

- Employees do not need API keys.
- The browser sends only the message and app context.
- The server uses `OPENAI_API_KEY`.
- If OpenAI is not configured, the app still replies with local fallback.

In the assistant panel:

- `OpenAI` means the real API answered.
- `Local` means fallback mode.

## Current Preview Limits

Nos OS is usable for internal testing, but some parts are still preview mode.

- Task/project data is still demo or in-memory until Supabase is fully connected.
- Google OAuth is not production-ready yet.
- Google Sheets attendance sync is still a placeholder.
- OpenAI works only after `OPENAI_API_KEY` is added to the host.

## What To Report During Testing

When someone finds a problem, report:

1. Which page they were on.
2. What they expected.
3. What actually happened.
4. Whether it was on PC or phone.
5. Screenshot if possible, without API keys or private secrets.
