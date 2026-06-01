import type { SecretaryReply } from "@/lib/types";

export const secretaryInstructions =
  "You are the Nos OS AI secretary for NosTechnology. Reply in concise, practical Japanese. Focus on today's tasks, urgency, schedule, missed-deadline risk, sales visibility, attendance, and next actions. Do not expose secrets, API keys, or hidden system details.";

export function buildSecretaryInput(input: { message: string; context?: string }) {
  const context = input.context?.trim();
  const message = input.message.trim();
  return `${context ? `Context:\n${context}\n\n` : ""}User:\n${message}`;
}

export function localSecretaryReply(message: string): SecretaryReply {
  const trimmed = message.trim();

  if (!trimmed) {
    return {
      reply: "聞きたいことを短く入れてください。例: 今日やること、次に何、売上は、予定を出して。",
      source: "local",
      configured: false,
    };
  }

  if (trimmed.includes("売上")) {
    return {
      reply: "売上はホームの売上メーターを見てください。提案中と顧客確認中の案件を先に追うと、今月の見込みを戻しやすいです。",
      source: "local",
      configured: false,
    };
  }

  if (trimmed.includes("今日") || trimmed.includes("やること")) {
    return {
      reply: "まずホーム最上部の集中タスクを1つ終わらせてください。その次に「次にやること」の上から処理すると、期限・優先度・顧客返信待ちの取りこぼしを減らせます。",
      source: "local",
      configured: false,
    };
  }

  if (trimmed.includes("予定") || trimmed.includes("カレンダー")) {
    return {
      reply: "ホームのカレンダー出力ボタンから今日の予定をicsで出せます。iPhoneカレンダーやGoogleカレンダーに取り込めます。",
      source: "local",
      configured: false,
    };
  }

  if (trimmed.includes("遅") || trimmed.includes("まずい") || trimmed.includes("緊急")) {
    return {
      reply: "遅延リスクが高い順に、ホームの集中タスクと緊急タスクを先に見てください。顧客返信待ちがあるものは今日中に一言返すだけでもリスクが下がります。",
      source: "local",
      configured: false,
    };
  }

  if (trimmed.includes("次") || trimmed.includes("終わ")) {
    return {
      reply: "次はAIスコアが高い順に、ホームの「次にやること」を見てください。終わったタスクは状態を完了にすると並び替わります。",
      source: "local",
      configured: false,
    };
  }

  return {
    reply: `「${trimmed}」ですね。今はローカル秘書モードなので、タスク化や並び替えの候補として受け取ります。OpenAIキーを入れると、文脈込みで具体的に返せます。`,
    source: "local",
    configured: false,
  };
}
