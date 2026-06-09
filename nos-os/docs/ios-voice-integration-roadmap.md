# iOS Voice Integration Roadmap

NOS OS は、まず Web / PWA で社員テスト版を固め、次に iOS アプリ化します。大きな設計変更を避けるため、タスク操作は画面固有の処理ではなく、サーバー側 API と共通ドメインモデルに寄せます。

## 現時点の方針

- タスク追加、保留、削除、分解、担当変更、期限変更は `/api/tasks/assistant-plan` で実行前プランを作る。
- 実際の反映は既存の `/api/tasks` と `/api/tasks/[id]` に集約する。
- iOS アプリは同じ API を呼ぶ。Web 画面だけに業務ロジックを閉じ込めない。
- 音声は最初は Web Speech / スマホキーボード音声入力で十分。iOS 化後に Siri / Shortcuts を足す。

## Apple 連携の候補

- App Intents: タスク作成、今日のタスク確認、タスク完了、保留、期限変更を iOS 側の Intent として定義する。
- App Shortcuts: 「今日のNOSタスク」「NOSにタスク追加」「NOSの次の作業」などを Shortcuts / Siri / Spotlight から起動できるようにする。
- Spotlight / Widgets: 今日の優先タスク、期限超過、進行中タスクを検索やウィジェットに出す。
- Web Push / PWA: iOS アプリ前でも、ホーム画面追加した Web アプリにバックグラウンド通知を送れる土台を使う。

## 今後守る設計ルール

- タスク操作の入力は自然文でも、最終的には `create / update / delete` の明確なアクション配列に変換する。
- すべてのタスクに、できるだけ `projectId`、`primaryAssigneeId`、`sourceGoalTreeId`、`sourceBranchId` を持たせる。
- AI が直接DBを書き換えず、必ず「提案 -> 人が確認 -> APIで反映」の流れにする。
- 削除は危険なので、音声の「減らして」は原則 `priority: hold` に変換し、「削除」と明示された時だけ削除候補にする。
- iOS 側でも同じ安全ルールを使う。

## 参考

- App Intents: https://developer.apple.com/documentation/appintents
- Creating your first app intent: https://developer.apple.com/documentation/appintents/creating-your-first-app-intent
- App Shortcuts: https://developer.apple.com/documentation/appintents/app-shortcuts
- Web Push notifications: https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers
