# PWA Push Setup

NOS OS は、アプリを開いている間の期限通知に加えて、VAPID 設定後に Web Push でバックグラウンド通知を送れます。

## 1. Supabase Migration

Supabase SQL editor で次を実行します。

```sql
-- nos-os/supabase/migrations/20260610_push_subscriptions.sql
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  user_agent text,
  delivered_notice_ids jsonb not null default '[]'::jsonb,
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create index if not exists idx_push_subscriptions_user on public.push_subscriptions(user_id);
create index if not exists idx_push_subscriptions_employee on public.push_subscriptions(employee_id);
```

## 2. VAPID Keys

ローカルで生成します。

```powershell
npx web-push generate-vapid-keys
```

Vercel の Production / Preview に入れます。

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@nos-tech.com
NOS_OS_CRON_SECRET=
```

## 3. Cron

`vercel.json` で毎朝 08:00 JST に `/api/cron/notifications` を実行します。
VAPID 未設定時は送信せず、既存の画面内通知だけが動きます。

## 4. Employee Test Flow

1. `/notifications` を開く。
2. `PWA通知` ボタンで通知許可を出す。
3. iPhone は共有メニューからホーム画面に追加する。
4. 翌朝、期限超過・本日期限・明日期限の件数を見る。
5. `開く` から対象タスクへ移動して、完了・保留・期限変更をする。
