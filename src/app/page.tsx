"use client";

import React, { useEffect, useState } from "react";
import Toolbar from "@/components/Toolbar";
import EditorPanel from "@/components/editor/EditorPanel";
import AiPanel from "@/components/editor/AiPanel";
import ResumePreview from "@/components/preview/ResumePreview";
import ScaledPreview from "@/components/preview/ScaledPreview";
import SelectionToolbar from "@/components/preview/SelectionToolbar";
import { Icon } from "@/components/Icon";
import { useResumeStore } from "@/store/resumeStore";
import { useUiT } from "@/lib/useUiT";
import { getPaper } from "@/lib/paper";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMobile;
}

// 部署方可选信息（备案号/客服邮箱/署名）：构建时由环境变量注入，开源默认不显示
const ICP_NUMBER = process.env.NEXT_PUBLIC_ICP_NUMBER || "";
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "";
const FOUNDER = process.env.NEXT_PUBLIC_FOUNDER || "";

export default function Home() {
  const { data, template, accentColor, fontSize, paperSize, cnFontFamily, enFontFamily, lineHeight, showAvatar, avatarShape, avatarSize } = useResumeStore();
  const L = useUiT();
  const [mode, setMode] = useState<"edit" | "ai">("edit");
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
  const isMobile = useIsMobile();

  const paper = getPaper(paperSize);

  const previewProps = {
    data,
    template,
    accentColor,
    fontSize,
    paperSize,
    cnFontFamily,
    enFontFamily,
    lineHeight,
    showAvatar,
    avatarShape,
    avatarSize,
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-gray-100">
      <Toolbar />
      <SelectionToolbar />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* 左侧编辑面板 */}
        <aside
          className={`flex flex-col border-gray-200 bg-white
            ${mobileTab === "edit" ? "flex w-full" : "hidden"}
            lg:flex lg:w-[430px] lg:shrink-0 lg:border-r`}
        >
          {/* 模式切换：分段控制器 */}
          <div className="border-b border-gray-100 p-2.5">
            <div className="flex rounded-xl bg-gray-100 p-1">
              <button
                onClick={() => setMode("edit")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition ${
                  mode === "edit" ? "bg-white text-brand-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <span className="text-base"><Icon name="edit" size={16} /></span> {L.modeEdit}
              </button>
              <button
                onClick={() => setMode("ai")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition ${
                  mode === "ai" ? "bg-white text-brand-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <span className="text-base"><Icon name="ai" size={16} /></span> {L.modeAi}
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {mode === "edit" ? <EditorPanel /> : (
              <div className="h-full overflow-y-auto p-3">
                <AiPanel />
              </div>
            )}
          </div>
        </aside>

        {/* 右侧预览 */}
        <main
          className={`min-h-0 flex-1 overflow-auto
            ${mobileTab === "preview" ? "block" : "hidden"}
            lg:block`}
        >
          <div className="p-3 sm:p-4 lg:p-6">
            <ScaledPreview
              naturalWidth={paper.width}
              contentClassName="bg-white shadow-xl ring-1 ring-gray-200"
            >
              <ResumePreview {...previewProps} active={!isMobile || mobileTab === "preview"} />
            </ScaledPreview>
            <p className="mt-3 text-center text-xs text-gray-400 lg:mt-4">
              {L.livePreviewNote}
            </p>
          </div>
        </main>
      </div>

      {/* 移动端底部导航 */}
      <nav
        className="flex shrink-0 border-t border-gray-200 bg-white lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <button
          onClick={() => setMobileTab("edit")}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition ${
            mobileTab === "edit" ? "text-brand-600" : "text-gray-400"
          }`}
        >
          <Icon name="edit" size={20} />
          {L.modeEdit}
        </button>
        <button
          onClick={() => setMobileTab("preview")}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition ${
            mobileTab === "preview" ? "text-brand-600" : "text-gray-400"
          }`}
        >
          <Icon name="file-text" size={20} />
          {L.mTabPreview}
        </button>
      </nav>

      {/* 底部版权信息 */}
      {/* 底部版权信息（备案号/客服邮箱/署名仅在部署配置了相应环境变量时显示） */}
      <footer className="flex shrink-0 flex-wrap items-center justify-center gap-x-2 gap-y-0.5 border-t border-gray-200 bg-white px-4 py-1.5 text-[11px] text-gray-400 lg:text-xs">
        <span>{L.footerCopyright}</span>
        {FOUNDER && (
          <>
            <span className="text-gray-200">|</span>
            <span>{FOUNDER}</span>
          </>
        )}
        {ICP_NUMBER && (
          <>
            <span className="text-gray-200">|</span>
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-brand-600"
            >
              {ICP_NUMBER}
            </a>
          </>
        )}
        {SUPPORT_EMAIL && (
          <>
            <span className="text-gray-200">|</span>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="transition hover:text-brand-600">
              {L.footerSupport(SUPPORT_EMAIL)}
            </a>
          </>
        )}
      </footer>
    </div>
  );
}
