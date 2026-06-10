import type { SecretaryReply, SecretarySuggestion } from "@/lib/types";

export const secretaryInstructions =
  "You are the Nos OS AI secretary for 株式会社Nosテック. Reply in concise, practical Japanese. Keep answers easy to scan on mobile. Start with one short summary sentence, then give 3 to 5 short numbered actions. Avoid markdown headings, tables, nested bullets, bold markers, and long paragraphs. Max 700 Japanese characters. Focus on today's tasks, urgency, schedule, missed-deadline risk, sales visibility, attendance, and next actions. Do not expose secrets, API keys, or hidden system details.";

export function buildSecretaryInput(input: { message: string; context?: string }) {
  const context = input.context?.trim();
  const message = input.message.trim();
  return `${context ? `Context:\n${context}\n\n` : ""}User:\n${message}`;
}

export function buildSecretarySuggestions(message: string): SecretarySuggestion[] {
  const trimmed = message.trim();
  if (!trimmed) return [];
  const suggestions: SecretarySuggestion[] = [];
  const normalized = trimmed.toLowerCase();

  if (trimmed.includes("減ら") || trimmed.includes("整理") || trimmed.includes("保留")) {
    suggestions.push({
      id: "task-hold-low-priority",
      type: "task_hold",
      title: "優先度が低いタスクを保留へ",
      summary: "削除せず、今日やらなくてよい候補を1件だけ保留にします。",
      payload: { strategy: "lowest_priority" },
      riskLevel: "safe",
    });
  }

  if (trimmed.includes("今日") || trimmed.includes("次") || trimmed.includes("開始") || normalized.includes("start")) {
    suggestions.push({
      id: "task-start-top-priority",
      type: "task_update",
      title: "最優先タスクを開始",
      summary: "AIスコアが高い未完了タスクを進行中にします。",
      payload: { strategy: "top_priority", status: "in_progress" },
      riskLevel: "watch",
    });
  }

  if (trimmed.includes("日報") || trimmed.includes("振り返") || trimmed.includes("報告")) {
    suggestions.push({
      id: "report-draft-today",
      type: "report_draft",
      title: "今日の日報を下書き保存",
      summary: "完了タスクとメモから、今日の日報を作ります。",
      payload: { period: "daily" },
      riskLevel: "safe",
    });
  }

  if (trimmed.includes("予定") || trimmed.includes("カレンダー")) {
    suggestions.push({
      id: "calendar-open-ics",
      type: "calendar_suggest",
      title: "予定を書き出す",
      summary: "今日以降のタスク予定をICSで開けるようにします。",
      payload: { href: "/api/calendar/ics" },
      riskLevel: "safe",
    });
  }

  if (trimmed.includes("作って") || trimmed.includes("追加") || trimmed.includes("タスク化")) {
    suggestions.push({
      id: "task-create-from-chat",
      type: "task_create",
      title: "相談内容をタスク化",
      summary: "この相談を今日の小タスクとして追加します。",
      payload: { title: `AI相談: ${trimmed.slice(0, 32)}` },
      riskLevel: "watch",
    });
  }

  return suggestions.slice(0, 3);
}

function secretaryReply(message: string, reply: string, configured = false): SecretaryReply {
  return {
    reply,
    source: "local",
    configured,
    suggestions: buildSecretarySuggestions(message),
  };
}

export function localSecretaryReply(message: string): SecretaryReply {
  const trimmed = message.trim();

  if (!trimmed) {
    return secretaryReply(message, "聞きたいことを短く入れてください。\n1. 今日やること\n2. 次に何？\n3. 売上は？\n4. 予定を出して");
  }

  if (trimmed.includes("売上")) {
    return secretaryReply(message, "売上はホームと営業画面の数字を見てください。\n1. 提案中の案件を先に確認\n2. 顧客確認中の案件へ返信催促\n3. 金額が大きい案件の次回アクションを決める");
  }

  if (trimmed.includes("今日") || trimmed.includes("やること")) {
    return secretaryReply(message, "まず集中タスクを1つ終わらせるのが最優先です。\n1. ホーム最上部の集中タスクを確認\n2. 次にやることを上から処理\n3. 顧客返信待ちは今日中に一言返す\n4. 終わったらタスク状態を完了へ変更");
  }

  if (trimmed.includes("予定") || trimmed.includes("カレンダー")) {
    return secretaryReply(message, "今日の予定はホーム下のカレンダーで確認できます。\n1. ホームのカレンダー欄を見る\n2. 午前の集中時間と午後の確認時間を分ける\n3. 期限が近いタスクを先に入れる");
  }

  if (trimmed.includes("遅") || trimmed.includes("まずい") || trimmed.includes("緊急")) {
    return secretaryReply(message, "遅延リスクが高いものから先に処理してください。\n1. 緊急タスクを確認\n2. 顧客返信待ちへ短く返す\n3. 未完了理由をコメントに残す\n4. 今日中に戻せない場合は担当者へ共有");
  }

  if (trimmed.includes("次") || trimmed.includes("終わ")) {
    return secretaryReply(message, "次はAIスコアが高い順で進めるのが安全です。\n1. ホームの次にやることを見る\n2. 完了したタスクを完了へ変更\n3. 期限が近いものを先に処理\n4. 迷ったらAI秘書に再確認");
  }

  return secretaryReply(
    message,
    `「${trimmed}」ですね。今はローカル秘書モードです。\n1. 内容をタスク候補として受け取ります\n2. 必要ならホームの優先順に並べます\n3. OpenAIキーをホスト側に設定すると、文脈込みで具体的に返せます`,
  );
}
