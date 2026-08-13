"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ResumeData, TemplateId, PaperSize, FontFamily, AvatarShape } from "@/types/resume";
import { sampleResume } from "@/data/sample";
import { buildSectionOrder } from "@/lib/utils";

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
  fontFamily: FontFamily;
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
  setFontFamily: (f: FontFamily) => void;
  setPaperSize: (p: PaperSize) => void;
  setLineHeight: (n: number) => void;
  setShowAvatar: (v: boolean) => void;
  setAvatarShape: (s: AvatarShape) => void;
  setAvatarSize: (n: number) => void;
  setSectionOrder: (order: string[]) => void;
  loadSample: () => void;
}

// 归一化旧版本持久化数据，确保新增字段存在，避免运行时报错
function normalizeResumeData(d: any): ResumeData {
  const src = d || {};
  const randId = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;
  return {
    personal: {
      fullName: "",
      jobTitle: "",
      email: "",
      phone: "",
      location: "",
      website: "",
      avatar: "",
      summary: "",
      ...(src.personal || {}),
    },
    experiences: Array.isArray(src.experiences) ? src.experiences : [],
    education: Array.isArray(src.education) ? src.education : [],
    projects: Array.isArray(src.projects) ? src.projects : [],
    skills: Array.isArray(src.skills) ? src.skills : [],
    customSections: Array.isArray(src.customSections)
      ? src.customSections.map((c: any) => ({
          id: c?.id || randId("custom"),
          title: c?.title || "",
          content: c?.content || "",
          images: Array.isArray(c?.images) ? c.images : [],
        }))
      : [],
  };
}

export const useResumeStore = create<ResumeState>()(
  persist(
    (set) => ({
      data: sampleResume,
      template: "classic",
      accentColor: "#1f4df5",
      fontSize: 14,
      fontFamily: "sans",
      paperSize: "A4",
      lineHeight: 1.6,
      showAvatar: true,
      avatarShape: "circle",
      avatarSize: 88,
      sectionOrder: DEFAULT_SECTION_ORDER,
      setData: (data) => set({ data }),
      updateData: (updater) =>
        set((state) => {
          const draft = structuredClone(state.data);
          updater(draft);
          return { data: draft };
        }),
      setTemplate: (template) => set({ template }),
      setAccentColor: (accentColor) => set({ accentColor }),
      setFontSize: (fontSize) => set({ fontSize }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setPaperSize: (paperSize) => set({ paperSize }),
      setLineHeight: (lineHeight) => set({ lineHeight }),
      setShowAvatar: (showAvatar) => set({ showAvatar }),
      setAvatarShape: (avatarShape) => set({ avatarShape }),
      setAvatarSize: (avatarSize) => set({ avatarSize }),
      setSectionOrder: (sectionOrder) => set({ sectionOrder }),
      loadSample: () => set({ data: JSON.parse(JSON.stringify(sampleResume)) }),
    }),
    {
      name: "resume-builder-storage",
      merge: (persistedState, currentState) => {
        const p = (persistedState || {}) as Partial<ResumeState>;
        const merged = { ...currentState, ...p } as ResumeState;
        merged.data = normalizeResumeData((p as any)?.data ?? (currentState as any).data);
        merged.sectionOrder = buildSectionOrder(merged.data, (p as any)?.sectionOrder);
        return merged;
      },
    }
  )
);
