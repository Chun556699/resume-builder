import { PaperSize } from "@/types/resume";

// 纸张尺寸：预览用像素（96dpi），PDF 用 react-pdf 的页面尺寸
export interface PaperDef {
  id: PaperSize;
  label: string;
  width: number; // px (96dpi)
  height: number; // px
  pdfSize: string; // react-pdf Page size
}

export const PAPERS: PaperDef[] = [
  { id: "A4", label: "A4（默认）", width: 794, height: 1123, pdfSize: "A4" },
  { id: "Letter", label: "Letter", width: 816, height: 1056, pdfSize: "LETTER" },
  { id: "Legal", label: "Legal", width: 816, height: 1344, pdfSize: "LEGAL" },
  { id: "A5", label: "A5", width: 559, height: 794, pdfSize: "A5" },
];

export function getPaper(id: PaperSize): PaperDef {
  return PAPERS.find((p) => p.id === id) || PAPERS[0];
}
