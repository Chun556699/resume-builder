"use client";

import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { ResumeData, TemplateId, PaperSize, FontFamily, AvatarShape } from "@/types/resume";
import { getPaper } from "@/lib/paper";
import { getFont } from "@/lib/fonts";
import { splitBullets, buildSectionOrder } from "@/lib/utils";

export { splitBullets };

interface Props {
  data: ResumeData;
  template: TemplateId;
  accentColor: string;
  fontSize: number;
  paperSize: PaperSize;
  fontFamily: FontFamily;
  showAvatar: boolean;
  avatarShape: AvatarShape;
  avatarSize: number;
  sectionOrder: string[];
}

export function ResumePdfDocument(props: Props) {
  const { data, template } = props;
  const cleanName = (data.personal.fullName || "").replace(/<[^>]*>/g, "").trim() || "简历";
  return (
    <Document
      title={`${cleanName}_简历`}
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
       <ClassicTemplate {...props} />}
    </Document>
  );
}

/* ---------- 通用小部件 ---------- */

function Bullets({ items, fontSize, color, font, dense }: { items: string[]; fontSize: number; color: string; font: string; dense?: boolean }) {
  return (
    <View style={{ marginTop: dense ? 1 : 3 }}>
      {items.map((line, i) => (
        <View key={i} style={{ flexDirection: "row", marginBottom: dense ? 0.5 : 1.5 }}>
          <Text style={{ color, fontSize: fontSize - 1, lineHeight: dense ? 1.35 : 1.5, marginRight: 5, fontFamily: font }}>•</Text>
          <RichText html={line} style={{ color: "#333", fontSize: fontSize - 1, lineHeight: dense ? 1.35 : 1.5, flex: 1, fontFamily: font }} />
        </View>
      ))}
    </View>
  );
}

function SectionTitle({ text, color, fontSize, font, underline = true, minimal = false }: { text: string; color: string; fontSize: number; font: string; underline?: boolean; minimal?: boolean }) {
  return (
    <View style={{ marginBottom: 5, paddingBottom: 3, borderBottomWidth: underline ? 1 : 0, borderBottomColor: minimal ? "#111" : "#e5e7eb" }}>
      <Text style={{ fontFamily: font, fontWeight: 700, fontSize: fontSize + (minimal ? 0 : 2), color, letterSpacing: minimal ? 2 : 0 }}>{text}</Text>
    </View>
  );
}

function DateRange({ start, end, current, font }: { start: string; end: string; current?: boolean; font: string }) {
  const text = current ? `${start} - 至今` : `${start} - ${end}`;
  return <Text style={{ fontFamily: font, fontSize: 9, color: "#666" }}>{text}</Text>;
}

function Avatar({ src, size, accent, shape }: { src?: string; size: number; accent: string; shape?: AvatarShape }) {
  if (!src) return null;
  const radius = shape === "square" ? 4 : size / 2;
  return (
    <View style={{ width: size, height: size, borderRadius: radius, overflow: "hidden", borderWidth: 2, borderColor: accent }}>
      <Image src={src} style={{ width: size, height: size, objectFit: "cover" }} />
    </View>
  );
}

function Images({ images, accent }: { images: string[]; accent: string }) {
  const list = (images || []).filter(Boolean);
  if (list.length === 0) return null;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 5 }}>
      {list.map((img, i) => (
        <View key={i} style={{ width: 70, height: 50, borderRadius: 3, overflow: "hidden", borderWidth: 1, borderColor: "#ddd" }}>
          <Image src={img} style={{ width: 70, height: 50, objectFit: "cover" }} />
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
        runs.push({ text: child.textContent || "", style: { ...style } });
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
          if (mFs) ns.fontSize = parseFloat(mFs[1]);
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

function RichText({ html, style }: { html: string; style: any }) {
  const runs = parseInlineHtml(html);
  return (
    <Text style={style}>
      {runs.map((r, i) => (
        <Text key={i} style={{ ...style, ...r.style }}>{r.text}</Text>
      ))}
    </Text>
  );
}

function RichTextLines({ html, style, lineStyle }: { html: string; style: any; lineStyle?: any }) {
  const lines = (html || "").split(/\n+/);
  return (
    <View>
      {lines.map((ln, i) => (
        <View key={i} style={{ marginBottom: i < lines.length - 1 ? 2 : 0, ...(lineStyle || {}) }}>
          <RichText html={ln} style={style} />
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
  font: string;
  dense?: boolean;
  minimal?: boolean;
}

function renderSectionByKey(key: string, ctx: SectionCtx): React.ReactNode {
  const { data, accentColor, fontSize, font, dense, minimal } = ctx;
  const p = data.personal;

  if (key === "summary" && p.summary) {
    return (
      <View key="summary" style={{ marginTop: dense ? 6 : 10 }}>
        <SectionTitle text="个人简介" color={accentColor} fontSize={fontSize} font={font} minimal={minimal} />
        <RichTextLines html={p.summary} style={{ fontFamily: font, fontSize: fontSize - 1, color: "#444", lineHeight: dense ? 1.4 : 1.7 }} />
      </View>
    );
  }
  if (key === "experience" && data.experiences.length > 0) {
    return (
      <View key="experience" style={{ marginTop: dense ? 6 : 10 }}>
        <SectionTitle text="工作经历" color={accentColor} fontSize={fontSize} font={font} minimal={minimal} />
        {data.experiences.map((e) => (
          <View key={e.id} style={{ marginBottom: dense ? 5 : 9 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
              <Text style={{ fontFamily: font, fontWeight: 700, fontSize: fontSize - (dense ? 1 : 0), color: "#111" }}>
                {e.position}{e.company ? ` · ${e.company}` : ""}
              </Text>
              <DateRange start={e.startDate} end={e.endDate} current={e.current} font={font} />
            </View>
            {e.location ? <Text style={{ fontFamily: font, fontSize: fontSize - 2, color: "#777" }}>{e.location}</Text> : null}
            <Bullets items={splitBullets(e.description)} fontSize={fontSize} color={accentColor} font={font} dense={dense} />
          </View>
        ))}
      </View>
    );
  }
  if (key === "project" && data.projects.length > 0) {
    return (
      <View key="project" style={{ marginTop: dense ? 6 : 10 }}>
        <SectionTitle text="项目经历" color={accentColor} fontSize={fontSize} font={font} minimal={minimal} />
        {data.projects.map((pr) => (
          <View key={pr.id} style={{ marginBottom: dense ? 5 : 9 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
              <Text style={{ fontFamily: font, fontWeight: 700, fontSize: fontSize - (dense ? 1 : 0), color: "#111" }}>
                {pr.name}{pr.role ? ` · ${pr.role}` : ""}
              </Text>
              <DateRange start={pr.startDate} end={pr.endDate} font={font} />
            </View>
            {pr.link ? <Text style={{ fontFamily: font, fontSize: fontSize - 3, color: accentColor }}>{pr.link}</Text> : null}
            <Bullets items={splitBullets(pr.description)} fontSize={fontSize} color={accentColor} font={font} dense={dense} />
          </View>
        ))}
      </View>
    );
  }
  if (key === "education" && data.education.length > 0) {
    return (
      <View key="education" style={{ marginTop: dense ? 6 : 10 }}>
        <SectionTitle text="教育经历" color={accentColor} fontSize={fontSize} font={font} minimal={minimal} />
        {data.education.map((ed) => (
          <View key={ed.id} style={{ marginBottom: dense ? 4 : 7 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
              <Text style={{ fontFamily: font, fontWeight: 700, fontSize: fontSize - (dense ? 1 : 0), color: "#111" }}>
                {ed.school}{ed.major ? ` · ${ed.major}` : ""}
              </Text>
              <DateRange start={ed.startDate} end={ed.endDate} font={font} />
            </View>
            {ed.degree ? <Text style={{ fontFamily: font, fontSize: fontSize - 2, color: "#555" }}>{ed.degree}</Text> : null}
            {ed.description ? <RichText html={ed.description} style={{ fontFamily: font, fontSize: fontSize - 1, color: "#444", lineHeight: 1.6, marginTop: 2 }} /> : null}
          </View>
        ))}
      </View>
    );
  }
  if (key === "skill" && data.skills.length > 0) {
    return (
      <View key="skill" style={{ marginTop: dense ? 6 : 10 }}>
        <SectionTitle text="专业技能" color={accentColor} fontSize={fontSize} font={font} minimal={minimal} />
        {data.skills.map((s) => (
          <View key={s.id} style={{ flexDirection: dense ? "row" : "column", marginBottom: dense ? 2 : 3 }}>
            <Text style={{ fontFamily: font, fontWeight: 700, fontSize: fontSize - 1, color: "#111", width: dense ? 48 : undefined }}>
              {s.name}{dense ? "" : "："}
            </Text>
            <RichText html={s.items} style={{ fontFamily: font, fontSize: fontSize - 1, color: "#333", lineHeight: dense ? 1.35 : 1.6, flex: 1 }} />
          </View>
        ))}
      </View>
    );
  }
  if (key.startsWith("custom:")) {
    const cs = data.customSections.find((c) => `custom:${c.id}` === key);
    if (!cs) return null;
    return (
      <View key={key} style={{ marginTop: dense ? 6 : 10 }}>
        <SectionTitle text={cs.title} color={accentColor} fontSize={fontSize} font={font} minimal={minimal} />
        <RichTextLines html={cs.content} style={{ fontFamily: font, fontSize: fontSize - 1, color: "#444", lineHeight: dense ? 1.4 : 1.7 }} />
        <Images images={cs.images} accent={accentColor} />
      </View>
    );
  }
  return null;
}

function orderedSections(data: ResumeData, sectionOrder?: string[]): string[] {
  return buildSectionOrder(data, sectionOrder);
}

/* ---------- 经典模板 ---------- */

function ClassicTemplate({ data, accentColor, fontSize, fontFamily, showAvatar, paperSize, sectionOrder, avatarShape, avatarSize }: Props) {
  const p = data.personal;
  const F = getFont(fontFamily).pdfFamily;
  const order = orderedSections(data, sectionOrder);
  const ctx: SectionCtx = { data, accentColor, fontSize, font: F };
  const styles = StyleSheet.create({
    page: { fontFamily: F, fontSize, paddingTop: 36, paddingBottom: 36, paddingHorizontal: 40, color: "#222" },
    header: { marginBottom: 14, alignItems: "center" },
    name: { fontSize: fontSize + 12, fontWeight: 700, color: "#111", textAlign: "center" },
    title: { fontSize: fontSize + 2, color: accentColor, marginTop: 4, textAlign: "center" },
    contact: { fontSize: fontSize - 4, color: "#555", marginTop: 6, textAlign: "center", lineHeight: 1.6 },
  });
  return (
    <Page size={getPaper(paperSize).pdfSize as any} style={styles.page} wrap>
      <View style={styles.header}>
        {showAvatar ? <Avatar src={p.avatar} size={avatarSize} accent={accentColor} shape={avatarShape} /> : null}
        {p.fullName ? <Text style={styles.name}>{p.fullName}</Text> : null}
        {p.jobTitle ? <Text style={styles.title}>{p.jobTitle}</Text> : null}
        <Text style={styles.contact}>{[p.email, p.phone, p.location, p.website].filter(Boolean).join("  ·  ")}</Text>
      </View>
      {order.map((k) => renderSectionByKey(k, ctx))}
    </Page>
  );
}

/* ---------- 紧凑模板 ---------- */

function CompactTemplate({ data, accentColor, fontSize, fontFamily, showAvatar, paperSize, sectionOrder, avatarShape, avatarSize }: Props) {
  const p = data.personal;
  const F = getFont(fontFamily).pdfFamily;
  const order = orderedSections(data, sectionOrder);
  const ctx: SectionCtx = { data, accentColor, fontSize, font: F, dense: true };
  const styles = StyleSheet.create({
    page: { fontFamily: F, fontSize, paddingTop: 26, paddingBottom: 26, paddingHorizontal: 34, color: "#222" },
    header: { marginBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    name: { fontSize: fontSize + 10, fontWeight: 700, color: "#111" },
    title: { fontSize, color: accentColor, marginTop: 2 },
    contact: { fontSize: fontSize - 4, color: "#555", marginTop: 4, lineHeight: 1.6 },
  });
  return (
    <Page size={getPaper(paperSize).pdfSize as any} style={styles.page} wrap>
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {showAvatar ? <Avatar src={p.avatar} size={avatarSize} accent={accentColor} shape={avatarShape} /> : null}
          <View>
            {p.fullName ? <Text style={styles.name}>{p.fullName}</Text> : null}
            {p.jobTitle ? <Text style={styles.title}>{p.jobTitle}</Text> : null}
          </View>
        </View>
        <Text style={styles.contact}>{[p.email, p.phone, p.location, p.website].filter(Boolean).join("\n")}</Text>
      </View>
      {order.map((k) => renderSectionByKey(k, ctx))}
    </Page>
  );
}

/* ---------- 优雅模板 ---------- */

function ElegantTemplate({ data, accentColor, fontSize, fontFamily, showAvatar, paperSize, sectionOrder, avatarShape, avatarSize }: Props) {
  const p = data.personal;
  const F = getFont(fontFamily).pdfFamily;
  const order = orderedSections(data, sectionOrder);
  const ctx: SectionCtx = { data, accentColor, fontSize, font: F };
  const styles = StyleSheet.create({
    page: { fontFamily: F, fontSize, paddingTop: 40, paddingBottom: 40, paddingHorizontal: 48, color: "#222" },
    header: { marginBottom: 16, alignItems: "center" },
    name: { fontSize: fontSize + 14, fontWeight: 700, color: "#111", textAlign: "center", letterSpacing: 2 },
    title: { fontSize: fontSize + 2, color: accentColor, marginTop: 5, textAlign: "center", letterSpacing: 1 },
    rule: { width: 60, height: 2, backgroundColor: accentColor, marginTop: 10, marginBottom: 8 },
    contact: { fontSize: fontSize - 4, color: "#666", marginTop: 6, textAlign: "center", lineHeight: 1.6 },
  });
  return (
    <Page size={getPaper(paperSize).pdfSize as any} style={styles.page} wrap>
      <View style={styles.header}>
        {showAvatar ? <Avatar src={p.avatar} size={avatarSize} accent={accentColor} shape={avatarShape} /> : null}
        {p.fullName ? <Text style={styles.name}>{p.fullName}</Text> : null}
        {p.jobTitle ? <Text style={styles.title}>{p.jobTitle}</Text> : null}
        <View style={styles.rule} />
        <Text style={styles.contact}>{[p.email, p.phone, p.location, p.website].filter(Boolean).join("  ·  ")}</Text>
      </View>
      {order.map((k) => renderSectionByKey(k, ctx))}
    </Page>
  );
}

/* ---------- 极简模板 ---------- */

function MinimalTemplate({ data, accentColor, fontSize, fontFamily, showAvatar, paperSize, sectionOrder, avatarShape, avatarSize }: Props) {
  const p = data.personal;
  const F = getFont(fontFamily).pdfFamily;
  const order = orderedSections(data, sectionOrder);
  const ctx: SectionCtx = { data, accentColor, fontSize, font: F, minimal: true };
  const styles = StyleSheet.create({
    page: { fontFamily: F, fontSize, paddingTop: 46, paddingBottom: 46, paddingHorizontal: 52, color: "#222" },
    header: { marginBottom: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 1, borderBottomColor: "#111", paddingBottom: 12 },
    name: { fontSize: fontSize + 16, fontWeight: 700, color: "#111", letterSpacing: 1 },
    title: { fontSize: fontSize, color: accentColor, marginTop: 4, letterSpacing: 3 },
    contact: { fontSize: fontSize - 4, color: "#555", lineHeight: 1.7 },
  });
  return (
    <Page size={getPaper(paperSize).pdfSize as any} style={styles.page} wrap>
      <View style={styles.header}>
        <View>
          {p.fullName ? <Text style={styles.name}>{p.fullName}</Text> : null}
          {p.jobTitle ? <Text style={styles.title}>{p.jobTitle}</Text> : null}
        </View>
        <Text style={styles.contact}>{[p.email, p.phone, p.location, p.website].filter(Boolean).join("\n")}</Text>
      </View>
      {order.map((k) => renderSectionByKey(k, ctx))}
    </Page>
  );
}

/* ---------- 极客模板（程序员高密度） ---------- */

function GeekTemplate({ data, accentColor, fontSize, fontFamily, showAvatar, paperSize, sectionOrder, avatarShape, avatarSize }: Props) {
  const p = data.personal;
  const F = getFont(fontFamily).pdfFamily;
  const order = orderedSections(data, sectionOrder);
  const ctx: SectionCtx = { data, accentColor, fontSize, font: F, dense: true };
  const styles = StyleSheet.create({
    page: { fontFamily: F, fontSize, paddingTop: 24, paddingBottom: 24, paddingHorizontal: 30, color: "#222" },
    header: { marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 2, borderBottomColor: accentColor, paddingBottom: 6 },
    name: { fontSize: fontSize + 8, fontWeight: 700, color: "#111" },
    title: { fontSize: fontSize - 1, color: accentColor, marginTop: 1 },
    contact: { fontSize: fontSize - 4, color: "#555", marginTop: 3, lineHeight: 1.5 },
  });
  return (
    <Page size={getPaper(paperSize).pdfSize as any} style={styles.page} wrap>
      <View style={styles.header}>
        {showAvatar ? <Avatar src={p.avatar} size={avatarSize} accent={accentColor} shape={avatarShape} /> : null}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
            {p.fullName ? <Text style={styles.name}>{p.fullName}</Text> : null}
            {p.jobTitle ? <Text style={styles.title}>{p.jobTitle}</Text> : null}
          </View>
          <Text style={styles.contact}>{[p.email, p.phone, p.location, p.website].filter(Boolean).join("  ·  ")}</Text>
        </View>
      </View>
      {order.map((k) => renderSectionByKey(k, ctx))}
    </Page>
  );
}

/* ---------- 深色侧栏模板 ---------- */

function SidebarTemplate({ data, accentColor, fontSize, fontFamily, showAvatar, paperSize, sectionOrder, avatarShape, avatarSize }: Props) {
  const p = data.personal;
  const F = getFont(fontFamily).pdfFamily;
  const mainOrder = orderedSections(data, sectionOrder).filter((k) => ["summary", "experience", "project", "education"].includes(k));
  const ctx: SectionCtx = { data, accentColor, fontSize, font: F };
  const styles = StyleSheet.create({
    page: { fontFamily: F, fontSize, flexDirection: "row", color: "#222" },
    sidebar: { width: "34%", backgroundColor: "#1f2937", paddingTop: 30, paddingHorizontal: 18, paddingBottom: 30 },
    main: { width: "66%", paddingTop: 30, paddingHorizontal: 24, paddingBottom: 30 },
    sideName: { fontSize: fontSize + 8, fontWeight: 700, color: "#fff" },
    sideTitle: { fontSize, color: "#93c5fd", marginTop: 3 },
    sideHeading: { fontSize, fontWeight: 700, color: "#fff", marginTop: 16, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: "#4b5563", paddingBottom: 3 },
    sideText: { fontSize: fontSize - 2, color: "#d1d5db", lineHeight: 1.6 },
    name: { fontSize: fontSize + 12, fontWeight: 700, color: "#111" },
    title: { fontSize: fontSize + 1, color: accentColor, marginTop: 2 },
    contact: { fontSize: fontSize - 3, color: "#555", marginTop: 8, lineHeight: 1.7 },
  });
  return (
    <Page size={getPaper(paperSize).pdfSize as any} style={styles.page} wrap>
      <View style={styles.sidebar}>
        {showAvatar ? <Avatar src={p.avatar} size={avatarSize} accent="#fff" shape={avatarShape} /> : null}
        {p.fullName ? <Text style={styles.sideName}>{p.fullName}</Text> : null}
        {p.jobTitle ? <Text style={styles.sideTitle}>{p.jobTitle}</Text> : null}
        <Text style={styles.sideHeading}>联系方式</Text>
        <Text style={styles.sideText}>{[p.email, p.phone, p.location, p.website].filter(Boolean).join("\n") || "（未填写）"}</Text>
        {data.skills.length > 0 ? (
          <>
            <Text style={styles.sideHeading}>专业技能</Text>
            {data.skills.map((s) => (
              <View key={s.id} style={{ marginBottom: 5 }}>
                <Text style={{ fontFamily: F, fontSize: fontSize - 2, fontWeight: 700, color: "#fff" }}>{s.name}</Text>
                <Text style={styles.sideText}>{s.items}</Text>
              </View>
            ))}
          </>
        ) : null}
        {data.customSections.map((cs) => (
          <View key={cs.id}>
            <Text style={styles.sideHeading}>{cs.title}</Text>
            <Text style={styles.sideText}>{cs.content}</Text>
            <Images images={cs.images} accent="#93c5fd" />
          </View>
        ))}
      </View>
      <View style={styles.main}>
        {p.fullName ? <Text style={styles.name}>{p.fullName}</Text> : null}
        {p.jobTitle ? <Text style={styles.title}>{p.jobTitle}</Text> : null}
        <Text style={styles.contact}>{[p.email, p.phone, p.location, p.website].filter(Boolean).join("  ·  ")}</Text>
        {mainOrder.map((k) => renderSectionByKey(k, ctx))}
      </View>
    </Page>
  );
}

/* ---------- 现代模板 ---------- */

function ModernTemplate({ data, accentColor, fontSize, fontFamily, showAvatar, paperSize, sectionOrder, avatarShape, avatarSize }: Props) {
  const p = data.personal;
  const F = getFont(fontFamily).pdfFamily;
  const mainOrder = orderedSections(data, sectionOrder).filter((k) => ["summary", "experience", "project", "education"].includes(k));
  const ctx: SectionCtx = { data, accentColor, fontSize, font: F };
  const styles = StyleSheet.create({
    page: { fontFamily: F, fontSize, flexDirection: "row", color: "#222" },
    sidebar: { width: "32%", backgroundColor: "#f3f4f6", paddingTop: 30, paddingHorizontal: 18, paddingBottom: 30 },
    main: { width: "68%", paddingTop: 30, paddingHorizontal: 24, paddingBottom: 30 },
    sideName: { fontSize: fontSize + 8, fontWeight: 700, color: "#111" },
    sideTitle: { fontSize, color: accentColor, marginTop: 3 },
    sideHeading: { fontSize, fontWeight: 700, color: "#111", marginTop: 16, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: "#d1d5db", paddingBottom: 3 },
    sideText: { fontSize: fontSize - 2, color: "#333", lineHeight: 1.6 },
    name: { fontSize: fontSize + 12, fontWeight: 700, color: "#111" },
    title: { fontSize: fontSize + 1, color: accentColor, marginTop: 2 },
    contact: { fontSize: fontSize - 3, color: "#555", marginTop: 8, lineHeight: 1.7 },
  });
  return (
    <Page size={getPaper(paperSize).pdfSize as any} style={styles.page} wrap>
      <View style={styles.sidebar}>
        {showAvatar ? <Avatar src={p.avatar} size={avatarSize} accent={accentColor} shape={avatarShape} /> : null}
        {p.fullName ? <Text style={styles.sideName}>{p.fullName}</Text> : null}
        {p.jobTitle ? <Text style={styles.sideTitle}>{p.jobTitle}</Text> : null}
        <Text style={styles.sideHeading}>联系方式</Text>
        <Text style={styles.sideText}>{[p.email, p.phone, p.location, p.website].filter(Boolean).join("\n") || "（未填写）"}</Text>
        {data.skills.length > 0 ? (
          <>
            <Text style={styles.sideHeading}>专业技能</Text>
            {data.skills.map((s) => (
              <View key={s.id} style={{ marginBottom: 5 }}>
                <Text style={{ fontFamily: F, fontSize: fontSize - 2, fontWeight: 700, color: "#111" }}>{s.name}</Text>
                <Text style={styles.sideText}>{s.items}</Text>
              </View>
            ))}
          </>
        ) : null}
        {data.customSections.map((cs) => (
          <View key={cs.id}>
            <Text style={styles.sideHeading}>{cs.title}</Text>
            <Text style={styles.sideText}>{cs.content}</Text>
            <Images images={cs.images} accent={accentColor} />
          </View>
        ))}
      </View>
      <View style={styles.main}>
        {p.fullName ? <Text style={styles.name}>{p.fullName}</Text> : null}
        {p.jobTitle ? <Text style={styles.title}>{p.jobTitle}</Text> : null}
        <Text style={styles.contact}>{[p.email, p.phone, p.location, p.website].filter(Boolean).join("  ·  ")}</Text>
        {mainOrder.map((k) => renderSectionByKey(k, ctx))}
      </View>
    </Page>
  );
}

/* ---------- 时间轴模板 ---------- */

function TimelineTemplate({ data, accentColor, fontSize, fontFamily, showAvatar, paperSize, sectionOrder, avatarShape, avatarSize }: Props) {
  const p = data.personal;
  const F = getFont(fontFamily).pdfFamily;
  const order = orderedSections(data, sectionOrder);
  const ctx: SectionCtx = { data, accentColor, fontSize, font: F };
  const styles = StyleSheet.create({
    page: { fontFamily: F, fontSize, paddingTop: 36, paddingBottom: 36, paddingHorizontal: 44, color: "#222" },
    header: { marginBottom: 14, flexDirection: "row", alignItems: "center", gap: 10 },
    name: { fontSize: fontSize + 12, fontWeight: 700, color: "#111" },
    title: { fontSize: fontSize + 2, color: accentColor, marginTop: 4 },
    contact: { fontSize: fontSize - 4, color: "#555", marginTop: 6, lineHeight: 1.6 },
  });
  return (
    <Page size={getPaper(paperSize).pdfSize as any} style={styles.page} wrap>
      <View style={styles.header}>
        {showAvatar ? <Avatar src={p.avatar} size={avatarSize} accent={accentColor} shape={avatarShape} /> : null}
        <View>
          {p.fullName ? <Text style={styles.name}>{p.fullName}</Text> : null}
          {p.jobTitle ? <Text style={styles.title}>{p.jobTitle}</Text> : null}
        </View>
      </View>
      <Text style={styles.contact}>{[p.email, p.phone, p.location, p.website].filter(Boolean).join("  ·  ")}</Text>
      {order.map((k) => renderSectionByKey(k, ctx))}
    </Page>
  );
}
