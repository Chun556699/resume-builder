"use client";

import React, { useState } from "react";
import { useResumeStore } from "@/store/resumeStore";

type StyleAction = "bold" | "size+" | "size-" | "color" | "clear";

const MODULES = [
  { key: "summary", label: "个人简介" },
  { key: "experience", label: "工作经历" },
  { key: "project", label: "项目经历" },
  { key: "education", label: "教育经历" },
  { key: "skill", label: "专业技能" },
  { key: "custom", label: "自定义模块" },
];

// 给一段富文本应用样式（外层包裹）
function applyStyle(html: string, action: StyleAction, color: string, baseSize: number): string {
  if (!html) return html;
  const plain = html.replace(/<[^>]*>/g, "");
  if (!plain.trim()) return html;
  switch (action) {
    case "bold":
      return `<b>${html}</b>`;
    case "size+":
      return `<span style="font-size:${baseSize + 3}px">${html}</span>`;
    case "size-":
      return `<span style="font-size:${Math.max(8, baseSize - 3)}px">${html}</span>`;
    case "color":
      return `<span style="color:${color}">${html}</span>`;
    case "clear":
      return html
        .replace(/<span[^>]*>/g, "")
        .replace(/<\/span>/g, "")
        .replace(/<b>/g, "")
        .replace(/<\/b>/g, "")
        .replace(/<i>/g, "")
        .replace(/<\/i>/g, "")
        .replace(/<u>/g, "")
        .replace(/<\/u>/g, "");
    default:
      return html;
  }
}

export default function BatchStylePanel() {
  const { data, updateData, fontSize } = useResumeStore();
  const [selected, setSelected] = useState<Set<string>>(new Set(["summary"]));
  const [color, setColor] = useState("#c2410c");

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => (prev.size === MODULES.length ? new Set() : new Set(MODULES.map((m) => m.key))));
  };

  const run = (action: StyleAction) => {
    updateData((d) => {
      if (selected.has("summary")) d.personal.summary = applyStyle(d.personal.summary, action, color, fontSize);
      if (selected.has("experience")) d.experiences.forEach((x) => { x.description = applyStyle(x.description, action, color, fontSize); });
      if (selected.has("project")) d.projects.forEach((x) => { x.description = applyStyle(x.description, action, color, fontSize); });
      if (selected.has("education")) d.education.forEach((x) => { x.description = applyStyle(x.description, action, color, fontSize); });
      if (selected.has("skill")) d.skills.forEach((x) => { x.items = applyStyle(x.items, action, color, fontSize); });
      if (selected.has("custom")) d.customSections.forEach((x) => { x.content = applyStyle(x.content, action, color, fontSize); });
    });
  };

  const actionBtn = "rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50";

  return (
    <div className="space-y-3 p-1">
      <p className="text-xs text-gray-500">勾选多个模块，一键同时应用样式（加粗 / 字号 / 颜色）。</p>

      {/* 模块多选 */}
      <div className="rounded-lg border border-gray-200 bg-white p-2">
        <label className="flex cursor-pointer items-center gap-2 border-b border-gray-100 pb-2 text-xs font-medium text-gray-700">
          <input type="checkbox" checked={selected.size === MODULES.length} onChange={toggleAll} />
          全选
        </label>
        <div className="mt-1.5 grid grid-cols-2 gap-1">
          {MODULES.map((m) => (
            <label key={m.key} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs text-gray-700 hover:bg-gray-50">
              <input type="checkbox" checked={selected.has(m.key)} onChange={() => toggle(m.key)} />
              {m.label}
            </label>
          ))}
        </div>
      </div>

      {/* 样式动作 */}
      <div className="rounded-lg border border-gray-200 bg-white p-2">
        <p className="mb-2 text-xs text-gray-500">已选 {selected.size} 个模块，应用：</p>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => run("bold")} className={`${actionBtn} font-bold`}>加粗</button>
          <button onClick={() => run("size+")} className={actionBtn}>字号 +</button>
          <button onClick={() => run("size-")} className={actionBtn}>字号 −</button>
          <label className={`${actionBtn} flex cursor-pointer items-center gap-1`}>
            <span style={{ color }}>A</span>
            颜色
            <input type="color" value={color} onChange={(e) => { setColor(e.target.value); run("color"); }} className="h-0 w-0 overflow-hidden" />
          </label>
          <button onClick={() => run("clear")} className={actionBtn}>清除格式</button>
        </div>
      </div>
    </div>
  );
}
