"use client";

import { Font } from "@react-pdf/renderer";

let registered = false;

export function ensureFontsRegistered() {
  if (registered) return;

  // 中文字体
  Font.register({
    family: "NotoSansSC",
    fonts: [
      { src: "/fonts/NotoSansSC-Regular.otf", fontWeight: 400 },
      { src: "/fonts/NotoSansSC-Bold.otf", fontWeight: 700 },
    ],
  });
  Font.register({
    family: "NotoSerifSC",
    fonts: [
      { src: "/fonts/NotoSerifSC-Regular.otf", fontWeight: 400 },
      { src: "/fonts/NotoSerifSC-Bold.otf", fontWeight: 700 },
    ],
  });
  Font.register({
    family: "LXGWWenKai",
    fonts: [
      { src: "/fonts/LXGWWenKai-Regular.ttf", fontWeight: 400 },
      { src: "/fonts/LXGWWenKai-Regular.ttf", fontWeight: 700 },
    ],
  });
  Font.register({
    family: "AlibabaPuHuiTi",
    fonts: [
      { src: "/fonts/AlibabaPuHuiTi-3-55-Regular.ttf", fontWeight: 400 },
      { src: "/fonts/AlibabaPuHuiTi-3-85-Bold.ttf", fontWeight: 700 },
    ],
  });
  Font.register({
    family: "SmileySans",
    fonts: [
      { src: "/fonts/SmileySans-Oblique.ttf", fontWeight: 400 },
      { src: "/fonts/SmileySans-Oblique.ttf", fontWeight: 700 },
    ],
  });
  Font.register({
    family: "NotoSansSCLight",
    fonts: [
      { src: "/fonts/NotoSansSC-Light.otf", fontWeight: 400 },
      { src: "/fonts/NotoSansSC-Light.otf", fontWeight: 700 },
    ],
  });
  Font.register({
    family: "NotoSansSCMedium",
    fonts: [
      { src: "/fonts/NotoSansSC-Medium.otf", fontWeight: 400 },
      { src: "/fonts/NotoSansSC-Medium.otf", fontWeight: 700 },
    ],
  });
  Font.register({
    family: "NotoSansSCHeavy",
    fonts: [
      { src: "/fonts/NotoSansSC-Black.otf", fontWeight: 400 },
      { src: "/fonts/NotoSansSC-Black.otf", fontWeight: 700 },
    ],
  });
  Font.register({
    family: "ResourceHanRounded",
    fonts: [
      { src: "/fonts/ResourceHanRoundedCN-Regular.ttf", fontWeight: 400 },
      { src: "/fonts/ResourceHanRoundedCN-Bold.ttf", fontWeight: 700 },
    ],
  });

  // 英文字体
  Font.register({
    family: "SourceSans3",
    fonts: [
      { src: "/fonts/SourceSans3-Regular.otf", fontWeight: 400 },
      { src: "/fonts/SourceSans3-Bold.otf", fontWeight: 700 },
    ],
  });
  Font.register({
    family: "SourceSerif4",
    fonts: [
      { src: "/fonts/SourceSerif4-Regular.otf", fontWeight: 400 },
      { src: "/fonts/SourceSerif4-Bold.otf", fontWeight: 700 },
    ],
  });
  Font.register({
    family: "SourceCodePro",
    fonts: [
      { src: "/fonts/SourceCodePro-Regular.otf", fontWeight: 400 },
      { src: "/fonts/SourceCodePro-Bold.otf", fontWeight: 700 },
    ],
  });
  Font.register({
    family: "GoogleSansCode",
    fonts: [
      { src: "/fonts/GoogleSansCode.ttf", fontWeight: 400 },
      { src: "/fonts/GoogleSansCode.ttf", fontWeight: 700 },
    ],
  });

  registered = true;
}

export const FONT_FAMILY_SANS = "NotoSansSC";
export const FONT_FAMILY_SERIF = "NotoSerifSC";
export const FONT_FAMILY_KAI = "LXGWWenKai";
