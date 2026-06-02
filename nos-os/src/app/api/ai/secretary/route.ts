import { NextResponse } from "next/server";
import { askSecretaryWithRuntimeConfig } from "@/lib/integrations/secretary";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const integrationSettings = typeof body.integrationSettings === "object" && body.integrationSettings !== null ? body.integrationSettings : {};
  const openai = typeof integrationSettings.openai === "object" && integrationSettings.openai !== null ? integrationSettings.openai : {};
  const provider = integrationSettings.aiProvider === "local" ? "local" : integrationSettings.aiProvider === "openai" ? "openai" : undefined;

  const data = await askSecretaryWithRuntimeConfig({
    message: String(body.message ?? ""),
    context: typeof body.context === "string" ? body.context : undefined,
    provider,
    openai: {
      apiKey: typeof openai.apiKey === "string" ? openai.apiKey : undefined,
      model: typeof openai.model === "string" ? openai.model : undefined,
      maxOutputTokens: Number(openai.maxOutputTokens) || undefined,
    },
  });
  return NextResponse.json({ data });
}
