# iOS / Siri Task Intent Roadmap

## 方針

NOS OS を iOS アプリ化する場合、Siri / Shortcuts / Spotlight 連携は App Intents と App Shortcuts を前提にする。
タスク操作は Web 画面だけに閉じず、将来の iOS 側から同じ API を呼べる粒度で保つ。

## App Entities

- Task: 小タスク。`id`, `title`, `projectId`, `sourceBranchTitle`, `primaryAssigneeId`, `status`, `dueDate` を持つ。
- Project: 案件。タスクの所属先。
- Employee: 担当者。Siri で「浦田のタスク」のように解決する対象。
- GoalTreeBranch: 大タスク。目標ツリーから生まれた小タスクの親文脈。

## App Intents 候補

- ShowTodayTasks: 今日やるタスクを表示する。
- CreateTask: 案件と担当者を指定してタスクを作成する。
- CompleteTask: タスクを完了にする。
- DeleteTask: タスクを削除する。必ず確認を入れる。
- SplitTask: 大きい作業を小タスク案に分解する。
- AskTaskAdvisor: 増やす、減らす、分解する候補をAIに相談する。

## 現在のWeb APIとの対応

- `GET /api/tasks`: タスク一覧。案件、大タスク、担当者の文脈を返す。
- `POST /api/tasks`: タスク作成。
- `PATCH /api/tasks/[id]`: 状態変更、担当者変更、内容変更。
- `DELETE /api/tasks/[id]`: タスク削除。
- `POST /api/ai/secretary`: AI相談。現時点では提案だけ返し、DB操作は実行しない。

## 安全ルール

- AIは勝手に削除・完了・作成を確定しない。
- 追加、削除、完了などデータが変わる操作は、ユーザー確認後に実行する。
- iOSアプリ側に Supabase service role key や OpenAI API key を入れない。
- iOS側はユーザー認証済みAPIを呼び、サーバー側API routeがDBとAIを扱う。

## 設計メモ

今後 iOS に移すときは、Webの画面名ではなく「操作」で切り出す。
たとえば「タスク画面を開く」ではなく「今日のタスクを取得」「タスクを完了」「タスク削除候補を確認」のように設計すると、Siri / Shortcuts / App Intents に載せやすい。
