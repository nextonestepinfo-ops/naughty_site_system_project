import type { SecretaryReply } from "@/lib/types";
import { askSecretaryWithClaude } from "@/lib/integrations/claude";
import { askSecretaryWithOpenAI } from "@/lib/integrations/openai";
import { localSecretaryReply } from "@/lib/integrations/secretary-local";

type SecretaryProvider = "openai" | "anthropic" | "claude" | "local" | "auto";

function getProvider(): SecretaryProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase();
  if (provider === "anthropic" || provider === "claude" || provider === "local" || provider === "auto") {
    return provider;
  }
  return "openai";
}

export async function askSecretary(input: { message: string; context?: string }): Promise<SecretaryReply> {
  const provider = getProvider();

  if (provider === "local") return localSecretaryReply(input.message);

  if (provider === "auto") {
    if (process.env.OPENAI_API_KEY) return askSecretaryWithOpenAI(input);
    if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_MODEL) return askSecretaryWithClaude(input);
    return localSecretaryReply(input.message);
  }

  if (provider === "anthropic" || provider === "claude") {
    return askSecretaryWithClaude(input);
  }

  return askSecretaryWithOpenAI(input);
}
