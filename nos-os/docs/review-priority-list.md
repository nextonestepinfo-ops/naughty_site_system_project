# Nos OS Review Priority List

Use this list tomorrow morning to decide what to adjust first.

## 1. Daily Mobile Flow

- Open `http://localhost:3100` on iPhone width.
- Login as `urata@nostechnology.jp`.
- Check whether the first screen immediately answers:
  - What should I do now?
  - What should I do next?
  - What happens if I miss it?
  - Can I export today's schedule?

## 2. Task Reality Check

- Replace demo tasks with actual NosTechnology tasks.
- Confirm whether AI score ordering feels correct.
- Adjust `deadline 40 / priority 30 / customer waiting 20 / delay risk 10` if the top task feels wrong.

## 3. Permission Model

- In Employees, switch a user between `管理者`, `一般社員`, `営業`, and `バイト`.
- Confirm who should see:
  - all projects,
  - only assigned projects,
  - customers and sales numbers,
  - employee profiles.

## 4. Calendar Workflow

- Tap `カレンダー出力`.
- Import the `.ics` into iPhone Calendar or Google Calendar.
- Confirm time blocks, task titles, and descriptions are useful.

## 5. Voice And Secretary

- Tap the secretary character.
- Try: `今日やること`, `次に何？`, `売上は？`, `予定を出して`.
- On mobile, test browser speech input and keyboard dictation.

## 6. Revenue View

- Decide whether sales should be personal, team, or company-wide.
- Replace demo project budgets and statuses with real values.
- Confirm whether target, forecast, and pipeline are enough for daily use.

## 7. API Connection Order

1. Supabase Auth and PostgreSQL.
2. Google OAuth.
3. Google Calendar export/import hardening.
4. Google Sheets attendance sync.
5. OpenAI/Whisper task assistant.
6. Gmail parsing and task candidates.

