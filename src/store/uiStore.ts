"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PayProduct } from "@/lib/pricing";
import type { UiLang } from "@/lib/uiI18n";

interface PayModalState {
  open: boolean;
  product: PayProduct;
}

interface UiState {
  pageCount: number;
  setPageCount: (n: number) => void;
  payModal: PayModalState;
  /** 打开购买弹窗（product：export=导出额度 / ai=AI 次卡） */
  openPay: (product: PayProduct) => void;
  closePay: () => void;
  /** 界面语言（编辑器/工具栏/弹窗文案）；与简历语言相互独立 */
  uiLang: UiLang;
  setUiLang: (l: UiLang) => void;
}

// 界面语言持久化；其余（页数、购买弹窗）保持会话级
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      pageCount: 1,
      setPageCount: (pageCount) => set({ pageCount }),
      payModal: { open: false, product: "export" },
      openPay: (product) => set({ payModal: { open: true, product } }),
      closePay: () => set((s) => ({ payModal: { ...s.payModal, open: false } })),
      uiLang: "zh",
      setUiLang: (uiLang) => set({ uiLang }),
    }),
    {
      name: "resume-ui-storage",
      storage: createJSONStorage(() => ({
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
      })),
      partialize: (s) => ({ uiLang: s.uiLang }) as UiState,
    }
  )
);

/** 非组件环境取当前界面文案（组件内请用 useUiStore 订阅渲染） */
export function currentUiLang(): UiLang {
  return useUiStore.getState().uiLang;
}
