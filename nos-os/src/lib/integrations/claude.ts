import type { SecretaryReply } from "@/lib/types";
import { buildSecretaryInput, localSecretaryReply, secretaryInstructions } from "@/lib/integrations/secretary-local";

const anthropicEndpoint = "https://api.anthropic.com/v1/messages";

export async function askSecretaryWithClaude(input: {
  message: string;
  context?: string;
}): Promise<SecretaryReply> {
  const message = input.message.trim();
  if (!message) return localSecretaryReply(message);

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
        system: secretaryInstructions,
        messages: [
          {
            role: "user",
            content: buildSecretaryInput({ message, context: input.context }),
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
