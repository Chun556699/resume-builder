"use client";

import { ResumeData } from "@/types/resume";
import { extractJson } from "@/lib/ai";
import { uid } from "@/lib/utils";

// 将任意文件（图片 / PDF）转换为可送 OCR 的 base64 图片列表
export async function fileToImages(file: File): Promise<string[]> {
  if (file.type.startsWith("image/")) {
    return [await readAsDataUrl(file)];
  }

  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return await pdfToImages(file);
  }

  // 兜底：尝试按图片读取
  return [await readAsDataUrl(file)];
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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

// 归一化 OCR 返回的 JSON 为 ResumeData
export function normalizeImportedResume(json: any): ResumeData {
  const empty: ResumeData = {
    personal: { fullName: "", jobTitle: "", email: "", phone: "", location: "", website: "", avatar: "", summary: "" },
    experiences: [], education: [], projects: [], skills: [], customSections: [],
  };
  if (!json || typeof json !== "object") return empty;

  const p = json.personal || {};
  empty.personal = {
    fullName: String(p.fullName || ""),
    jobTitle: String(p.jobTitle || ""),
    email: String(p.email || ""),
    phone: String(p.phone || ""),
    location: String(p.location || ""),
    website: String(p.website || ""),
    avatar: "",
    summary: String(p.summary || ""),
  };

  const arr = (x: any) => (Array.isArray(x) ? x : []);
  empty.experiences = arr(json.experiences).map((x: any) => ({
    id: uid("exp"), company: String(x.company || ""), position: String(x.position || ""),
    location: String(x.location || ""), startDate: String(x.startDate || ""),
    endDate: String(x.endDate || ""), current: !!x.current, description: String(x.description || ""),
  }));
  empty.education = arr(json.education).map((x: any) => ({
    id: uid("edu"), school: String(x.school || ""), degree: String(x.degree || ""),
    major: String(x.major || ""), startDate: String(x.startDate || ""),
    endDate: String(x.endDate || ""), description: String(x.description || ""),
  }));
  empty.projects = arr(json.projects).map((x: any) => ({
    id: uid("proj"), name: String(x.name || ""), role: String(x.role || ""),
    link: String(x.link || ""), startDate: String(x.startDate || ""),
    endDate: String(x.endDate || ""), description: String(x.description || ""),
  }));

  // skills 可能是字符串数组，也可能是 {name, items}
  const skills = arr(json.skills);
  if (skills.length > 0) {
    if (typeof skills[0] === "string") {
      empty.skills = [{ id: uid("skill"), name: "专业技能", items: skills.join(", ") }];
    } else {
      empty.skills = skills.map((x: any) => ({
        id: uid("skill"),
        name: String(x.name || "技能"),
        items: Array.isArray(x.items) ? x.items.join(", ") : String(x.items || ""),
      }));
    }
  }

  empty.customSections = arr(json.customSections).map((x: any) => ({
    id: uid("custom"), title: String(x.title || ""), content: String(x.content || ""), images: [],
  }));

  return empty;
}

// 调用服务端 OCR 接口
export async function ocrResume(images: string[]): Promise<ResumeData> {
  const resp = await fetch("/api/ocr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ images }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error || "OCR 识别失败");
  if (!data?.content) throw new Error("OCR 未返回内容");
  const json = extractJson(data.content);
  if (!json) throw new Error("OCR 结果无法解析为结构化数据");
  return normalizeImportedResume(json);
}
