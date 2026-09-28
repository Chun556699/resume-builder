"use client";

import { ResumeData } from "@/types/resume";
import { extractJson } from "@/lib/ai";
import { normalizeResumePayload } from "@/lib/normalizeResume";
import { useAuthStore } from "@/store/authStore";

// 导入载荷：文本模式（文字版 PDF，精确解析）或图片模式（截图/扫描件，走视觉识别）
export interface ImportPayload {
  text?: string;
  images?: string[];
}

// 文本模式的最小长度：低于该值的 PDF 视为扫描件，回退图片识别
const MIN_TEXT_CHARS = 200;

// 将任意文件（图片 / PDF）转换为可送识别的载荷
// - 文字版 PDF（BOSS直聘、智联招聘、前程无忧、猎聘、LinkedIn 等导出件多为文字版）
//   直接提取内嵌文本，内容零失真；
// - 扫描/图片型 PDF 与图片文件走视觉识别。
export async function fileToImportPayload(file: File): Promise<ImportPayload> {
  if (file.type.startsWith("image/")) {
    return { images: [await readAsDataUrl(file)] };
  }

  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    try {
      const text = await pdfToText(file);
      if (text.replace(/\s+/g, "").length >= MIN_TEXT_CHARS) {
        return { text };
      }
    } catch (e) {
      console.warn("PDF 文本提取失败，回退图片识别：", e);
    }
    return { images: await pdfToImages(file) };
  }

  // 兜底：尝试按图片读取
  return { images: [await readAsDataUrl(file)] };
}

// 兼容旧调用：仅需要图片列表时使用
export async function fileToImages(file: File): Promise<string[]> {
  const payload = await fileToImportPayload(file);
  if (payload.images?.length) return payload.images;
  return [];
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 提取 PDF 内嵌文本（按页拼接，行间以换行还原）
async function pdfToText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const pages: string[] = [];
  const maxPages = Math.min(doc.numPages, 6);
  for (let i = 1; i <= maxPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let lastY: number | null = null;
    let pageText = "";
    for (const item of content.items) {
      if (!("str" in item)) continue;
      const y = (item as { transform?: number[] }).transform?.[5] ?? null;
      // y 坐标变化视为换行，尽量还原原始行结构
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) {
        pageText += "\n";
      } else if (pageText && !pageText.endsWith(" ") && !pageText.endsWith("\n")) {
        pageText += " ";
      }
      pageText += item.str;
      if (y !== null) lastY = y;
    }
    pages.push(pageText.trim());
  }
  return pages.filter(Boolean).join("\n\n");
}

async function pdfToImages(file: File): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const pages: string[] = [];
  const maxPages = Math.min(doc.numPages, 4);
  for (let i = 1; i <= maxPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    await page.render({ canvasContext: ctx, viewport }).promise;
    pages.push(canvas.toDataURL("image/png"));
  }
  return pages;
}

// 调用服务端识别接口（文本或图片）
export async function ocrResume(payload: ImportPayload | string[]): Promise<ResumeData> {
  const body = typeof payload === "string" ? { images: payload } : payload;
  const token = useAuthStore.getState().token;
  const resp = await fetch("/api/ocr", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (!resp.ok) {
    const err = new Error(data?.error || "简历识别失败");
    (err as any).code = data?.code;
    throw err;
  }
  if (!data?.content) throw new Error("识别结果为空");
  const json = extractJson(data.content);
  if (!json) throw new Error("识别结果无法解析为结构化数据");
  return normalizeResumePayload(json);
}
