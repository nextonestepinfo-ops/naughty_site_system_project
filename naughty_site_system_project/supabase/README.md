# NAUGHTY vNext Supabase Setup

## 目的

このフォルダは vNext MVP を本番データへ移すための土台です。
従業員画面ではメールアドレスを入力させず、管理画面で作った `login_id` を内部メール `login_id@naughty.local` に変換して Supabase Auth を使います。

## 初期セットアップ

1. Supabaseプロジェクトを作成する。
2. `schema.sql` を SQL Editor で実行する。
3. Edge Functions をデプロイする。
   - `create-employee`
   - `record-punch`
   - `public-site-data`
4. Functions に環境変数を設定する。
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

## アカウント作成

管理画面から以下を送ります。

- `loginId`
- `password`
- `displayName`
- `staffId`

`create-employee` は `loginId@naughty.local` の内部メールで Auth ユーザーを作り、`profiles` に `role = employee` と `staff_id` を保存します。
従業員には内部メールを表示しません。

## 勤怠

`record-punch` は固定QRの `code` を受け取り、ログイン中の従業員に紐づく `staff_id` で打刻します。

- 実打刻: `actual_at`
- 計算打刻: `rounded_at`
- 表示/計算時刻: `actual_time`, `rounded_time`
- 営業日: 朝5時締めで `business_date`
- 丸め: 15分単位で切り捨て

例:

- `19:07` -> `19:00`
- `02:14` -> `02:00`
- `02:15` -> `02:15`

## RLS方針

- 管理者: 全テーブル管理
- 従業員: 自分のプロフィール、勤怠、売上のみ参照/登録
- 公開サイト: 公開中の `gallery_items`, `events`, `shop_settings` を参照

## ローカルMVPとの関係

現時点の `04_site_rebuild`, `05_admin_system`, `06_employee_portal` は静的プレビューとして `localStorage` で動きます。
Supabase接続時は、既存のデータ項目名をこのスキーマへマッピングして差し替えます。
