import type { SecretaryReply } from "@/lib/types";

export const secretaryInstructions =
  "You are the Nos OS AI secretary for 株式会社Nosテック. Reply in concise, practical Japanese. Keep answers easy to scan on mobile. Start with one short summary sentence, then give 3 to 5 short numbered actions. Avoid markdown headings, tables, nested bullets, bold markers, and long paragraphs. Max 700 Japanese characters. Focus on today's tasks, urgency, schedule, missed-deadline risk, sales visibility, attendance, and next actions. Do not expose secrets, API keys, or hidden system details.";

export function buildSecretaryInput(input: { message: string; context?: string }) {
  const context = input.context?.trim();
  const message = input.message.trim();
  return `${context ? `Context:\n${context}\n\n` : ""}User:\n${message}`;
}

export function localSecretaryReply(message: string): SecretaryReply {
  const trimmed = message.trim();

  if (!trimmed) {
    return {
      reply: "聞きたいことを短く入れてください。\n1. 今日やること\n2. 次に何？\n3. 売上は？\n4. 予定を出して",
      source: "local",
      configured: false,
    };
  }

  if (trimmed.includes("売上")) {
    return {
      reply: "売上はホームの売上メーターを見てください。\n1. 提案中の案件を先に確認\n2. 顧客確認中の案件へ返信催促\n3. 金額が大きい案件の次回アクションを決める",
      source: "local",
      configured: false,
    };
  }

  if (trimmed.includes("今日") || trimmed.includes("やること")) {
    return {
      reply: "まず集中タスクを1つ終わらせるのが最優先です。\n1. ホーム最上部の集中タスクを確認\n2. 次にやることを上から処理\n3. 顧客返信待ちは今日中に一言返す\n4. 終わったらタスク状態を完了へ変更",
      source: "local",
      configured: false,
    };
  }

  if (trimmed.includes("予定") || trimmed.includes("カレンダー")) {
    return {
      reply: "今日の予定はホームからカレンダー出力できます。\n1. ホームのカレンダー出力を押す\n2. icsファイルをiPhoneまたはGoogleカレンダーに取り込む\n3. 午前の集中時間と午後の確認時間を分ける",
      source: "local",
      configured: false,
    };
  }

  if (trimmed.includes("遅") || trimmed.includes("まずい") || trimmed.includes("緊急")) {
    return {
      reply: "遅延リスクが高いものから先に処理してください。\n1. 緊急タスクを確認\n2. 顧客返信待ちへ短く返す\n3. 未完了理由をコメントに残す\n4. 今日中に戻せない場合は担当者へ共有",
      source: "local",
      configured: false,
    };
  }

  if (trimmed.includes("次") || trimmed.includes("終わ")) {
    return {
      reply: "次はAIスコアが高い順で進めるのが安全です。\n1. ホームの次にやることを見る\n2. 完了したタスクを完了へ変更\n3. 期限が近いものを先に処理\n4. 迷ったら秘書に再確認",
      source: "local",
      configured: false,
    };
  }

  return {
    reply: `「${trimmed}」ですね。今はローカル秘書モードです。\n1. 内容をタスク候補として受け取ります\n2. 必要ならホームの優先順に並べます\n3. OpenAIキーを設定すると、文脈込みで具体的に返せます`,
    source: "local",
    configured: false,
  };
}
