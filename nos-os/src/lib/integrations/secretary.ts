import type { SecretaryReply } from "@/lib/types";
import { askSecretaryWithClaude } from "@/lib/integrations/claude";
import { resolveOpenAIApiKey } from "@/lib/integrations/openai-config";
import { askSecretaryWithOpenAI } from "@/lib/integrations/openai";
import { buildSecretarySuggestions, localSecretaryReply } from "@/lib/integrations/secretary-local";

type SecretaryProvider = "openai" | "anthropic" | "claude" | "local" | "auto";

function getProvider(): SecretaryProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase();
  if (provider === "anthropic" || provider === "claude" || provider === "local" || provider === "auto") {
    return provider;
  }
  return "openai";
}

function withSuggestions(reply: SecretaryReply, message: string): SecretaryReply {
  return {
    ...reply,
    suggestions: reply.suggestions?.length ? reply.suggestions : buildSecretarySuggestions(message),
  };
}

export async function askSecretary(input: { message: string; context?: string }): Promise<SecretaryReply> {
  const provider = getProvider();

  if (provider === "local") return localSecretaryReply(input.message);

  if (provider === "auto") {
    if (resolveOpenAIApiKey(process.env.OPENAI_API_KEY)) return withSuggestions(await askSecretaryWithOpenAI(input), input.message);
    if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_MODEL) return withSuggestions(await askSecretaryWithClaude(input), input.message);
    return localSecretaryReply(input.message);
  }

  if (provider === "anthropic" || provider === "claude") {
    return withSuggestions(await askSecretaryWithClaude(input), input.message);
  }

  return withSuggestions(await askSecretaryWithOpenAI(input), input.message);
}
