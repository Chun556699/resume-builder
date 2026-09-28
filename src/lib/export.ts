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
  const node = document.getElementById("resume-preview-root") as HTMLElement | null;
  if (!node) {
    window.print();
    return;
  }

  // 把预览克隆到独立 iframe 中打印：预览区可能处于 transform 缩放容器内
  // （ScaledPreview），直接 window.print() 会打出空白或错位的页面。
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
  document.body.appendChild(iframe);

  const idoc = iframe.contentDocument;
  if (!idoc) {
    iframe.remove();
    window.print();
    return;
  }

  // 复制页面样式（Tailwind 产物与全局样式），保证简历排版与预览一致
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((el) => {
    idoc.head.appendChild(el.cloneNode(true));
  });

  const clone = node.cloneNode(true) as HTMLElement;
  // 去掉编辑态属性，打印纯内容
  clone.querySelectorAll("[contenteditable]").forEach((el) => {
    el.removeAttribute("contenteditable");
    el.removeAttribute("spellcheck");
  });
  idoc.body.style.cssText = "margin:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;";
  idoc.body.appendChild(clone);

  const idocWindow = iframe.contentWindow;
  if (!idocWindow) {
    iframe.remove();
    window.print();
    return;
  }

  // 打印结束后移除 iframe（afterprint 兜底一个延时，避免个别浏览器不触发）
  let removed = false;
  const cleanup = () => {
    if (removed) return;
    removed = true;
    setTimeout(() => iframe.remove(), 300);
  };
  idocWindow.addEventListener("afterprint", cleanup);
  window.addEventListener("afterprint", cleanup);
  setTimeout(cleanup, 120_000);

  const doPrint = () => {
    try {
      idocWindow.focus();
      idocWindow.print();
    } catch (e) {
      console.warn("iframe 打印失败，回退整页打印：", e);
      iframe.remove();
      window.print();
    }
  };

  // 等待样式表与字体在 iframe 中应用完成后再调起打印
  if (idoc.readyState === "complete") {
    setTimeout(doPrint, 300);
  } else {
    iframe.onload = () => setTimeout(doPrint, 300);
  }
}

export function filenameFromName(name: string) {
  // 富文本可能含内联 HTML，导出文件名时去掉标签
  const clean = (name || "")
    .replace(/<[^>]*>/g, "")
    .replace(/[\\/:*?"<>|]/g, "_")
    .trim();
  return clean || "简历";
}
