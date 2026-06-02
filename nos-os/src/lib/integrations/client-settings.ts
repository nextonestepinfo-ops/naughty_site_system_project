"use client";

export type ClientAiProvider = "openai" | "local";

export type ClientIntegrationSettings = {
  aiProvider: ClientAiProvider;
  openaiApiKey: string;
  openaiModel: string;
  openaiMaxOutputTokens: number;
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export const clientIntegrationDefaults: ClientIntegrationSettings = {
  aiProvider: "openai",
  openaiApiKey: "",
  openaiModel: "gpt-5.4-mini",
  openaiMaxOutputTokens: 520,
  supabaseUrl: "",
  supabaseAnonKey: "",
};

const storageKey = "nos-os-integration-settings";

export function getClientIntegrationSettings(): ClientIntegrationSettings {
  if (typeof window === "undefined") return clientIntegrationDefaults;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return clientIntegrationDefaults;
    const parsed = JSON.parse(raw) as Partial<ClientIntegrationSettings>;
    return {
      ...clientIntegrationDefaults,
      ...parsed,
      openaiMaxOutputTokens: Number(parsed.openaiMaxOutputTokens) || clientIntegrationDefaults.openaiMaxOutputTokens,
      aiProvider: parsed.aiProvider === "local" ? "local" : "openai",
    };
  } catch {
    return clientIntegrationDefaults;
  }
}

export function saveClientIntegrationSettings(settings: ClientIntegrationSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(settings));
}

export function clearClientIntegrationSettings() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(storageKey);
}

export function buildSecretaryIntegrationPayload(settings = getClientIntegrationSettings()) {
  return {
    aiProvider: settings.aiProvider,
    openai: {
      apiKey: settings.openaiApiKey.trim(),
      model: settings.openaiModel.trim(),
      maxOutputTokens: settings.openaiMaxOutputTokens,
    },
  };
}

export function maskSecret(value: string) {
  if (!value) return "未設定";
  if (value.length <= 10) return "保存済み";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}
