"use client";

import React from "react";
import { ResumeData, TemplateId, PaperSize, FontFamily, AvatarShape } from "@/types/resume";
import { downloadBlob, filenameFromName } from "./export";

export async function exportPdf(
  data: ResumeData,
  template: TemplateId,
  accentColor: string,
  fontSize: number,
  paperSize: PaperSize,
  fontFamily: FontFamily,
  showAvatar: boolean,
  avatarShape: AvatarShape,
  avatarSize: number,
  sectionOrder: string[]
) {
  // 动态导入，减小首屏体积
  const { pdf } = await import("@react-pdf/renderer");
  const { ResumePdfDocument } = await import("@/components/pdf/ResumePdf");
  const { ensureFontsRegistered } = await import("@/components/pdf/fonts");

  ensureFontsRegistered();

  const element = React.createElement(ResumePdfDocument, {
    data,
    template,
    accentColor,
    fontSize,
    paperSize,
    fontFamily,
    showAvatar,
    avatarShape,
    avatarSize,
    sectionOrder,
  });

  // ResumePdfDocument 内部渲染 <Document>，此处类型与 pdf() 的 DocumentProps 泛型不完全匹配，安全地断言
  const blob = await pdf(element as any).toBlob();
  downloadBlob(blob, `${filenameFromName(data.personal.fullName)}_简历.pdf`);
  return true;
}
