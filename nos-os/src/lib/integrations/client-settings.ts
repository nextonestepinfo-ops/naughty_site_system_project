"use client";

export type ClientIntegrationSettings = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

const publicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publicSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const clientIntegrationDefaults: ClientIntegrationSettings = {
  supabaseUrl: publicSupabaseUrl,
  supabaseAnonKey: publicSupabaseAnonKey,
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
      supabaseUrl: parsed.supabaseUrl?.trim() ? parsed.supabaseUrl : clientIntegrationDefaults.supabaseUrl,
      supabaseAnonKey: parsed.supabaseAnonKey?.trim() ? parsed.supabaseAnonKey : clientIntegrationDefaults.supabaseAnonKey,
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

export function maskSecret(value: string) {
  if (!value) return "未設定";
  if (value.length <= 10) return "保存済み";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}
