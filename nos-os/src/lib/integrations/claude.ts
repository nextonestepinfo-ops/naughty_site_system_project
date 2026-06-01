import type { SecretaryReply } from "@/lib/types";

const anthropicEndpoint = "https://api.anthropic.com/v1/messages";

function localSecretaryReply(message: string): SecretaryReply {
  if (message.includes("売上")) {
    return {
      reply: "売上はホームの売上メーターを見てください。提案中と顧客確認中の案件を午前に追うのが効果的です。",
      source: "local",
      configured: false,
    };
  }
  if (message.includes("予定") || message.includes("カレンダー")) {
    return {
      reply: "ホームのカレンダー出力ボタンからicsを落とすと、iPhoneカレンダーやGoogleカレンダーに取り込めます。",
      source: "local",
      configured: false,
    };
  }
  if (message.includes("次") || message.includes("終わ")) {
    return {
      reply: "次はAIスコアが高い順に、今日画面の「次にやること」を見てください。終わったタスクは状態を完了にすると並び替わります。",
      source: "local",
      configured: false,
    };
  }
  return {
    reply: `「${message}」ですね。今はローカル秘書モードなので、タスク化や並び替えの候補として受け取ります。`,
    source: "local",
    configured: false,
  };
}

export async function askSecretaryWithClaude(input: {
  message: string;
  context?: string;
}): Promise<SecretaryReply> {
  const message = input.message.trim();
  if (!message) {
    return {
      reply: "聞きたいことを短く入れてください。例: 今日やること、次に何、売上は、予定を出して。",
      source: "local",
      configured: false,
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL;
  if (!apiKey || !model) return localSecretaryReply(message);

  try {
    const response = await fetch(anthropicEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 420,
        system:
          "You are Nos OS secretary. Reply in concise Japanese. Focus on daily tasks, urgency, schedule, sales, and next actions. Never expose secrets.",
        messages: [
          {
            role: "user",
            content: `${input.context ? `Context:\n${input.context}\n\n` : ""}User:\n${message}`,
          },
        ],
      }),
    });

    if (!response.ok) return localSecretaryReply(message);

    const payload = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const text = payload.content?.find((item) => item.type === "text")?.text?.trim();
    if (!text) return localSecretaryReply(message);
    return { reply: text, source: "claude", configured: true };
  } catch {
    return localSecretaryReply(message);
  }
}

