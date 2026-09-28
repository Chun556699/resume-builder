"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { ResumeData, TemplateId, PaperSize, CnFontFamily, EnFontFamily, AvatarShape } from "@/types/resume";
import type { ResumeLang } from "@/lib/resumeI18n";
import { sampleResume, sampleResumeEn } from "@/data/sample";
import { useUiStore } from "@/store/uiStore";
import { buildSectionOrder } from "@/lib/utils";
import { normalizeResumeData } from "@/lib/normalizeResume";

export const DEFAULT_SECTION_ORDER = [
  "summary",
  "experience",
  "project",
  "education",
  "skill",
  "custom",
];

interface ResumeState {
  data: ResumeData;
  template: TemplateId;
  accentColor: string;
  fontSize: number;
  cnFontFamily: CnFontFamily;
  enFontFamily: EnFontFamily;
  lang: ResumeLang; // 简历成品语言（板块标题等固定文案）
  paperSize: PaperSize;
  lineHeight: number;
  showAvatar: boolean;
  avatarShape: AvatarShape;
  avatarSize: number;
  sectionOrder: string[];
  setData: (data: ResumeData) => void;
  updateData: (updater: (draft: ResumeData) => void) => void;
  setTemplate: (t: TemplateId) => void;
  setAccentColor: (c: string) => void;
  setFontSize: (n: number) => void;
  setCnFontFamily: (f: CnFontFamily) => void;
  setEnFontFamily: (f: EnFontFamily) => void;
  setLang: (l: ResumeLang) => void;
  setPaperSize: (p: PaperSize) => void;
  setLineHeight: (n: number) => void;
  setShowAvatar: (v: boolean) => void;
  setAvatarShape: (s: AvatarShape) => void;
  setAvatarSize: (n: number) => void;
  setSectionOrder: (order: string[]) => void;
  loadSample: () => void;
}

// 包装 localStorage，写入失败（如配额已满）时不再抛错中断应用，仅告警
const safeStorage = createJSONStorage<ResumeState>(() => ({
  getItem: (name: string) => {
    try {
      return typeof localStorage === "undefined" ? null : localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    try {
      localStorage.setItem(name, value);
    } catch (e) {
      console.warn("本地存储保存失败（可能已满）：请移除头像或自定义模块中的图片。", e);
    }
  },
  removeItem: (name: string) => {
    try {
      localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
}));

export const useResumeStore = create<ResumeState>()(
  persist(
    (set, get) => ({
      data: sampleResume,
      template: "classic",
      accentColor: "#1f4df5",
      fontSize: 14,
      cnFontFamily: "sans",
      enFontFamily: "auto",
      lang: "zh",
      paperSize: "A4",
      lineHeight: 1.6,
      showAvatar: true,
      avatarShape: "circle",
      avatarSize: 88,
      sectionOrder: DEFAULT_SECTION_ORDER,
      setData: (data) => set({ data }),
      updateData: (updater) =>
        set((state) => {
          const draft = JSON.parse(JSON.stringify(state.data)) as ResumeData;
          updater(draft);
          return { data: draft };
        }),
      setTemplate: (template) => set({ template }),
      setAccentColor: (accentColor) => set({ accentColor }),
      setFontSize: (fontSize) => set({ fontSize }),
      setCnFontFamily: (cnFontFamily) => set({ cnFontFamily }),
      setEnFontFamily: (enFontFamily) => set({ enFontFamily }),
      setLang: (lang) => set({ lang }),
      setPaperSize: (paperSize) => set({ paperSize }),
      setLineHeight: (lineHeight) => set({ lineHeight }),
      setShowAvatar: (showAvatar) => set({ showAvatar }),
      setAvatarShape: (avatarShape) => set({ avatarShape }),
      setAvatarSize: (avatarSize) => set({ avatarSize }),
      setSectionOrder: (sectionOrder) => set({ sectionOrder }),
      // 示例语言：界面英文或简历语言为英文时加载英文示例，并对齐简历语言（标题一致）
      loadSample: () => {
        const wantEn = useUiStore.getState().uiLang === "en" || get().lang === "en";
        set({
          data: JSON.parse(JSON.stringify(wantEn ? sampleResumeEn : sampleResume)),
          lang: wantEn ? "en" : "zh",
        });
      },
    }),
    {
      name: "resume-builder-storage",
      storage: safeStorage,
      merge: (persistedState, currentState) => {
        const raw = (persistedState || {}) as Partial<ResumeState> & { fontFamily?: string };
        const { fontFamily: legacyFont, ...p } = raw;
        const merged = { ...currentState, ...p } as ResumeState;
        // 旧版本只有单一 fontFamily，迁移为中文字体，英文字体跟随中文
        if (legacyFont && !p.cnFontFamily) {
          merged.cnFontFamily = legacyFont as CnFontFamily;
          merged.enFontFamily = "auto";
        }
        merged.data = normalizeResumeData((p as any)?.data ?? (currentState as any).data);
        merged.sectionOrder = buildSectionOrder(merged.data, (p as any)?.sectionOrder);
        return merged;
      },
    }
  )
);
