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

export const useAppStore = create<AppStore>((set) => ({
  session: null,
  hydrated: false,
  hydrateSession: () => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(storageKey);
    set({ session: raw ? (JSON.parse(raw) as User) : null, hydrated: true });
  },
  setSession: (user) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, JSON.stringify(user));
    }
    set({ session: user, hydrated: true });
  },
  logout: () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(storageKey);
    }
    set({ session: null, hydrated: true });
  },
}));

