"use client";

import { toPng, toJpeg } from "html-to-image";
import { ResumeData } from "@/types/resume";

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportJson(data: ResumeData, name: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  downloadBlob(blob, `${name || "简历"}-数据.json`);
}

export async function exportImage(
  node: HTMLElement,
  name: string,
  format: "png" | "jpeg" = "png"
) {
  const options = {
    cacheBust: true,
    pixelRatio: 4,
    backgroundColor: "#ffffff",
    width: node.offsetWidth,
    height: node.offsetHeight,
  };
  const dataUrl =
    format === "png" ? await toPng(node, options) : await toJpeg(node, options);
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `${name || "简历"}.${format}`;
  a.click();
}

export function printResume() {
  window.print();
}

export function filenameFromName(name: string) {
  // 富文本可能含内联 HTML，导出文件名时去掉标签
  const clean = (name || "")
    .replace(/<[^>]*>/g, "")
    .replace(/[\\/:*?"<>|]/g, "_")
    .trim();
  return clean || "简历";
}
