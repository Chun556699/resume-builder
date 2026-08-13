"use client";

import React, { useState } from "react";
import { useResumeStore } from "@/store/resumeStore";
import { useUiStore } from "@/store/uiStore";
import { TemplateId, PaperSize, FontFamily } from "@/types/resume";
import { exportPdf } from "@/lib/pdfExport";
import { exportJson, exportImage, printResume, filenameFromName } from "@/lib/export";
import { PAPERS } from "@/lib/paper";
import { FONTS } from "@/lib/fonts";
import { Icon } from "@/components/Icon";

const TEMPLATES: { id: TemplateId; label: string }[] = [
  { id: "classic", label: "经典" },
  { id: "modern", label: "现代" },
  { id: "compact", label: "紧凑" },
  { id: "elegant", label: "优雅" },
  { id: "minimal", label: "极简" },
  { id: "sidebar", label: "侧栏" },
  { id: "timeline", label: "时间轴" },
  { id: "geek", label: "极客" },
];

const COLORS = ["#1f4df5", "#0f766e", "#b91c1c", "#7c3aed", "#c2410c", "#334155", "#be185d", "#ca8a04"];

export default function Toolbar() {
  const {
    data, template, setTemplate, accentColor, setAccentColor, fontSize, setFontSize,
    fontFamily, setFontFamily, paperSize, setPaperSize, lineHeight, setLineHeight,
    showAvatar, setShowAvatar, loadSample, sectionOrder, avatarShape, avatarSize,
  } = useResumeStore();
  const [exporting, setExporting] = useState<string>("");
  const [fitting, setFitting] = useState(false);
  const pageCount = useUiStore((s) => s.pageCount);

  const handleFitToPage = async () => {
    setFitting(true);
    try {
      let size = fontSize;
      let guard = 0;
      while (guard < 12 && useUiStore.getState().pageCount > 1 && size > 8) {
        size -= 1;
        setFontSize(size);
        await new Promise((r) => setTimeout(r, 220));
        guard++;
      }
      if (useUiStore.getState().pageCount > 1) {
        let lh = lineHeight;
        while (guard < 18 && useUiStore.getState().pageCount > 1 && lh > 1.05) {
          lh = Math.round((lh - 0.05) * 100) / 100;
          setLineHeight(lh);
          await new Promise((r) => setTimeout(r, 220));
          guard++;
        }
      }
    } finally {
      setFitting(false);
    }
  };

  const handlePdf = async () => {
    setExporting("pdf");
    try {
      await exportPdf(data, template, accentColor, fontSize, paperSize, fontFamily, showAvatar, avatarShape, avatarSize, sectionOrder);
    } catch (e: any) {
      alert("PDF 导出失败：" + (e?.message || e));
    } finally {
      setExporting("");
    }
  };

  const handleImage = async () => {
    const node = document.getElementById("resume-preview-root");
    if (!node) return alert("未找到预览区域");
    setExporting("png");
    try {
      await exportImage(node as HTMLElement, filenameFromName(data.personal.fullName), "png");
    } catch (e: any) {
      alert("图片导出失败：" + (e?.message || e));
    } finally {
      setExporting("");
    }
  };

  const btn = "rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50";
  const primary = "rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50";

  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-white px-3 py-2">
      <span className="flex items-center gap-1.5 text-base font-bold text-gray-900"><Icon name="file-text" size={18} /> AI 简历制作</span>
      <div className="mx-1 h-5 w-px bg-gray-200" />

      {/* 模板 */}
      <div className="flex items-center gap-1 rounded-md bg-gray-100 p-0.5">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => setTemplate(t.id)}
            className={`rounded px-2 py-1 text-xs transition ${template === t.id ? "bg-white font-semibold text-brand-600 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 纸张 */}
      <select value={paperSize} onChange={(e) => setPaperSize(e.target.value as PaperSize)} className="rounded-md border border-gray-300 px-1.5 py-1 text-xs outline-none" title="纸张格式">
        {PAPERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
      </select>

      {/* 字体 */}
      <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value as FontFamily)} className="rounded-md border border-gray-300 px-1.5 py-1 text-xs outline-none" title="字体">
        {FONTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
      </select>

      {/* 字号 */}
      <select value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="rounded-md border border-gray-300 px-1.5 py-1 text-xs outline-none" title="字号">
        {[10, 11, 12, 13, 14, 15, 16, 18].map((n) => <option key={n} value={n}>{n}px</option>)}
      </select>

      {/* 行高 */}
      <select value={lineHeight} onChange={(e) => setLineHeight(Number(e.target.value))} className="rounded-md border border-gray-300 px-1.5 py-1 text-xs outline-none" title="行高">
        {[1.15, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8, 2.0].map((n) => <option key={n} value={n}>{n}×</option>)}
      </select>

      {/* 主题色 */}
      <div className="flex items-center gap-1">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setAccentColor(c)}
            className={`h-5 w-5 rounded-full border-2 transition ${accentColor === c ? "scale-110 border-gray-800" : "border-transparent"}`}
            style={{ backgroundColor: c }}
            title={c}
          />
        ))}
      </div>

      {/* 头像显示开关 */}
      <label className="flex cursor-pointer items-center gap-1 text-xs text-gray-600">
        <input type="checkbox" checked={showAvatar} onChange={(e) => setShowAvatar(e.target.checked)} />
        头像
      </label>

      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <span className="hidden text-[11px] text-gray-400 md:inline">{pageCount} 页</span>
        <button onClick={handleFitToPage} disabled={fitting} className={btn} title="自动压缩字号/行高，尽量装进一页 A4">
          <span className="flex items-center gap-1"><Icon name="layout-grid" size={14} />{fitting ? "压缩中…" : "压缩到一页"}</span>
        </button>
        <button onClick={loadSample} className={btn}><span className="flex items-center gap-1"><Icon name="reload" size={14} />示例</span></button>
        <button onClick={() => exportJson(data, filenameFromName(data.personal.fullName))} className={btn}><span className="flex items-center gap-1"><Icon name="code" size={14} />JSON</span></button>
        <button onClick={handleImage} disabled={exporting === "png"} className={btn}><span className="flex items-center gap-1"><Icon name="photo" size={14} />{exporting === "png" ? "导出中…" : "PNG"}</span></button>
        <button onClick={printResume} className={btn}><span className="flex items-center gap-1"><Icon name="file-text" size={14} />打印</span></button>
        <button onClick={handlePdf} disabled={exporting === "pdf"} className={primary}><span className="flex items-center gap-1"><Icon name="download" size={14} />{exporting === "pdf" ? "生成中…" : "导出 PDF"}</span></button>
      </div>
    </header>
  );
}
