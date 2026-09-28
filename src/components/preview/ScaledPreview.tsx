"use client";

import React, { useLayoutEffect, useRef, useState } from "react";
import { useUiT } from "@/lib/useUiT";

// 将固定宽度的 A4 简历预览按容器宽度等比缩放，用于移动端适配。
// - 桌面端容器足够宽时 scale=1，内容水平居中，视觉与原先一致。
// - 移动端默认「适配宽度」缩放，并可由用户用 +/- 按钮放大到可阅读、可就地编辑的尺寸；
//   放大后外层出现横向滚动条，纵向仍由外层 main 滚动。
interface Props {
  naturalWidth: number; // 内容原始宽度（px）
  className?: string; // 外层容器额外 class
  contentClassName?: string; // 内容层额外 class（阴影/圆角等）
  children: React.ReactNode;
}

export default function ScaledPreview({ naturalWidth, className = "", contentClassName = "", children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const L = useUiT();
  const [containerWidth, setContainerWidth] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  // 用户缩放：null 表示跟随「适配宽度」，否则使用不小于 fit 的目标倍率
  const [userZoom, setUserZoom] = useState<number | null>(null);

  // 测量函数的最新引用（供「每次渲染重新测量」使用）
  const measureRef = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    let raf = 0;
    const update = () => {
      setContainerWidth(container.clientWidth);
      setContentHeight(content.scrollHeight);
    };
    measureRef.current = update;

    update();
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    });
    ro.observe(container);
    ro.observe(content);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      measureRef.current = () => {};
    };
  }, [naturalWidth]);

  // 每次渲染后重新测量：覆盖移动端编辑/预览切换（祖先 hidden→可见时部分浏览器不触发 RO）
  // 容器尺寸稳定时 setState 为相同值，React 会自动跳过，不会引发循环渲染。
  // useLayoutEffect(() => { measureRef.current(); });

  const fit = containerWidth > 0 ? Math.min(1, containerWidth / naturalWidth) : 1;
  const scale = userZoom != null ? Math.max(fit, userZoom) : fit;
  const zoomed = scale > fit + 0.0001;
  const canZoomIn = scale < 1.6;
  const canZoomOut = zoomed;

  const zoomIn = () => {
    const next = Math.min(1.6, Math.round(scale * 1.25 * 100) / 100);
    setUserZoom(Math.max(fit, next));
  };
  const zoomOut = () => {
    const next = Math.round((scale / 1.25) * 100) / 100;
    if (next <= fit + 0.0001) setUserZoom(null);
    else setUserZoom(next);
  };
  const reset = () => setUserZoom(null);

  return (
    <div className={`relative w-full ${className}`}>
      <div
        ref={containerRef}
        className={`relative w-full ${zoomed ? "overflow-x-auto overscroll-x-contain" : "overflow-hidden"}`}
      >
        <div
          style={{
            width: naturalWidth * scale,
            height: contentHeight ? contentHeight * scale : undefined,
            margin: "0 auto",
            position: "relative",
          }}
        >
          <div
            ref={contentRef}
            className={contentClassName}
            style={{
              width: naturalWidth,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            {children}
          </div>
        </div>
      </div>

      {/* 缩放控制条（移动端可见；桌面端默认 1:1 适配，无需常驻） */}
      <div className="pointer-events-none sticky bottom-2 z-10 mt-2 flex items-center justify-center lg:hidden">
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-gray-200 bg-white/95 p-1 shadow-md backdrop-blur">
          <button
            onClick={zoomOut}
            disabled={!canZoomOut}
            aria-label={L.zoomOut}
            className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-gray-600 transition hover:bg-gray-100 disabled:opacity-40"
          >
            −
          </button>
          <button
            onClick={reset}
            className="min-w-[3.5rem] rounded-full px-2 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-100"
            title={L.zoomReset}
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            onClick={zoomIn}
            disabled={!canZoomIn}
            aria-label={L.zoomIn}
            className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-gray-600 transition hover:bg-gray-100 disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}