"use client";

import React, { useEffect, useRef, useState } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  style?: React.CSSProperties;
  as?: "span" | "div";
  placeholder?: string;
}

// 存储：换行用 \n，局部样式用内联 HTML 标签（<b>/<i>/<u>/<span style>/<font>）
// 展示：\n → <br>；提交：<br>/<div> → \n
const toHtml = (v: string) => (v || "").replace(/\n/g, "<br>");
const fromHtml = (html: string) =>
  html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<div[^>]*>/gi, "\n")
    .replace(/<\/div>/gi, "")
    .replace(/<p[^>]*>/gi, "\n")
    .replace(/<\/p>/gi, "")
    .replace(/&nbsp;/gi, " ");

export default function InlineEditable({
  value,
  onChange,
  className,
  style,
  as = "div",
  placeholder,
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const [focused, setFocused] = useState(false);
  const Tag = as as any;

  // 仅在非聚焦时用外部值同步 DOM，避免打断用户输入
  useEffect(() => {
    const el = ref.current;
    if (el && !focused && el.innerHTML !== toHtml(value)) {
      el.innerHTML = toHtml(value);
    }
  }, [value, focused]);

  const handleBlur = () => {
    setFocused(false);
    const el = ref.current;
    if (el) {
      const html = el.innerHTML;
      const text = fromHtml(html).replace(/\n+$/, "");
      const isEmpty = text.trim() === "";
      const next = isEmpty ? "" : fromHtml(html);
      if (next !== value) onChange(next);
    }
  };

  return (
    <Tag
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-placeholder={placeholder}
      className={`outline-none focus:ring-2 focus:ring-brand-300 focus:ring-offset-1 rounded-sm min-w-[1ch] ${className || ""}`}
      style={{ cursor: "text", ...style }}
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
          (e.target as HTMLElement).blur();
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (as === "div") {
            document.execCommand("insertLineBreak");
          } else {
            (e.target as HTMLElement).blur();
          }
        }
      }}
    />
  );
}
