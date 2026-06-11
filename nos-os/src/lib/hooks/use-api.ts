"use client";

import { useQuery, type QueryKey } from "@tanstack/react-query";
import { useMemo } from "react";
import type { ApiEnvelope } from "@/lib/types";
import { useAppStore } from "@/lib/store/app-store";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  const payload = (await response.json()) as ApiEnvelope<T>;
  return payload.data;
}

export function useScopedPath(path: string, extra?: Record<string, string | undefined>) {
  return useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(extra ?? {}).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const query = params.toString();
    return `${path}${query ? `?${query}` : ""}`;
  }, [extra, path]);
}

export function useScopedQuery<T>(key: QueryKey, path: string, extra?: Record<string, string | undefined>) {
  const session = useAppStore((state) => state.session);
  const scopedPath = useScopedPath(path, extra);
  return useQuery({
    queryKey: [...key, scopedPath],
    queryFn: () => apiFetch<T>(scopedPath),
    enabled: Boolean(session),
  });
}
