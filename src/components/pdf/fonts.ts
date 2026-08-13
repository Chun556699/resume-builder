"use client";

import { Font } from "@react-pdf/renderer";

let registered = false;

export function ensureFontsRegistered() {
  if (registered) return;
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
  registered = true;
}

export const FONT_FAMILY_SANS = "NotoSansSC";
export const FONT_FAMILY_SERIF = "NotoSerifSC";
export const FONT_FAMILY_KAI = "LXGWWenKai";
