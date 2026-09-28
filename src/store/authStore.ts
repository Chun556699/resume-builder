"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { QuotaInfo } from "@/lib/quota";

export interface AuthUser {
  id: string;
  uid?: number; // 公开唯一短号（充值/客服对账用）；旧持久化数据可能缺失，refresh 后补齐
  username: string;
  quota: QuotaInfo;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setQuota: (quota: QuotaInfo) => void;
}

const safeStorage = createJSONStorage<AuthState>(() => ({
  getItem: (name) => {
    try {
      return typeof localStorage === "undefined" ? null : localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      /* ignore */
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
}));

async function api(path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `请求失败（${res.status}）`);
  }
  return data;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      loading: false,

      login: async (username, password) => {
        set({ loading: true });
        try {
          const data = await api("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ username, password }),
          });
          set({ token: data.token, user: data.user });
        } finally {
          set({ loading: false });
        }
      },

      register: async (username, password) => {
        set({ loading: true });
        try {
          const data = await api("/api/auth/register", {
            method: "POST",
            body: JSON.stringify({ username, password }),
          });
          set({ token: data.token, user: data.user });
        } finally {
          set({ loading: false });
        }
      },

      logout: async () => {
        const token = get().token;
        set({ token: null, user: null });
        if (token) {
          try {
            await fetch("/api/auth/logout", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            });
          } catch {
            /* ignore */
          }
        }
      },

      refresh: async () => {
        const token = get().token;
        if (!token) return;
        try {
          const data = await api("/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (data?.user) set({ user: data.user });
        } catch {
          // token 失效则清除
          set({ token: null, user: null });
        }
      },

      setQuota: (quota) => {
        const u = get().user;
        if (u) set({ user: { ...u, quota } });
      },
    }),
    {
      name: "resume-auth-storage",
      storage: safeStorage,
    }
  )
);
