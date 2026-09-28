import { CnFontFamily, EnFontFamily } from "@/types/resume";

export interface FontDef {
  id: string;
  label: string;
  cssFamily: string; // 预览（HTML）用：@font-face 注册的主族名 + 系统回退
  pdfFamily: string; // react-pdf 注册的字体族名
}

// 中文字体（含中文 + 拉丁字形）
export const CN_FONTS: FontDef[] = [
  {
    id: "sans",
    label: "思源黑体",
    cssFamily: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
    pdfFamily: "NotoSansSC",
  },
  {
    id: "serif",
    label: "思源宋体",
    cssFamily: '"Noto Serif SC", "Songti SC", "SimSun", serif',
    pdfFamily: "NotoSerifSC",
  },
  {
    id: "kai",
    label: "霞鹜文楷",
    cssFamily: '"LXGW WenKai", "KaiTi", "STKaiti", "楷体", serif',
    pdfFamily: "LXGWWenKai",
  },
  {
    id: "puhuiti",
    label: "阿里巴巴普惠体",
    cssFamily: '"Alibaba PuHuiTi 3", "Alibaba PuHuiTi", "PingFang SC", "Microsoft YaHei", sans-serif',
    pdfFamily: "AlibabaPuHuiTi",
  },
  {
    id: "smiley",
    label: "得意黑",
    cssFamily: '"Smiley Sans", "PingFang SC", "Microsoft YaHei", sans-serif',
    pdfFamily: "SmileySans",
  },
  {
    id: "sans-light",
    label: "思源黑体 细体",
    cssFamily: '"Noto Sans SC Light", "PingFang SC", "Microsoft YaHei", sans-serif',
    pdfFamily: "NotoSansSCLight",
  },
  {
    id: "sans-medium",
    label: "思源黑体 中黑",
    cssFamily: '"Noto Sans SC Medium", "PingFang SC", "Microsoft YaHei", sans-serif',
    pdfFamily: "NotoSansSCMedium",
  },
  {
    id: "sans-heavy",
    label: "思源黑体 巨黑",
    cssFamily: '"Noto Sans SC Heavy", "PingFang SC", "Microsoft YaHei", sans-serif',
    pdfFamily: "NotoSansSCHeavy",
  },
  {
    id: "rouhei",
    label: "思源柔黑",
    cssFamily: '"Resource Han Rounded", "PingFang SC", "Microsoft YaHei", sans-serif',
    pdfFamily: "ResourceHanRounded",
  },
];

// 英文字体（仅拉丁字形；auto 表示跟随中文字体的拉丁字形）
export const EN_FONTS: FontDef[] = [
  {
    id: "auto",
    label: "跟随中文字体",
    cssFamily: "",
    pdfFamily: "",
  },
  {
    id: "source-sans",
    label: "Source Sans 3（思源无衬线）",
    cssFamily: '"Source Sans 3"',
    pdfFamily: "SourceSans3",
  },
  {
    id: "source-serif",
    label: "Source Serif 4（思源衬线）",
    cssFamily: '"Source Serif 4"',
    pdfFamily: "SourceSerif4",
  },
  {
    id: "source-code",
    label: "Source Code Pro（思源等宽）",
    cssFamily: '"Source Code Pro"',
    pdfFamily: "SourceCodePro",
  },
  {
    id: "googlesans-code",
    label: "Google Sans Code",
    cssFamily: '"Google Sans Code"',
    pdfFamily: "GoogleSansCode",
  },
];

export function getCnFont(id: CnFontFamily): FontDef {
  return CN_FONTS.find((f) => f.id === id) || CN_FONTS[0];
}

export function getEnFont(id: EnFontFamily): FontDef {
  return EN_FONTS.find((f) => f.id === id) || EN_FONTS[0];
}

// 预览（HTML）用：英文在前、中文在后，浏览器按字形自动回退
export function fontCssStack(enId: EnFontFamily, cnId: CnFontFamily): string {
  const cn = getCnFont(cnId).cssFamily;
  if (enId === "auto") return cn;
  const en = getEnFont(enId).cssFamily;
  return `${en}, ${cn}`;
}

// react-pdf 矢量回退用：字体栈按字形回退
export function fontPdfStack(enId: EnFontFamily, cnId: CnFontFamily): string[] {
  const cn = getCnFont(cnId).pdfFamily;
  if (enId === "auto") return [cn];
  const en = getEnFont(enId).pdfFamily;
  return [en, cn];
}
