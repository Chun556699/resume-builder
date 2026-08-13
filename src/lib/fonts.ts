import { FontFamily } from "@/types/resume";

export interface FontDef {
  id: FontFamily;
  label: string;
  cssFamily: string; // 预览（HTML）用
  pdfFamily: string; // react-pdf 注册的字体族名
}

export const FONTS: FontDef[] = [
  {
    id: "sans",
    label: "黑体（思源黑体）",
    cssFamily: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
    pdfFamily: "NotoSansSC",
  },
  {
    id: "serif",
    label: "宋体（思源宋体）",
    cssFamily: '"Noto Serif SC", "Songti SC", "SimSun", serif',
    pdfFamily: "NotoSerifSC",
  },
  {
    id: "kai",
    label: "楷体（霞鹜文楷）",
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
    label: "得意黑（现代斜体）",
    cssFamily: '"Smiley Sans", "PingFang SC", "Microsoft YaHei", sans-serif',
    pdfFamily: "SmileySans",
  },
];

export function getFont(id: FontFamily): FontDef {
  return FONTS.find((f) => f.id === id) || FONTS[0];
}
