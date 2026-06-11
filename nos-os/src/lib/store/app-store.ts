"use client";

import { create } from "zustand";
import type { User } from "@/lib/types";

type AppStore = {
  session: User | null;
  hydrated: boolean;
  hydrateSession: () => void;
  setSession: (user: User) => void;
  logout: () => void;
};

const storageKey = "nos-os-session";

function getSessionStorage() {
  if (typeof window === "undefined" || !("localStorage" in window)) return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

async function fetchCookieSession() {
  const response = await fetch("/api/me");
  if (!response.ok) return null;
  const payload = (await response.json()) as { data?: { user?: User } };
  return payload.data?.user ?? null;
}

export const useAppStore = create<AppStore>((set) => ({
  session: null,
  hydrated: false,
  hydrateSession: () => {
    const storage = getSessionStorage();
    const raw = storage?.getItem(storageKey);
    if (!raw) {
      void fetchCookieSession()
        .then((user) => {
          if (user) storage?.setItem(storageKey, JSON.stringify(user));
          set({ session: user, hydrated: true });
        })
        .catch(() => set({ session: null, hydrated: true }));
      return;
    }
    try {
      const cached = JSON.parse(raw) as User;
      set({ session: cached, hydrated: true });
      void fetchCookieSession()
        .then((user) => {
          if (!user) {
            storage?.removeItem(storageKey);
            set({ session: null, hydrated: true });
            return;
          }
          storage?.setItem(storageKey, JSON.stringify(user));
          set({ session: user, hydrated: true });
        })
        .catch(() => undefined);
    } catch {
      storage?.removeItem(storageKey);
      set({ session: null, hydrated: true });
    }
  },
  setSession: (user) => {
    getSessionStorage()?.setItem(storageKey, JSON.stringify(user));
    set({ session: user, hydrated: true });
  },
  logout: () => {
    if (typeof window !== "undefined") {
      void fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    }
    getSessionStorage()?.removeItem(storageKey);
    set({ session: null, hydrated: true });
  },
}));
