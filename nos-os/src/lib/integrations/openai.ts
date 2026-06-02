import type { SecretaryReply } from "@/lib/types";
import { buildSecretaryInput, localSecretaryReply, secretaryInstructions } from "@/lib/integrations/secretary-local";

const openaiEndpoint = "https://api.openai.com/v1/responses";
const defaultModel = "gpt-5.4-mini";

export type OpenAIRuntimeConfig = {
  apiKey?: string;
  model?: string;
  maxOutputTokens?: number;
  reasoningEffort?: string;
  organizationId?: string;
  projectId?: string;
};

type OpenAIContentItem = {
  type?: string;
  text?: string;
};

type OpenAIOutputItem = {
  type?: string;
  content?: OpenAIContentItem[];
};

type OpenAIResponsePayload = {
  output_text?: string;
  output?: OpenAIOutputItem[];
};

function extractOpenAIText(payload: OpenAIResponsePayload) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if ((content.type === "output_text" || content.type === "text") && content.text?.trim()) {
        return content.text.trim();
      }
    }
  }

  return null;
}

function numericEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export async function askSecretaryWithOpenAI(input: {
  message: string;
  context?: string;
  config?: OpenAIRuntimeConfig;
}): Promise<SecretaryReply> {
  const message = input.message.trim();
  if (!message) return localSecretaryReply(message);

  const apiKey = input.config?.apiKey || process.env.OPENAI_API_KEY;
  const model = input.config?.model || process.env.OPENAI_MODEL || defaultModel;
  if (!apiKey) return localSecretaryReply(message);

  const maxOutputTokens = input.config?.maxOutputTokens || numericEnv("OPENAI_MAX_OUTPUT_TOKENS", 520);
  const reasoningEffort = input.config?.reasoningEffort?.trim() || process.env.OPENAI_REASONING_EFFORT?.trim();
  const body: Record<string, unknown> = {
    model,
    instructions: secretaryInstructions,
    input: buildSecretaryInput({ message, context: input.context }),
    max_output_tokens: maxOutputTokens,
  };

  if (reasoningEffort) {
    body.reasoning = { effort: reasoningEffort };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  const organizationId = input.config?.organizationId || process.env.OPENAI_ORGANIZATION_ID;
  const projectId = input.config?.projectId || process.env.OPENAI_PROJECT_ID;

  if (organizationId) {
    headers["OpenAI-Organization"] = organizationId;
  }

  if (projectId) {
    headers["OpenAI-Project"] = projectId;
  }

  try {
    const response = await fetch(openaiEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) return localSecretaryReply(message);

    const payload = (await response.json()) as OpenAIResponsePayload;
    const text = extractOpenAIText(payload);
    if (!text) return localSecretaryReply(message);

    return { reply: text, source: "openai", configured: true };
  } catch {
    return localSecretaryReply(message);
  }
}
