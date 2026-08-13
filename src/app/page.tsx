"use client";

import React, { useState } from "react";
import Toolbar from "@/components/Toolbar";
import EditorPanel from "@/components/editor/EditorPanel";
import AiPanel from "@/components/editor/AiPanel";
import ResumePreview from "@/components/preview/ResumePreview";
import SelectionToolbar from "@/components/preview/SelectionToolbar";
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
        <aside className="flex w-[400px] shrink-0 flex-col border-r border-gray-200 bg-gray-50">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setMode("edit")}
              className={`flex-1 py-2 text-sm font-medium transition ${mode === "edit" ? "border-b-2 border-brand-500 text-brand-600" : "text-gray-500 hover:text-gray-800"}`}
            >
              ✏️ 编辑
            </button>
            <button
              onClick={() => setMode("ai")}
              className={`flex-1 py-2 text-sm font-medium transition ${mode === "ai" ? "border-b-2 border-brand-500 text-brand-600" : "text-gray-500 hover:text-gray-800"}`}
            >
              🤖 AI 助手
            </button>
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
    </div>
  );
}
