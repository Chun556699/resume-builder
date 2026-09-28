"use client";

import React from "react";
import { toCanvas } from "html-to-image";
import { ResumeData, TemplateId, PaperSize, CnFontFamily, EnFontFamily, AvatarShape } from "@/types/resume";
import { resumeT, type ResumeLang } from "@/lib/resumeI18n";
import { getPaper } from "@/lib/paper";
import { downloadBlob, filenameFromName } from "./export";

/**
 * PDF 导出，两种模式：
 *
 * - "ats"（默认）：优先 react-pdf 矢量模板，导出内容为**真实文本层**，
 *   招聘系统（ATS）可以精确提取姓名、经历、技能等简历内容；预览不可用时
 *   这是唯一可用路径（移动端）。
 * - "image"：对「在线预览的真实 DOM」逐页栅格化生成 PDF，保证与预览
 *   所见即所得，但内容是图片、无法被 ATS 解析。仅作为显式的高保真选项。
 *
 * - 单栏模板：预览里每个 `.resume-page` 就是一页 A4，逐个截取后拼成 PDF。
 * - 双栏模板（无 .resume-page）：把整个预览按 A4 高度切片成多页。
 */
export type PdfExportMode = "ats" | "image";

export async function exportPdf(
  data: ResumeData,
  template: TemplateId,
  accentColor: string,
  fontSize: number,
  paperSize: PaperSize,
  cnFontFamily: CnFontFamily,
  enFontFamily: EnFontFamily,
  showAvatar: boolean,
  avatarShape: AvatarShape,
  avatarSize: number,
  sectionOrder: string[],
  lang: ResumeLang,
  mode: PdfExportMode = "ats"
) {
  const root = typeof document !== "undefined" ? document.getElementById("resume-preview-root") : null;
  const previewVisible = Boolean(root && root.offsetWidth > 0);

  if (mode === "ats") {
    // 矢量文本版优先；预览可见且矢量失败时才回退图片版（保证总能导出）
    try {
      return await exportPdfVector(data, template, accentColor, fontSize, paperSize, cnFontFamily, enFontFamily, showAvatar, avatarShape, avatarSize, sectionOrder, lang);
    } catch (e) {
      console.warn("矢量 PDF 导出失败，回退图片版：", e);
      if (!previewVisible) throw e;
      await exportPdfFromDom(data, paperSize, root!, lang);
      return true;
    }
  }

  // 图片版：所见即所得优先
  if (previewVisible) {
    try {
      await exportPdfFromDom(data, paperSize, root!, lang);
      return true;
    } catch (e) {
      console.warn("DOM 栅格化导出失败，回退矢量模板：", e);
    }
  }
  return exportPdfVector(data, template, accentColor, fontSize, paperSize, cnFontFamily, enFontFamily, showAvatar, avatarShape, avatarSize, sectionOrder, lang);
}

// PDF 元数据：帮助 ATS 与文件系统识别文档
function pdfMetadata(data: ResumeData) {
  return {
    title: `${data.personal.fullName || "简历"}${data.personal.jobTitle ? `_${data.personal.jobTitle}` : ""}_求职简历`,
    author: data.personal.fullName || undefined,
    subject: data.personal.jobTitle || undefined,
    keywords: [
      data.personal.jobTitle,
      ...data.skills.slice(0, 5).map((s) => s.name),
    ]
      .filter(Boolean)
      .join(","),
  };
}

async function exportPdfFromDom(data: ResumeData, paperSize: PaperSize, root: HTMLElement, lang: ResumeLang) {
  const PIXEL_RATIO = 2; // 2 倍图：清晰且文件体积适中
  const paper = getPaper(paperSize);

  const pageEls = Array.from(root.querySelectorAll<HTMLElement>(".resume-page")).filter((el) => el.offsetWidth > 0);
  const imageDataUrls: string[] = [];

  if (pageEls.length > 0) {
    // 单栏：每个 .resume-page 即一页
    for (const el of pageEls) {
      const canvas = await toCanvas(el, {
        pixelRatio: PIXEL_RATIO,
        backgroundColor: "#ffffff",
        style: { boxShadow: "none", margin: "0" }, // 去掉展示用的阴影/外边距
      });
      imageDataUrls.push(canvas.toDataURL("image/png"));
    }
  } else {
    // 双栏：整块截取后按 A4 高度切片
    const canvas = await toCanvas(root, {
      pixelRatio: PIXEL_RATIO,
      backgroundColor: "#ffffff",
      style: { boxShadow: "none" },
    });
    const dw = canvas.width;
    const dph = Math.round(paper.height * PIXEL_RATIO);
    const total = canvas.height;
    const n = Math.max(1, Math.ceil(total / dph));
    for (let i = 1; i <= n; i++) {
      const c = document.createElement("canvas");
      c.width = dw;
      c.height = dph;
      const ctx = c.getContext("2d");
      if (!ctx) continue;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, dw, dph);
      const srcY = (i - 1) * dph;
      const srcH = Math.min(dph, total - srcY);
      ctx.drawImage(canvas, 0, srcY, dw, srcH, 0, 0, dw, srcH);
      imageDataUrls.push(c.toDataURL("image/png"));
    }
  }

  if (imageDataUrls.length === 0) throw new Error("未截取到任何预览内容");

  const { pdf } = await import("@react-pdf/renderer");
  const { Document, Page, Image } = await import("@react-pdf/renderer");

  // 预览用 px(96dpi)，PDF 用 pt(72dpi)：换算到 pt 作为页面与图片尺寸
  const pageW = paper.width * 0.75;
  const pageH = paper.height * 0.75;

  const pages = imageDataUrls.map((url, i) =>
    React.createElement(
      Page,
      { key: i, size: [pageW, pageH] as any, style: { margin: 0, padding: 0 } },
      React.createElement(Image, {
        src: url,
        style: { width: pageW, height: pageH, objectFit: "contain" },
      })
    )
  );
  const doc = React.createElement(
    Document,
    { ...pdfMetadata(data) },
    pages
  );

  const blob = await pdf(doc as any).toBlob();
  downloadBlob(blob, `${filenameFromName(data.personal.fullName)}_${resumeT(lang).resumeWord}.pdf`);
}

// 矢量文本版：react-pdf 模板，内容为可选中的真实文本（ATS 友好）
async function exportPdfVector(
  data: ResumeData,
  template: TemplateId,
  accentColor: string,
  fontSize: number,
  paperSize: PaperSize,
  cnFontFamily: CnFontFamily,
  enFontFamily: EnFontFamily,
  showAvatar: boolean,
  avatarShape: AvatarShape,
  avatarSize: number,
  sectionOrder: string[],
  lang: ResumeLang
) {
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
    cnFontFamily,
    enFontFamily,
    showAvatar,
    avatarShape,
    avatarSize,
    sectionOrder,
    lang,
  });

  const blob = await pdf(element as any).toBlob();
  downloadBlob(blob, `${filenameFromName(data.personal.fullName)}_${resumeT(lang).resumeWord}.pdf`);
  return true;
}
