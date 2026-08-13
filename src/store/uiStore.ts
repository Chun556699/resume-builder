"use client";

import { create } from "zustand";

interface UiState {
  pageCount: number;
  setPageCount: (n: number) => void;
}

// 非持久化的 UI 状态（用于“压缩到一页”等交互）
export const useUiStore = create<UiState>((set) => ({
  pageCount: 1,
  setPageCount: (pageCount) => set({ pageCount }),
}));
