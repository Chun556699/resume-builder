"use client";

import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { ResumeData, TemplateId, PaperSize, CnFontFamily, EnFontFamily, AvatarShape } from "@/types/resume";
import { getPaper } from "@/lib/paper";
import { fontPdfStack } from "@/lib/fonts";
import { buildSectionOrder, htmlToPlainText } from "@/lib/utils";
import { resumeT, type ResumeLang } from "@/lib/resumeI18n";

// 在线预览使用 CSS px（96dpi），而 react-pdf 使用 pt（72dpi）。
// 之前直接把 px 数值当 pt 使用，导致 PDF 比预览大了约 33%，出现“预览一页、导出多页”。
// 这里统一把 px 数值按 72/96 换算成 pt，保证 PDF 与在线预览排版、分页一致。
const px = (n: number) => (n * 72) / 96;

interface Props {
  data: ResumeData;
  template: TemplateId;
  accentColor: string;
  fontSize: number;
  paperSize: PaperSize;
  cnFontFamily: CnFontFamily;
  enFontFamily: EnFontFamily;
  showAvatar: boolean;
  avatarShape: AvatarShape;
  avatarSize: number;
  sectionOrder: string[];
  lang?: ResumeLang;
}

export function ResumePdfDocument(props: Props) {
  const { data, template } = props;
  const t = resumeT(props.lang);
  const cleanName = (data.personal.fullName || "").replace(/<[^>]*>/g, "").trim() || t.resumeWord;
  return (
    <Document
      title={`${cleanName}_${t.resumeWord}`}
      author={cleanName}
      producer="AI 简历制作系统"
    >
      {template === "modern" ? <ModernTemplate {...props} /> :
       template === "compact" ? <CompactTemplate {...props} /> :
       template === "elegant" ? <ElegantTemplate {...props} /> :
       template === "minimal" ? <MinimalTemplate {...props} /> :
       template === "sidebar" ? <SidebarTemplate {...props} /> :
       template === "timeline" ? <TimelineTemplate {...props} /> :
       template === "geek" ? <GeekTemplate {...props} /> :
       template === "blocks" ? <BlocksTemplate {...props} /> :
       <ClassicTemplate {...props} />}
    </Document>
  );
}

/* ---------- 通用小部件 ---------- */

function Bullets({ html, fontSize, color, font, dense }: { html: string; fontSize: number; color: string; font: string | string[]; dense?: boolean }) {
  const lines = splitRunsByLine(parseInlineHtml(html));
  const contentStyle = { color: "#333", fontSize: px(fontSize - 1), lineHeight: dense ? 1.35 : 1.5, flex: 1, fontFamily: font };
  return (
    <View style={{ marginTop: px(dense ? 1 : 3) }}>
      {lines.map((lineRuns, i) => (
        <View key={i} style={{ flexDirection: "row", marginBottom: px(dense ? 0.5 : 1.5) }}>
          <Text style={{ color, fontSize: px(fontSize - 1), lineHeight: dense ? 1.35 : 1.5, marginRight: px(5), fontFamily: font }}>•</Text>
          <Text style={contentStyle}>
            <Runs runs={lineRuns} style={contentStyle} />
          </Text>
        </View>
      ))}
    </View>
  );
}

function SectionTitle({ text, color, fontSize, font, underline = true, minimal = false }: { text: string; color: string; fontSize: number; font: string | string[]; underline?: boolean; minimal?: boolean }) {
  return (
    <View style={{ marginBottom: px(5), paddingBottom: px(3), borderBottomWidth: underline ? px(1) : 0, borderBottomColor: minimal ? "#111" : "#e5e7eb" }}>
      <Text style={{ fontFamily: font, fontWeight: 700, fontSize: px(fontSize + (minimal ? 0 : 2)), color, letterSpacing: px(minimal ? 2 : 0) }}>{text}</Text>
    </View>
  );
}

function DateRange({ start, end, current, font, lang }: { start: string; end: string; current?: boolean; font: string | string[]; lang?: ResumeLang }) {
  const text = current ? `${start} - ${resumeT(lang).present}` : `${start} - ${end}`;
  return <Text style={{ fontFamily: font, fontSize: px(9), color: "#666" }}>{text}</Text>;
}

function contactText(p: ResumeData["personal"], sep: string): string {
  return [p.email, p.phone, p.location, p.website]
    .filter(Boolean)
    .map((x) => htmlToPlainText(x))
    .join(sep);
}

function Avatar({ src, size, accent, shape }: { src?: string; size: number; accent: string; shape?: AvatarShape }) {
  if (!src) return null;
  const s = px(size);
  const radius = shape === "square" ? px(4) : s / 2;
  return (
    <View style={{ width: s, height: s, borderRadius: radius, overflow: "hidden", borderWidth: px(2), borderColor: accent }}>
      <Image src={src} style={{ width: s, height: s, objectFit: "cover" }} />
    </View>
  );
}

function Images({ images, accent }: { images: string[]; accent: string }) {
  const list = (images || []).filter(Boolean);
  if (list.length === 0) return null;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: px(6), marginTop: px(5) }}>
      {list.map((img, i) => (
        <View key={i} style={{ width: px(70), height: px(50), borderRadius: px(3), overflow: "hidden", borderWidth: px(1), borderColor: "#ddd" }}>
          <Image src={img} style={{ width: px(70), height: px(50), objectFit: "cover" }} />
        </View>
      ))}
    </View>
  );
}

/* ---------- 内联 HTML → react-pdf 富文本 ---------- */

interface RunStyle {
  fontWeight?: number;
  fontStyle?: "italic";
  textDecoration?: "underline";
  color?: string;
  fontSize?: number;
}
interface Run {
  text: string;
  style: RunStyle;
}

function parseInlineHtml(html: string): Run[] {
  if (!html) return [];
  let doc: globalThis.Document;
  try {
    doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  } catch {
    return [{ text: html.replace(/<[^>]*>/g, ""), style: {} }];
  }
  const runs: Run[] = [];
  const walk = (node: Node, style: RunStyle) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === 3) {
        const text = child.textContent || "";
        if (text) runs.push({ text, style: { ...style } });
      } else if (child.nodeType === 1) {
        const el = child as HTMLElement;
        const tag = el.tagName.toLowerCase();
        const ns: RunStyle = { ...style };
        if (tag === "b" || tag === "strong") ns.fontWeight = 700;
        if (tag === "i" || tag === "em") ns.fontStyle = "italic";
        if (tag === "u") ns.textDecoration = "underline";
        if (tag === "font") {
          const c = el.getAttribute("color");
          if (c) ns.color = c;
        }
        if (tag === "span" || tag === "font") {
          const st = el.getAttribute("style") || "";
          const mColor = /color:\s*([^;]+)/i.exec(st);
          if (mColor) ns.color = mColor[1].trim();
          const mFw = /font-weight:\s*([^;]+)/i.exec(st);
          if (mFw && /bold|700/.test(mFw[1])) ns.fontWeight = 700;
          const mFs = /font-size:\s*([\d.]+)px/i.exec(st);
          if (mFs) ns.fontSize = px(parseFloat(mFs[1]));
          const mStyle = /font-style:\s*([^;]+)/i.exec(st);
          if (mStyle && /italic/.test(mStyle[1])) ns.fontStyle = "italic";
        }
        walk(el, ns);
      }
    }
  };
  walk(doc.body, {});
  return runs;
}

// 把 parse 后的 runs 按 \n 拆成多行，保证跨行标签（如 <b>line1\nline2</b>）不会被打断
function splitRunsByLine(runs: Run[]): Run[][] {
  const lines: Run[][] = [];
  let cur: Run[] = [];
  const pushCur = () => {
    if (cur.some((r) => r.text.trim())) lines.push(cur);
    cur = [];
  };
  for (const r of runs) {
    const parts = r.text.split("\n");
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) pushCur();
      if (parts[i]) cur.push({ text: parts[i], style: r.style });
    }
  }
  pushCur();
  return lines;
}

// 不包裹外层 Text 的富文本 runs，便于嵌入已有 Text 容器
function Runs({ runs, style }: { runs: Run[]; style: any }) {
  return (
    <>
      {runs.map((r, i) => (
        <Text key={i} style={{ ...style, ...r.style }}>{r.text}</Text>
      ))}
    </>
  );
}

function InlineRich({ html, style }: { html: string; style: any }) {
  return <Runs runs={parseInlineHtml(html)} style={style} />;
}

function RichText({ html, style }: { html: string; style: any }) {
  return (
    <Text style={style}>
      <InlineRich html={html} style={style} />
    </Text>
  );
}

function RichTextLines({ html, style, lineStyle }: { html: string; style: any; lineStyle?: any }) {
  const lines = splitRunsByLine(parseInlineHtml(html));
  return (
    <View>
      {lines.map((lineRuns, i) => (
        <View key={i} style={{ marginBottom: i < lines.length - 1 ? px(2) : 0, ...(lineStyle || {}) }}>
          <Text style={style}>
            <Runs runs={lineRuns} style={style} />
          </Text>
        </View>
      ))}
    </View>
  );
}

/* ---------- 单栏通用渲染：按 resolvedOrder 输出区块 ---------- */

interface SectionCtx {
  data: ResumeData;
  accentColor: string;
  fontSize: number;
  font: string | string[];
  dense?: boolean;
  minimal?: boolean;
  lang?: ResumeLang;
}

function renderSectionByKey(key: string, ctx: SectionCtx): React.ReactNode {
  const { data, accentColor, fontSize, font, dense, minimal, lang } = ctx;
  const p = data.personal;

  if (key === "summary" && p.summary) {
    return (
      <View key="summary" style={{ marginTop: px(dense ? 6 : 10) }}>
        <SectionTitle text={resumeT(lang).summary} color={accentColor} fontSize={fontSize} font={font} minimal={minimal} />
        <RichTextLines html={p.summary} style={{ fontFamily: font, fontSize: px(fontSize - 1), color: "#444", lineHeight: dense ? 1.4 : 1.7 }} />
      </View>
    );
  }
  if (key === "experience" && data.experiences.length > 0) {
    return (
      <View key="experience" style={{ marginTop: px(dense ? 6 : 10) }}>
        <SectionTitle text={resumeT(lang).experience} color={accentColor} fontSize={fontSize} font={font} minimal={minimal} />
        {data.experiences.map((e) => (
          <View key={e.id} style={{ marginBottom: px(dense ? 5 : 9) }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
              <Text style={{ fontFamily: font, fontWeight: 700, fontSize: px(fontSize - (dense ? 1 : 0)), color: "#111" }}>
                <InlineRich html={`${e.position}${e.company ? ` · ${e.company}` : ""}`} style={{ fontFamily: font, fontWeight: 700, fontSize: px(fontSize - (dense ? 1 : 0)), color: "#111" }} />
              </Text>
              <DateRange start={e.startDate} end={e.endDate} current={e.current} font={font} lang={lang} />
            </View>
            {e.location ? <RichText html={e.location} style={{ fontFamily: font, fontSize: px(fontSize - 2), color: "#777" }} /> : null}
            <Bullets html={e.description} fontSize={fontSize} color={accentColor} font={font} dense={dense} />
          </View>
        ))}
      </View>
    );
  }
  if (key === "project" && data.projects.length > 0) {
    return (
      <View key="project" style={{ marginTop: px(dense ? 6 : 10) }}>
        <SectionTitle text={resumeT(lang).project} color={accentColor} fontSize={fontSize} font={font} minimal={minimal} />
        {data.projects.map((pr) => (
          <View key={pr.id} style={{ marginBottom: px(dense ? 5 : 9) }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
              <Text style={{ fontFamily: font, fontWeight: 700, fontSize: px(fontSize - (dense ? 1 : 0)), color: "#111" }}>
                <InlineRich html={`${pr.name}${pr.role ? ` · ${pr.role}` : ""}`} style={{ fontFamily: font, fontWeight: 700, fontSize: px(fontSize - (dense ? 1 : 0)), color: "#111" }} />
              </Text>
              <DateRange start={pr.startDate} end={pr.endDate} font={font} lang={lang} />
            </View>
            {pr.link ? <RichText html={pr.link} style={{ fontFamily: font, fontSize: px(fontSize - 3), color: accentColor }} /> : null}
            <Bullets html={pr.description} fontSize={fontSize} color={accentColor} font={font} dense={dense} />
          </View>
        ))}
      </View>
    );
  }
  if (key === "education" && data.education.length > 0) {
    return (
      <View key="education" style={{ marginTop: px(dense ? 6 : 10) }}>
        <SectionTitle text={resumeT(lang).education} color={accentColor} fontSize={fontSize} font={font} minimal={minimal} />
        {data.education.map((ed) => (
          <View key={ed.id} style={{ marginBottom: px(dense ? 4 : 7) }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
              <Text style={{ fontFamily: font, fontWeight: 700, fontSize: px(fontSize - (dense ? 1 : 0)), color: "#111" }}>
                <InlineRich html={`${ed.school}${ed.major ? ` · ${ed.major}` : ""}`} style={{ fontFamily: font, fontWeight: 700, fontSize: px(fontSize - (dense ? 1 : 0)), color: "#111" }} />
              </Text>
              <DateRange start={ed.startDate} end={ed.endDate} font={font} lang={lang} />
            </View>
            {ed.degree ? <RichText html={ed.degree} style={{ fontFamily: font, fontSize: px(fontSize - 2), color: "#555" }} /> : null}
            {ed.description ? <RichText html={ed.description} style={{ fontFamily: font, fontSize: px(fontSize - 1), color: "#444", lineHeight: 1.6, marginTop: px(2) }} /> : null}
          </View>
        ))}
      </View>
    );
  }
  if (key === "skill" && data.skills.length > 0) {
    return (
      <View key="skill" style={{ marginTop: px(dense ? 6 : 10) }}>
        <SectionTitle text={resumeT(lang).skill} color={accentColor} fontSize={fontSize} font={font} minimal={minimal} />
        {data.skills.map((s) => (
          <View key={s.id} style={{ flexDirection: dense ? "row" : "column", marginBottom: px(dense ? 2 : 3) }}>
            <Text style={{ fontFamily: font, fontWeight: 700, fontSize: px(fontSize - 1), color: "#111", width: dense ? px(48) : undefined }}>
              <InlineRich html={s.name} style={{ fontFamily: font, fontWeight: 700, fontSize: px(fontSize - 1), color: "#111" }} />
              {dense ? null : "："}
            </Text>
            <RichText html={s.items} style={{ fontFamily: font, fontSize: px(fontSize - 1), color: "#333", lineHeight: dense ? 1.35 : 1.6, flex: 1 }} />
          </View>
        ))}
      </View>
    );
  }
  if (key.startsWith("custom:")) {
    const cs = data.customSections.find((c) => `custom:${c.id}` === key);
    if (!cs) return null;
    return (
      <View key={key} style={{ marginTop: px(dense ? 6 : 10) }}>
        <SectionTitle text={htmlToPlainText(cs.title) || resumeT(lang).custom} color={accentColor} fontSize={fontSize} font={font} minimal={minimal} />
        <RichTextLines html={cs.content} style={{ fontFamily: font, fontSize: px(fontSize - 1), color: "#444", lineHeight: dense ? 1.4 : 1.7 }} />
        <Images images={cs.images} accent={accentColor} />
      </View>
    );
  }
  return null;
}

function orderedSections(data: ResumeData, sectionOrder?: string[]): string[] {
  return buildSectionOrder(data, sectionOrder);
}

/* ---------- 技能标签方块（blocks 模板用） ---------- */

function SkillTags({ items, accent, font, fontSize }: { items: string; accent: string; font: string | string[]; fontSize: number }) {
  const text = htmlToPlainText(items || "");
  const tags = text.split(/[,，、\s]+/).map((t) => t.trim()).filter(Boolean);
  if (tags.length === 0) return null;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: px(3), alignItems: "flex-start" }}>
      {tags.map((t, i) => (
        <View
          key={i}
          style={{
            marginRight: px(4),
            marginBottom: px(4),
            borderWidth: px(0.75),
            borderColor: accent,
            borderRadius: px(4),
            paddingHorizontal: px(6),
            paddingVertical: px(1.5),
            backgroundColor: "#f3f4f6",
          }}
        >
          <Text style={{ fontFamily: font, fontSize: px(fontSize - 2), color: accent }}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

/* ---------- 块状标签模板：整块卡片 + 技术标签方块 ---------- */

function BlocksTemplate({ data, lang, accentColor, fontSize, cnFontFamily, enFontFamily, showAvatar, paperSize, sectionOrder, avatarShape, avatarSize }: Props) {
  const p = data.personal;
  const F = fontPdfStack(enFontFamily, cnFontFamily);
  const order = orderedSections(data, sectionOrder);
  const ctx: SectionCtx = { data, accentColor, fontSize, font: F, lang };
  const card = { borderWidth: px(0.75), borderColor: "#e5e7eb", borderRadius: px(8), paddingHorizontal: px(12), paddingVertical: px(9), marginBottom: px(8) };
  const styles = StyleSheet.create({
    page: { fontFamily: F, fontSize: px(fontSize), paddingTop: px(26), paddingBottom: px(26), paddingHorizontal: px(34), color: "#222" },
    header: { marginBottom: px(10), flexDirection: "row", alignItems: "center", gap: px(10), borderBottomWidth: px(2), borderBottomColor: accentColor, paddingBottom: px(8) },
    name: { fontSize: px(fontSize + 8), fontWeight: 700, color: "#111" },
    title: { fontSize: px(fontSize), color: accentColor, marginTop: px(2) },
    contact: { fontSize: px(fontSize - 4), color: "#555", marginTop: px(3) },
    cardTitle: { marginBottom: px(5), paddingBottom: px(4), borderBottomWidth: px(0.75), borderBottomColor: accentColor + "40", flexDirection: "row", alignItems: "center" },
    cardTitleText: { fontFamily: F, fontWeight: 700, fontSize: px(fontSize + 2), color: accentColor },
    handle: { fontFamily: F, color: "#9ca3af", fontSize: px(fontSize), marginRight: px(4) },
  });
  const renderCard = (key: string, title: string, inner: React.ReactNode) => (
    <View key={key} style={card}>
      <View style={styles.cardTitle}>
        <Text style={styles.handle}>⠿</Text>
        <Text style={styles.cardTitleText}>{title}</Text>
      </View>
      {inner}
    </View>
  );
  return (
    <Page size={getPaper(paperSize).pdfSize as any} style={styles.page} wrap>
      <View style={styles.header}>
        {showAvatar ? <Avatar src={p.avatar} size={avatarSize} accent={accentColor} shape={avatarShape} /> : null}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: px(8) }}>
            {p.fullName ? <RichText html={p.fullName} style={styles.name} /> : null}
            {p.jobTitle ? <RichText html={p.jobTitle} style={styles.title} /> : null}
          </View>
          <Text style={styles.contact}>{contactText(p, "  ·  ")}</Text>
        </View>
      </View>
      {order.map((k) => {
        if (k === "summary" && p.summary) {
          return renderCard(k, resumeT(lang).summary, <RichTextLines html={p.summary} style={{ fontFamily: F, fontSize: px(fontSize - 1), color: "#444", lineHeight: 1.7 }} />);
        }
        if (k === "experience" && data.experiences.length > 0) {
          return renderCard(k, resumeT(lang).experience, data.experiences.map((e) => (
            <View key={e.id} style={{ marginBottom: px(7) }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                <Text style={{ fontFamily: F, fontWeight: 700, fontSize: px(fontSize), color: "#111" }}>
                  <InlineRich html={`${e.position}${e.company ? ` · ${e.company}` : ""}`} style={{ fontFamily: F, fontWeight: 700, fontSize: px(fontSize), color: "#111" }} />
                </Text>
                <DateRange start={e.startDate} end={e.endDate} current={e.current} font={F} lang={lang} />
              </View>
              {e.location ? <RichText html={e.location} style={{ fontFamily: F, fontSize: px(fontSize - 2), color: "#777" }} /> : null}
              <Bullets html={e.description} fontSize={fontSize} color={accentColor} font={F} />
            </View>
          )));
        }
        if (k === "project" && data.projects.length > 0) {
          return renderCard(k, resumeT(lang).project, data.projects.map((pr) => (
            <View key={pr.id} style={{ marginBottom: px(7) }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                <Text style={{ fontFamily: F, fontWeight: 700, fontSize: px(fontSize), color: "#111" }}>
                  <InlineRich html={`${pr.name}${pr.role ? ` · ${pr.role}` : ""}`} style={{ fontFamily: F, fontWeight: 700, fontSize: px(fontSize), color: "#111" }} />
                </Text>
                <DateRange start={pr.startDate} end={pr.endDate} font={F} lang={lang} />
              </View>
              {pr.link ? <RichText html={pr.link} style={{ fontFamily: F, fontSize: px(fontSize - 3), color: accentColor }} /> : null}
              <Bullets html={pr.description} fontSize={fontSize} color={accentColor} font={F} />
            </View>
          )));
        }
        if (k === "education" && data.education.length > 0) {
          return renderCard(k, resumeT(lang).education, data.education.map((ed) => (
            <View key={ed.id} style={{ marginBottom: px(5) }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                <Text style={{ fontFamily: F, fontWeight: 700, fontSize: px(fontSize), color: "#111" }}>
                  <InlineRich html={`${ed.school}${ed.major ? ` · ${ed.major}` : ""}`} style={{ fontFamily: F, fontWeight: 700, fontSize: px(fontSize), color: "#111" }} />
                </Text>
                <DateRange start={ed.startDate} end={ed.endDate} font={F} lang={lang} />
              </View>
              {ed.degree ? <RichText html={ed.degree} style={{ fontFamily: F, fontSize: px(fontSize - 2), color: "#555" }} /> : null}
              {ed.description ? <RichText html={ed.description} style={{ fontFamily: F, fontSize: px(fontSize - 1), color: "#444", lineHeight: 1.6, marginTop: px(2) }} /> : null}
            </View>
          )));
        }
        if (k === "skill" && data.skills.length > 0) {
          return renderCard(k, resumeT(lang).skill, data.skills.map((s) => (
            <View key={s.id} style={{ marginBottom: px(5) }}>
              <RichText html={s.name} style={{ fontFamily: F, fontWeight: 700, fontSize: px(fontSize - 1), color: "#111" }} />
              <SkillTags items={s.items} accent={accentColor} font={F} fontSize={fontSize} />
            </View>
          )));
        }
        if (k.startsWith("custom:")) {
          const cs = data.customSections.find((c) => `custom:${c.id}` === k);
          if (!cs) return null;
          return renderCard(k, htmlToPlainText(cs.title) || resumeT(lang).custom, (
            <View>
              <RichTextLines html={cs.content} style={{ fontFamily: F, fontSize: px(fontSize - 1), color: "#444", lineHeight: 1.7 }} />
              <Images images={cs.images} accent={accentColor} />
            </View>
          ));
        }
        return null;
      })}
    </Page>
  );
}

/* ---------- 经典模板 ---------- */

function ClassicTemplate({ data, lang, accentColor, fontSize, cnFontFamily, enFontFamily, showAvatar, paperSize, sectionOrder, avatarShape, avatarSize }: Props) {
  const p = data.personal;
  const F = fontPdfStack(enFontFamily, cnFontFamily);
  const order = orderedSections(data, sectionOrder);
  const ctx: SectionCtx = { data, accentColor, fontSize, font: F, lang };
  const styles = StyleSheet.create({
    page: { fontFamily: F, fontSize: px(fontSize), paddingTop: px(36), paddingBottom: px(36), paddingHorizontal: px(40), color: "#222" },
    header: { marginBottom: px(14), alignItems: "center" },
    name: { fontSize: px(fontSize + 12), fontWeight: 700, color: "#111", textAlign: "center" },
    title: { fontSize: px(fontSize + 2), color: accentColor, marginTop: px(4), textAlign: "center" },
    contact: { fontSize: px(fontSize - 4), color: "#555", marginTop: px(6), textAlign: "center", lineHeight: 1.6 },
  });
  return (
    <Page size={getPaper(paperSize).pdfSize as any} style={styles.page} wrap>
      <View style={styles.header}>
        {showAvatar ? <Avatar src={p.avatar} size={avatarSize} accent={accentColor} shape={avatarShape} /> : null}
        {p.fullName ? <RichText html={p.fullName} style={styles.name} /> : null}
        {p.jobTitle ? <RichText html={p.jobTitle} style={styles.title} /> : null}
        <Text style={styles.contact}>{contactText(p, "  ·  ")}</Text>
      </View>
      {order.map((k) => renderSectionByKey(k, ctx))}
    </Page>
  );
}

/* ---------- 紧凑模板 ---------- */

function CompactTemplate({ data, lang, accentColor, fontSize, cnFontFamily, enFontFamily, showAvatar, paperSize, sectionOrder, avatarShape, avatarSize }: Props) {
  const p = data.personal;
  const F = fontPdfStack(enFontFamily, cnFontFamily);
  const order = orderedSections(data, sectionOrder);
  const ctx: SectionCtx = { data, accentColor, fontSize, font: F, dense: true, lang };
  const styles = StyleSheet.create({
    page: { fontFamily: F, fontSize: px(fontSize), paddingTop: px(26), paddingBottom: px(26), paddingHorizontal: px(34), color: "#222" },
    header: { marginBottom: px(8), flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    name: { fontSize: px(fontSize + 10), fontWeight: 700, color: "#111" },
    title: { fontSize: px(fontSize), color: accentColor, marginTop: px(2) },
    contact: { fontSize: px(fontSize - 4), color: "#555", marginTop: px(4), lineHeight: 1.6 },
  });
  return (
    <Page size={getPaper(paperSize).pdfSize as any} style={styles.page} wrap>
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: px(8) }}>
          {showAvatar ? <Avatar src={p.avatar} size={avatarSize} accent={accentColor} shape={avatarShape} /> : null}
          <View>
            {p.fullName ? <RichText html={p.fullName} style={styles.name} /> : null}
            {p.jobTitle ? <RichText html={p.jobTitle} style={styles.title} /> : null}
          </View>
        </View>
        <Text style={styles.contact}>{contactText(p, "\n")}</Text>
      </View>
      {order.map((k) => renderSectionByKey(k, ctx))}
    </Page>
  );
}

/* ---------- 优雅模板 ---------- */

function ElegantTemplate({ data, lang, accentColor, fontSize, cnFontFamily, enFontFamily, showAvatar, paperSize, sectionOrder, avatarShape, avatarSize }: Props) {
  const p = data.personal;
  const F = fontPdfStack(enFontFamily, cnFontFamily);
  const order = orderedSections(data, sectionOrder);
  const ctx: SectionCtx = { data, accentColor, fontSize, font: F, lang };
  const styles = StyleSheet.create({
    page: { fontFamily: F, fontSize: px(fontSize), paddingTop: px(40), paddingBottom: px(40), paddingHorizontal: px(48), color: "#222" },
    header: { marginBottom: px(16), alignItems: "center" },
    name: { fontSize: px(fontSize + 14), fontWeight: 700, color: "#111", textAlign: "center", letterSpacing: px(2) },
    title: { fontSize: px(fontSize + 2), color: accentColor, marginTop: px(5), textAlign: "center", letterSpacing: px(1) },
    rule: { width: px(60), height: px(2), backgroundColor: accentColor, marginTop: px(10), marginBottom: px(8) },
    contact: { fontSize: px(fontSize - 4), color: "#666", marginTop: px(6), textAlign: "center", lineHeight: 1.6 },
  });
  return (
    <Page size={getPaper(paperSize).pdfSize as any} style={styles.page} wrap>
      <View style={styles.header}>
        {showAvatar ? <Avatar src={p.avatar} size={avatarSize} accent={accentColor} shape={avatarShape} /> : null}
        {p.fullName ? <RichText html={p.fullName} style={styles.name} /> : null}
        {p.jobTitle ? <RichText html={p.jobTitle} style={styles.title} /> : null}
        <View style={styles.rule} />
        <Text style={styles.contact}>{contactText(p, "  ·  ")}</Text>
      </View>
      {order.map((k) => renderSectionByKey(k, ctx))}
    </Page>
  );
}

/* ---------- 极简模板 ---------- */

function MinimalTemplate({ data, lang, accentColor, fontSize, cnFontFamily, enFontFamily, showAvatar, paperSize, sectionOrder, avatarShape, avatarSize }: Props) {
  const p = data.personal;
  const F = fontPdfStack(enFontFamily, cnFontFamily);
  const order = orderedSections(data, sectionOrder);
  const ctx: SectionCtx = { data, accentColor, fontSize, font: F, minimal: true, lang };
  const styles = StyleSheet.create({
    page: { fontFamily: F, fontSize: px(fontSize), paddingTop: px(46), paddingBottom: px(46), paddingHorizontal: px(52), color: "#222" },
    header: { marginBottom: px(20), flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: px(1), borderBottomColor: "#111", paddingBottom: px(12) },
    name: { fontSize: px(fontSize + 16), fontWeight: 700, color: "#111", letterSpacing: px(1) },
    title: { fontSize: px(fontSize), color: accentColor, marginTop: px(4), letterSpacing: px(3) },
    contact: { fontSize: px(fontSize - 4), color: "#555", lineHeight: 1.7 },
  });
  return (
    <Page size={getPaper(paperSize).pdfSize as any} style={styles.page} wrap>
      <View style={styles.header}>
        <View>
          {p.fullName ? <RichText html={p.fullName} style={styles.name} /> : null}
          {p.jobTitle ? <RichText html={p.jobTitle} style={styles.title} /> : null}
        </View>
        <Text style={styles.contact}>{contactText(p, "\n")}</Text>
      </View>
      {order.map((k) => renderSectionByKey(k, ctx))}
    </Page>
  );
}

/* ---------- 极客模板（程序员高密度） ---------- */

function GeekTemplate({ data, lang, accentColor, fontSize, cnFontFamily, enFontFamily, showAvatar, paperSize, sectionOrder, avatarShape, avatarSize }: Props) {
  const p = data.personal;
  const F = fontPdfStack(enFontFamily, cnFontFamily);
  const order = orderedSections(data, sectionOrder);
  const ctx: SectionCtx = { data, accentColor, fontSize, font: F, dense: true, lang };
  const styles = StyleSheet.create({
    page: { fontFamily: F, fontSize: px(fontSize), paddingTop: px(24), paddingBottom: px(24), paddingHorizontal: px(30), color: "#222" },
    header: { marginBottom: px(8), flexDirection: "row", alignItems: "center", gap: px(10), borderBottomWidth: px(2), borderBottomColor: accentColor, paddingBottom: px(6) },
    name: { fontSize: px(fontSize + 8), fontWeight: 700, color: "#111" },
    title: { fontSize: px(fontSize - 1), color: accentColor, marginTop: px(1) },
    contact: { fontSize: px(fontSize - 4), color: "#555", marginTop: px(3), lineHeight: 1.5 },
  });
  return (
    <Page size={getPaper(paperSize).pdfSize as any} style={styles.page} wrap>
      <View style={styles.header}>
        {showAvatar ? <Avatar src={p.avatar} size={avatarSize} accent={accentColor} shape={avatarShape} /> : null}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: px(8) }}>
            {p.fullName ? <RichText html={p.fullName} style={styles.name} /> : null}
            {p.jobTitle ? <RichText html={p.jobTitle} style={styles.title} /> : null}
          </View>
          <Text style={styles.contact}>{contactText(p, "  ·  ")}</Text>
        </View>
      </View>
      {order.map((k) => renderSectionByKey(k, ctx))}
    </Page>
  );
}

/* ---------- 深色侧栏模板 ---------- */

function SidebarTemplate({ data, lang, accentColor, fontSize, cnFontFamily, enFontFamily, showAvatar, paperSize, sectionOrder, avatarShape, avatarSize }: Props) {
  const p = data.personal;
  const F = fontPdfStack(enFontFamily, cnFontFamily);
  const mainOrder = orderedSections(data, sectionOrder).filter((k) => ["summary", "experience", "project", "education"].includes(k));
  const ctx: SectionCtx = { data, accentColor, fontSize, font: F, lang };
  const styles = StyleSheet.create({
    page: { fontFamily: F, fontSize: px(fontSize), flexDirection: "row", color: "#222" },
    sidebar: { width: "34%", backgroundColor: "#1f2937", paddingTop: px(30), paddingHorizontal: px(18), paddingBottom: px(30) },
    main: { width: "66%", paddingTop: px(30), paddingHorizontal: px(24), paddingBottom: px(30) },
    sideName: { fontSize: px(fontSize + 8), fontWeight: 700, color: "#fff" },
    sideTitle: { fontSize: px(fontSize), color: "#93c5fd", marginTop: px(3) },
    sideHeading: { fontSize: px(fontSize), fontWeight: 700, color: "#fff", marginTop: px(16), marginBottom: px(6), borderBottomWidth: px(1), borderBottomColor: "#4b5563", paddingBottom: px(3) },
    sideText: { fontSize: px(fontSize - 2), color: "#d1d5db", lineHeight: 1.6 },
    name: { fontSize: px(fontSize + 12), fontWeight: 700, color: "#111" },
    title: { fontSize: px(fontSize + 1), color: accentColor, marginTop: px(2) },
    contact: { fontSize: px(fontSize - 3), color: "#555", marginTop: px(8), lineHeight: 1.7 },
  });
  return (
    <Page size={getPaper(paperSize).pdfSize as any} style={styles.page} wrap>
      <View style={styles.sidebar}>
        {showAvatar ? <Avatar src={p.avatar} size={avatarSize} accent="#fff" shape={avatarShape} /> : null}
        {p.fullName ? <RichText html={p.fullName} style={styles.sideName} /> : null}
        {p.jobTitle ? <RichText html={p.jobTitle} style={styles.sideTitle} /> : null}
        <Text style={styles.sideHeading}>{resumeT(lang).contact}</Text>
        <Text style={styles.sideText}>{contactText(p, "\n") || resumeT(lang).unfilled}</Text>
        {data.skills.length > 0 ? (
          <>
            <Text style={styles.sideHeading}>{resumeT(lang).skill}</Text>
            {data.skills.map((s) => (
              <View key={s.id} style={{ marginBottom: px(5) }}>
                <RichText html={s.name} style={{ fontFamily: F, fontSize: px(fontSize - 2), fontWeight: 700, color: "#fff" }} />
                <RichText html={s.items} style={styles.sideText} />
              </View>
            ))}
          </>
        ) : null}
        {data.customSections.map((cs) => (
          <View key={cs.id}>
            <Text style={styles.sideHeading}>{htmlToPlainText(cs.title)}</Text>
            <RichTextLines html={cs.content} style={styles.sideText} />
            <Images images={cs.images} accent="#93c5fd" />
          </View>
        ))}
      </View>
      <View style={styles.main}>
        {p.fullName ? <RichText html={p.fullName} style={styles.name} /> : null}
        {p.jobTitle ? <RichText html={p.jobTitle} style={styles.title} /> : null}
        <Text style={styles.contact}>{contactText(p, "  ·  ")}</Text>
        {mainOrder.map((k) => renderSectionByKey(k, ctx))}
      </View>
    </Page>
  );
}

/* ---------- 现代模板 ---------- */

function ModernTemplate({ data, lang, accentColor, fontSize, cnFontFamily, enFontFamily, showAvatar, paperSize, sectionOrder, avatarShape, avatarSize }: Props) {
  const p = data.personal;
  const F = fontPdfStack(enFontFamily, cnFontFamily);
  const mainOrder = orderedSections(data, sectionOrder).filter((k) => ["summary", "experience", "project", "education"].includes(k));
  const ctx: SectionCtx = { data, accentColor, fontSize, font: F, lang };
  const styles = StyleSheet.create({
    page: { fontFamily: F, fontSize: px(fontSize), flexDirection: "row", color: "#222" },
    sidebar: { width: "32%", backgroundColor: "#f3f4f6", paddingTop: px(30), paddingHorizontal: px(18), paddingBottom: px(30) },
    main: { width: "68%", paddingTop: px(30), paddingHorizontal: px(24), paddingBottom: px(30) },
    sideName: { fontSize: px(fontSize + 8), fontWeight: 700, color: "#111" },
    sideTitle: { fontSize: px(fontSize), color: accentColor, marginTop: px(3) },
    sideHeading: { fontSize: px(fontSize), fontWeight: 700, color: "#111", marginTop: px(16), marginBottom: px(6), borderBottomWidth: px(1), borderBottomColor: "#d1d5db", paddingBottom: px(3) },
    sideText: { fontSize: px(fontSize - 2), color: "#333", lineHeight: 1.6 },
    name: { fontSize: px(fontSize + 12), fontWeight: 700, color: "#111" },
    title: { fontSize: px(fontSize + 1), color: accentColor, marginTop: px(2) },
    contact: { fontSize: px(fontSize - 3), color: "#555", marginTop: px(8), lineHeight: 1.7 },
  });
  return (
    <Page size={getPaper(paperSize).pdfSize as any} style={styles.page} wrap>
      <View style={styles.sidebar}>
        {showAvatar ? <Avatar src={p.avatar} size={avatarSize} accent={accentColor} shape={avatarShape} /> : null}
        {p.fullName ? <RichText html={p.fullName} style={styles.sideName} /> : null}
        {p.jobTitle ? <RichText html={p.jobTitle} style={styles.sideTitle} /> : null}
        <Text style={styles.sideHeading}>{resumeT(lang).contact}</Text>
        <Text style={styles.sideText}>{contactText(p, "\n") || resumeT(lang).unfilled}</Text>
        {data.skills.length > 0 ? (
          <>
            <Text style={styles.sideHeading}>{resumeT(lang).skill}</Text>
            {data.skills.map((s) => (
              <View key={s.id} style={{ marginBottom: px(5) }}>
                <RichText html={s.name} style={{ fontFamily: F, fontSize: px(fontSize - 2), fontWeight: 700, color: "#111" }} />
                <RichText html={s.items} style={styles.sideText} />
              </View>
            ))}
          </>
        ) : null}
        {data.customSections.map((cs) => (
          <View key={cs.id}>
            <Text style={styles.sideHeading}>{htmlToPlainText(cs.title)}</Text>
            <RichTextLines html={cs.content} style={styles.sideText} />
            <Images images={cs.images} accent={accentColor} />
          </View>
        ))}
      </View>
      <View style={styles.main}>
        {p.fullName ? <RichText html={p.fullName} style={styles.name} /> : null}
        {p.jobTitle ? <RichText html={p.jobTitle} style={styles.title} /> : null}
        <Text style={styles.contact}>{contactText(p, "  ·  ")}</Text>
        {mainOrder.map((k) => renderSectionByKey(k, ctx))}
      </View>
    </Page>
  );
}

/* ---------- 时间轴模板 ---------- */

function TimelineTemplate({ data, lang, accentColor, fontSize, cnFontFamily, enFontFamily, showAvatar, paperSize, sectionOrder, avatarShape, avatarSize }: Props) {
  const p = data.personal;
  const F = fontPdfStack(enFontFamily, cnFontFamily);
  const order = orderedSections(data, sectionOrder);
  const ctx: SectionCtx = { data, accentColor, fontSize, font: F, lang };
  const styles = StyleSheet.create({
    page: { fontFamily: F, fontSize: px(fontSize), paddingTop: px(36), paddingBottom: px(36), paddingHorizontal: px(44), color: "#222" },
    header: { marginBottom: px(14), flexDirection: "row", alignItems: "center", gap: px(10) },
    name: { fontSize: px(fontSize + 12), fontWeight: 700, color: "#111" },
    title: { fontSize: px(fontSize + 2), color: accentColor, marginTop: px(4) },
    contact: { fontSize: px(fontSize - 4), color: "#555", marginTop: px(6), lineHeight: 1.6 },
  });
  return (
    <Page size={getPaper(paperSize).pdfSize as any} style={styles.page} wrap>
      <View style={styles.header}>
        {showAvatar ? <Avatar src={p.avatar} size={avatarSize} accent={accentColor} shape={avatarShape} /> : null}
        <View>
          {p.fullName ? <RichText html={p.fullName} style={styles.name} /> : null}
          {p.jobTitle ? <RichText html={p.jobTitle} style={styles.title} /> : null}
        </View>
      </View>
      <Text style={styles.contact}>{contactText(p, "  ·  ")}</Text>
      {order.map((k) => renderSectionByKey(k, ctx))}
    </Page>
  );
}
