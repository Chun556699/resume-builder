"use client";

import React, { useState } from "react";
import Toolbar from "@/components/Toolbar";
import EditorPanel from "@/components/editor/EditorPanel";
import AiPanel from "@/components/editor/AiPanel";
import ResumePreview from "@/components/preview/ResumePreview";
import SelectionToolbar from "@/components/preview/SelectionToolbar";
import { Icon } from "@/components/Icon";
import { useResumeStore } from "@/store/resumeStore";

export default function Home() {
  const { data, template, accentColor, fontSize, paperSize, fontFamily, lineHeight, showAvatar, avatarShape, avatarSize } = useResumeStore();
  const [mode, setMode] = useState<"edit" | "ai">("edit");

  return (
    <div className="flex h-screen flex-col bg-gray-100">
      <Toolbar />
      <SelectionToolbar />

      <div className="flex flex-1 overflow-hidden">
        {/* 左侧面板 */}
        <aside className="flex w-[430px] shrink-0 flex-col border-r border-gray-200 bg-white">
          {/* 模式切换：分段控制器 */}
          <div className="border-b border-gray-100 p-2.5">
            <div className="flex rounded-xl bg-gray-100 p-1">
              <button
                onClick={() => setMode("edit")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition ${
                  mode === "edit" ? "bg-white text-brand-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <span className="text-base"><Icon name="edit" size={16} /></span> 编辑
              </button>
              <button
                onClick={() => setMode("ai")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition ${
                  mode === "ai" ? "bg-white text-brand-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <span className="text-base"><Icon name="atom" size={16} /></span> AI 助手
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            {mode === "edit" ? <EditorPanel /> : (
              <div className="h-full overflow-y-auto p-3">
                <AiPanel />
              </div>
            )}
          </div>
        </aside>

        {/* 右侧预览 */}
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto flex justify-center">
            <div
              className="shadow-xl ring-1 ring-gray-200"
            >
              <ResumePreview
                data={data}
                template={template}
                accentColor={accentColor}
                fontSize={fontSize}
                paperSize={paperSize}
                fontFamily={fontFamily}
                lineHeight={lineHeight}
                showAvatar={showAvatar}
                avatarShape={avatarShape}
                avatarSize={avatarSize}
              />
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-gray-400">
            实时预览 · 内容自动保存到本地浏览器
          </p>
        </main>
      </div>

      {/* 底部版权信息 */}
      <footer className="flex items-center justify-center gap-2 border-t border-gray-200 bg-white px-4 py-1.5 text-xs text-gray-400">
        <span>© 2026 简历制作系统</span>
        <span className="text-gray-200">|</span>
        <span>系统创始人：乱世千钧(Chun)</span>
        <span className="text-gray-200">|</span>
        <a
          href="https://beian.miit.gov.cn/"
          target="_blank"
          rel="noopener noreferrer"
          className="transition hover:text-brand-600"
        >
          蜀ICP备2025161896号
        </a>
      </footer>
    </div>
  );
}
