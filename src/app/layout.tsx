import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 简历制作系统 | AI Resume Builder",
  description: "在线简历制作：实时预览编辑、导出 PDF/JSON/图片，AI 智能生成与优化 · Online resume builder with live preview, PDF export and AI assistance",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
