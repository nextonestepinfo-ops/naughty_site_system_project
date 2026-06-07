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

- Replace demo tasks with actual 株式会社Nosテック tasks.
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
- Add `OPENAI_API_KEY` to `.env.local`, restart, and confirm replies are no
  longer marked as local fallback.

## 6. Revenue View

- Decide whether sales should be personal, team, or company-wide.
- Replace demo project budgets and statuses with real values.
- Confirm whether target, forecast, and pipeline are enough for daily use.

## 7. Goal Tree Operation

- Confirm the three layers: company tree, today's tree, personal tree.
- Decide whether employees can edit only personal/daily trees or also suggest company branches.
- Confirm which tree tasks should immediately become task records.
- Replace in-memory goal tree data with Supabase persistence before relying on it across restarts.

## 8. API Connection Order

1. OpenAI API key for the secretary.
2. Supabase Auth and PostgreSQL.
3. Google OAuth.
4. Google Calendar export/import hardening.
5. Google Sheets attendance sync.
6. Whisper voice confirmation flow.
7. Gmail parsing and task candidates.
