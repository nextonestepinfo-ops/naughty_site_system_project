import { createHash, randomUUID } from "crypto";

type Query = Record<string, string | number | boolean | undefined | null>;

export type SupabaseConfig = {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
};

export function isSupabaseDataMode() {
  return process.env.NOS_OS_DATA_MODE === "supabase";
}

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceRoleKey) return null;
  return { url, anonKey, serviceRoleKey };
}

export function stableUuid(input: string) {
  const hex = createHash("sha1").update(`nos-os:${input}`).digest("hex").slice(0, 32).split("");
  hex[12] = "5";
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20).join("")}`;
}

export function newUuid() {
  return randomUUID();
}

function queryString(query?: Query) {
  const params = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) params.set(key, String(value));
  });
  const raw = params.toString();
  return raw ? `?${raw}` : "";
}

export async function supabaseRest<T>(
  path: string,
  init: RequestInit & { query?: Query; prefer?: string; allowEmpty?: boolean } = {},
): Promise<T> {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("Supabase is not fully configured. NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are required.");
  }

  const response = await fetch(`${config.url}/rest/v1/${path}${queryString(init.query)}`, {
    ...init,
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(init.prefer ? { Prefer: init.prefer } : {}),
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase ${init.method ?? "GET"} ${path} failed: ${response.status} ${body}`);
  }

  if (init.allowEmpty || response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function selectRows<T>(table: string, query: Query = {}) {
  return supabaseRest<T[]>(table, { query: { select: "*", ...query } });
}

export async function selectOne<T>(table: string, query: Query = {}) {
  const rows = await selectRows<T>(table, { ...query, limit: 1 });
  return rows[0] ?? null;
}

export async function insertRows<T>(table: string, rows: unknown[]) {
  return supabaseRest<T[]>(table, {
    method: "POST",
    body: JSON.stringify(rows),
    prefer: "return=representation",
  });
}

export async function upsertRows<T>(table: string, rows: unknown[], onConflict: string) {
  return supabaseRest<T[]>(table, {
    method: "POST",
    query: { on_conflict: onConflict },
    body: JSON.stringify(rows),
    prefer: "resolution=merge-duplicates,return=representation",
  });
}

export async function patchRows<T>(table: string, query: Query, patch: Record<string, unknown>) {
  return supabaseRest<T[]>(table, {
    method: "PATCH",
    query,
    body: JSON.stringify(patch),
    prefer: "return=representation",
  });
}

export async function deleteRows(table: string, query: Query) {
  return supabaseRest<void>(table, {
    method: "DELETE",
    query,
    allowEmpty: true,
  });
}
