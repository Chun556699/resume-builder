"use client";

import React, { useEffect, useRef, useState } from "react";
import { useResumeStore } from "@/store/resumeStore";
import { useUiT } from "@/lib/useUiT";

// 在预览区框选文字后出现的局部样式工具栏
export default function SelectionToolbar() {
  const [pos, setPos] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });
  const [color, setColor] = useState("#c2410c");
  const accentColor = useResumeStore((s) => s.accentColor);
  const L = useUiT();

  useEffect(() => {
    const update = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setPos((s) => (s.visible ? { ...s, visible: false } : s));
        return;
      }
      const anchor = sel.anchorNode;
      const node = anchor?.nodeType === 1 ? (anchor as HTMLElement) : anchor?.parentElement;
      const root = document.getElementById("resume-preview-root");
      if (!root || !node || !root.contains(node)) {
        setPos((s) => (s.visible ? { ...s, visible: false } : s));
        return;
      }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setPos((s) => (s.visible ? { ...s, visible: false } : s));
        return;
      }
      setPos({ x: rect.left + rect.width / 2, y: rect.top, visible: true });
    };
    document.addEventListener("selectionchange", update);
    document.addEventListener("mouseup", update);
    return () => {
      document.removeEventListener("selectionchange", update);
      document.removeEventListener("mouseup", update);
    };
  }, []);

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
  };

  const wrapSelection = (style: string) => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    try {
      const span = document.createElement("span");
      span.style.cssText = style;
      const frag = range.extractContents();
      span.appendChild(frag);
      range.insertNode(span);
      sel.removeAllRanges();
    } catch {
      /* 跨节点复杂选区时忽略 */
    }
  };

  const applyFontSize = (delta: number) => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
    const anchor = sel.anchorNode;
    const el = anchor?.nodeType === 1 ? (anchor as HTMLElement) : anchor?.parentElement;
    const cur = parseFloat(getComputedStyle(el as Element).fontSize) || 14;
    const next = Math.max(8, Math.min(40, Math.round(cur + delta)));
    wrapSelection(`font-size:${next}px`);
  };

  // 把框选的技术栈术语打成方块标签（半高亮 chip）
  const applyTag = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
    const text = sel.toString().trim();
    if (!text) return;
    const bg = `${accentColor}1a`; // ~10% 透明度底色
    const bd = `${accentColor}66`; // ~40% 透明度边框
    wrapSelection(`display:inline-block;padding:1px 7px;margin:0 2px;border:1px solid ${bd};border-radius:5px;background:${bg};color:${accentColor};`);
  };

  if (!pos.visible) return null;

  const btn = "flex h-7 w-7 items-center justify-center rounded text-sm text-gray-700 transition hover:bg-gray-100";

  return (
    <div
      className="fixed z-[9999] flex items-center gap-0.5 rounded-lg border border-gray-200 bg-white px-1 py-1 shadow-lg"
      style={{ left: pos.x, top: Math.max(8, pos.y - 44), transform: "translateX(-50%)" }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <button className={`${btn} font-bold`} title={L.stBold} onMouseDown={() => exec("bold")}>B</button>
      <button className={`${btn} italic`} title={L.stItalic} onMouseDown={() => exec("italic")}>I</button>
      <button className={`${btn} underline`} title={L.stUnderline} onMouseDown={() => exec("underline")}>U</button>
      <button className={btn} title={L.stSmaller} onMouseDown={() => applyFontSize(-1)}>A−</button>
      <button className={btn} title={L.stLarger} onMouseDown={() => applyFontSize(1)}>A+</button>
      <button
        className="flex h-7 min-w-[28px] items-center justify-center rounded px-1 text-gray-700 transition hover:bg-gray-100"
        title={L.stTag}
        onMouseDown={applyTag}
      >
        <span
          style={{
            display: "inline-block",
            padding: "0 4px",
            border: `1px solid ${accentColor}`,
            borderRadius: 3,
            color: accentColor,
            background: `${accentColor}1a`,
            fontSize: 10,
            lineHeight: "14px",
          }}
        >
          {L.stTagChar}
        </span>
      </button>
      <label className={`${btn} cursor-pointer`} title={L.stColor}>
        <span className="text-xs font-bold" style={{ color }}>A</span>
        <input
          type="color"
          value={color}
          onChange={(e) => { setColor(e.target.value); exec("foreColor", e.target.value); }}
          className="h-0 w-0 overflow-hidden"
        />
      </label>
      <button className={`${btn} text-xs`} title={L.stClear} onMouseDown={() => exec("removeFormat")}>✕</button>
    </div>
  );
}
