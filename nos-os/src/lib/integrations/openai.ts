import type { SecretaryReply } from "@/lib/types";
import { cleanOpenAIEnvValue, resolveOpenAIApiKey, resolveOpenAIModel } from "@/lib/integrations/openai-config";
import { buildSecretaryInput, localSecretaryReply, secretaryInstructions } from "@/lib/integrations/secretary-local";

const openaiEndpoint = "https://api.openai.com/v1/responses";
const defaultModel = "gpt-5.4-mini";

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
}): Promise<SecretaryReply> {
  const message = input.message.trim();
  if (!message) return localSecretaryReply(message);

  const apiKey = resolveOpenAIApiKey(process.env.OPENAI_API_KEY);
  const model = resolveOpenAIModel(process.env.OPENAI_MODEL, defaultModel);
  if (!apiKey) return localSecretaryReply(message);

  const maxOutputTokens = numericEnv("OPENAI_MAX_OUTPUT_TOKENS", 520);
  const reasoningEffort = cleanOpenAIEnvValue(process.env.OPENAI_REASONING_EFFORT);
  const textVerbosity = cleanOpenAIEnvValue(process.env.OPENAI_TEXT_VERBOSITY);
  const body: Record<string, unknown> = {
    model,
    instructions: secretaryInstructions,
    input: buildSecretaryInput({ message, context: input.context }),
    max_output_tokens: maxOutputTokens,
  };

  if (reasoningEffort) {
    body.reasoning = { effort: reasoningEffort };
  }

  if (textVerbosity) {
    body.text = { verbosity: textVerbosity };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  const organizationId = process.env.OPENAI_ORGANIZATION_ID;
  const projectId = process.env.OPENAI_PROJECT_ID;

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
