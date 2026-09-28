"use client";

import { useUiStore } from "@/store/uiStore";
import { uiT, type UiStrings } from "@/lib/uiI18n";

/** 组件内取当前界面文案（订阅 uiLang 变化自动重渲染） */
export function useUiT(): UiStrings {
  const uiLang = useUiStore((s) => s.uiLang);
  return uiT(uiLang);
}
