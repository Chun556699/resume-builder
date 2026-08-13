"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ResumeData, TemplateId, PaperSize, FontFamily, AvatarShape } from "@/types/resume";
import { splitBullets } from "@/lib/utils";
import { getPaper } from "@/lib/paper";
import { getFont } from "@/lib/fonts";
import { useResumeStore } from "@/store/resumeStore";
import { useUiStore } from "@/store/uiStore";
import InlineEditable from "./InlineEditable";
import { moveItem, buildSectionOrder } from "@/lib/utils";

interface Props {
  data: ResumeData;
  template: TemplateId;
  accentColor: string;
  fontSize: number;
  fontFamily: FontFamily;
  paperSize: PaperSize;
  lineHeight: number;
  showAvatar: boolean;
  avatarShape: AvatarShape;
  avatarSize: number;
}

export default function ResumePreview(props: Props) {
  const updateData = useResumeStore((s) => s.updateData);
  const sectionOrder = useResumeStore((s) => s.sectionOrder);
  const setSectionOrder = useResumeStore((s) => s.setSectionOrder);
  return (
    <PreviewInner
      {...props}
      updateData={updateData}
      sectionOrder={sectionOrder}
      setSectionOrder={setSectionOrder}
    />
  );
}

function PreviewInner({
  data,
  template,
  accentColor,
  fontSize,
  fontFamily,
  paperSize,
  lineHeight,
  showAvatar,
  avatarShape,
  avatarSize,
  updateData,
  sectionOrder,
  setSectionOrder,
}: Props & {
  updateData: (fn: (d: ResumeData) => void) => void;
  sectionOrder: string[];
  setSectionOrder: (o: string[]) => void;
}) {
  const paper = getPaper(paperSize);
  const font = getFont(fontFamily).cssFamily;
  const p = data.personal;

  const twoColumn = template === "modern" || template === "sidebar";

  const set = (path: (d: ResumeData) => void) => updateData(path);

  const [drag, setDrag] = useState<{ list: "experiences" | "projects" | "education"; index: number } | null>(null);
  const reorder = (list: "experiences" | "projects" | "education", from: number, to: number) => {
    updateData((d) => {
      (d as any)[list] = moveItem((d as any)[list], from, to);
    });
  };

  // 板块拖拽（自由排序）
  const resolvedOrder = useMemo(() => buildSectionOrder(data, sectionOrder), [data, sectionOrder]);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const reorderSection = (from: number, to: number) => {
    if (from < 0 || to < 0 || from === to) return;
    setSectionOrder(moveItem(resolvedOrder, from, to));
  };

  /* ---- 通用小部件（内联编辑 + 拖拽） ---- */

  const contactParts = [p.email, p.phone, p.location, p.website];

  const SectionTitle = ({ text, k, underline = true }: { text: string; k: string; underline?: boolean }) => {
    const idx = resolvedOrder.indexOf(k);
    return (
      <div
        className={`mb-2 flex items-center gap-1.5 pb-1 ${underline ? "border-b" : ""}`}
        style={{ borderColor: "#e5e7eb" }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => { if (dragKey && dragKey !== k) reorderSection(resolvedOrder.indexOf(dragKey), idx); setDragKey(null); }}
      >
        <span
          draggable
          onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; setDragKey(k); }}
          className="cursor-grab select-none text-gray-300 hover:text-gray-500"
          title="拖拽排序"
        >⠿</span>
        <span className="font-bold uppercase tracking-wide" style={{ color: accentColor, fontSize: fontSize + 2 }}>{text}</span>
      </div>
    );
  };

  const DateRange = ({ start, end, current }: { start: string; end: string; current?: boolean }) => (
    <span className="whitespace-nowrap text-gray-500" style={{ fontSize: fontSize - 4 }}>
      {current ? `${start} - 至今` : `${start} - ${end}`}
    </span>
  );

  const Avatar = ({ size }: { size?: number }) =>
    showAvatar && p.avatar ? (
      <img
        src={p.avatar}
        alt="头像"
        className="object-cover"
        style={{
          width: size || avatarSize,
          height: size || avatarSize,
          borderRadius: avatarShape === "circle" ? "50%" : "4px",
          border: `2px solid ${accentColor}`,
        }}
      />
    ) : null;

  const Bullets = ({ text, onChange }: { text: string; onChange: (v: string) => void }) => {
    const items = splitBullets(text);
    return (
      <ul className="mt-1 space-y-0.5">
        {items.map((line, i) => (
          <li key={i} className="flex gap-1.5 text-gray-700" style={{ fontSize: fontSize - 1, lineHeight }}>
            <span style={{ color: accentColor }}>•</span>
            <InlineEditable value={line} onChange={(v) => {
              const arr = splitBullets(text);
              arr[i] = v;
              onChange(arr.join("\n"));
            }} className="flex-1" as="span" />
          </li>
        ))}
      </ul>
    );
  };

  // 拖拽手柄
  function DragHandle({ onDragStart }: { onDragStart: (e: React.DragEvent) => void }) {
    return (
      <span
        draggable
        onDragStart={onDragStart}
        className="cursor-grab select-none text-gray-300 hover:text-gray-500 active:cursor-grabbing"
        title="拖拽排序"
      >
        ⠿
      </span>
    );
  }

  /* ---- 单栏各区块渲染函数（供分页测量与显示复用） ---- */

  const setContact = (i: number, nv: string) => {
    const keys = ["email", "phone", "location", "website"] as const;
    set((d) => ((d.personal as any)[keys[i]] = nv));
  };

  const contactInline = contactParts.filter(Boolean).map((v, i) => (
    <React.Fragment key={i}>
      {i > 0 && <span className="mx-1.5">·</span>}
      <InlineEditable value={v} onChange={(nv) => setContact(i, nv)} as="span" placeholder="联系方式" />
    </React.Fragment>
  ));

  const headerNode = (() => {
    if (template === "minimal") {
      return (
        <div data-measure-key="header" className="mb-5 flex items-start justify-between gap-4 border-b pb-3" style={{ borderColor: "#111" }}>
          <div>
            <InlineEditable value={p.fullName} onChange={(v) => set((d) => (d.personal.fullName = v))} placeholder="姓名" className="text-4xl font-bold tracking-wide text-gray-900" as="div" />
            <InlineEditable value={p.jobTitle} onChange={(v) => set((d) => (d.personal.jobTitle = v))} placeholder="岗位" className="mt-1 text-base font-medium" as="div" style={{ color: accentColor }} />
          </div>
          <div className="text-right text-gray-500" style={{ fontSize: fontSize - 4, lineHeight: 1.7 }}>
            {[p.email, p.phone, p.location, p.website].filter(Boolean).map((v, i) => (
              <InlineEditable key={i} value={v} onChange={(nv) => setContact(i, nv)} as="div" placeholder="联系方式" />
            ))}
          </div>
        </div>
      );
    }
    if (template === "geek") {
      return (
        <div data-measure-key="header" className="mb-3 flex items-center gap-3 border-b-2 pb-2" style={{ borderColor: accentColor }}>
          {<Avatar />}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <InlineEditable value={p.fullName} onChange={(v) => set((d) => (d.personal.fullName = v))} placeholder="姓名" className="text-2xl font-bold text-gray-900" as="div" />
              <InlineEditable value={p.jobTitle} onChange={(v) => set((d) => (d.personal.jobTitle = v))} placeholder="岗位" className="text-sm font-medium" as="div" style={{ color: accentColor }} />
            </div>
            <div className="mt-0.5 truncate text-gray-500" style={{ fontSize: fontSize - 4 }}>{contactInline}</div>
          </div>
        </div>
      );
    }
    if (template === "timeline") {
      return (
        <div data-measure-key="header" className="mb-4 flex items-center gap-3">
          {<Avatar />}
          <div>
            <InlineEditable value={p.fullName} onChange={(v) => set((d) => (d.personal.fullName = v))} placeholder="姓名" className="text-2xl font-bold text-gray-900" as="div" />
            <InlineEditable value={p.jobTitle} onChange={(v) => set((d) => (d.personal.jobTitle = v))} placeholder="岗位" className="text-base font-medium" as="div" style={{ color: accentColor }} />
            <div className="mt-0.5 text-gray-500" style={{ fontSize: fontSize - 4 }}>{contactInline}</div>
          </div>
        </div>
      );
    }
    if (template === "elegant") {
      return (
        <div data-measure-key="header" className="mb-4 text-center">
          <div className="flex justify-center">{<Avatar />}</div>
          <InlineEditable value={p.fullName} onChange={(v) => set((d) => (d.personal.fullName = v))} placeholder="姓名" className="text-3xl font-bold tracking-[0.15em] text-gray-900" as="div" />
          <InlineEditable value={p.jobTitle} onChange={(v) => set((d) => (d.personal.jobTitle = v))} placeholder="岗位" className="mt-1 text-sm tracking-[0.2em]" as="div" style={{ color: accentColor }} />
          <div className="mx-auto mt-2 h-0.5 w-14" style={{ backgroundColor: accentColor }} />
          <div className="mt-2 text-gray-500" style={{ fontSize: fontSize - 4 }}>{contactInline}</div>
        </div>
      );
    }
    // classic / compact 默认居中
    return (
      <div data-measure-key="header" className="mb-3 text-center">
        <div className="flex justify-center">{<Avatar />}</div>
        <InlineEditable value={p.fullName} onChange={(v) => set((d) => (d.personal.fullName = v))} placeholder="姓名" className="text-3xl font-bold text-gray-900" as="div" />
        <InlineEditable value={p.jobTitle} onChange={(v) => set((d) => (d.personal.jobTitle = v))} placeholder="求职岗位" className="mt-1 text-lg font-medium" as="div" style={{ color: accentColor }} />
        <div className="mt-1.5 text-gray-500" style={{ fontSize: fontSize - 4 }}>{contactInline}</div>
      </div>
    );
  })();

  const summaryNode = p.summary ? (
    <section data-measure-key="summary" className="mt-3">
      <SectionTitle text="个人简介" k="summary" />
      <InlineEditable value={p.summary} onChange={(v) => set((d) => (d.personal.summary = v))} className="text-gray-600" as="div" style={{ fontSize: fontSize - 1, lineHeight, whiteSpace: "pre-wrap" }} />
    </section>
  ) : null;

  const experienceNode = data.experiences.length > 0 ? (
    <section data-measure-key="experience" className="mt-3">
      <SectionTitle text="工作经历" k="experience" />
      {data.experiences.map((e, i) => (
        <div
          key={e.id}
          className="group mb-3"
          onDragOver={(ev) => ev.preventDefault()}
          onDrop={() => { if (drag?.list === "experiences") { reorder("experiences", drag.index, i); setDrag(null); } }}
        >
          <div className="flex items-start gap-1.5">
            <DragHandle onDragStart={(ev) => { ev.dataTransfer.setData("text/plain", String(i)); ev.dataTransfer.effectAllowed = "move"; setDrag({ list: "experiences", index: i }); }} />
            <div className="flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <div className="font-bold text-gray-900" style={{ fontSize }}>
                  <InlineEditable value={e.position} onChange={(v) => set((d) => { const it = d.experiences.find((x) => x.id === e.id); if (it) it.position = v; })} as="span" placeholder="职位" />
                  {e.company && <span className="font-medium text-gray-700"> · <InlineEditable value={e.company} onChange={(v) => set((d) => { const it = d.experiences.find((x) => x.id === e.id); if (it) it.company = v; })} as="span" placeholder="公司" /></span>}
                </div>
                <DateRange start={e.startDate} end={e.endDate} current={e.current} />
              </div>
              {e.location && <InlineEditable value={e.location} onChange={(v) => set((d) => { const it = d.experiences.find((x) => x.id === e.id); if (it) it.location = v; })} className="text-gray-500" as="div" style={{ fontSize: fontSize - 2 }} />}
              <Bullets text={e.description} onChange={(v) => set((d) => { const it = d.experiences.find((x) => x.id === e.id); if (it) it.description = v; })} />
            </div>
          </div>
        </div>
      ))}
    </section>
  ) : null;

  const projectNode = data.projects.length > 0 ? (
    <section data-measure-key="project" className="mt-3">
      <SectionTitle text="项目经历" k="project" />
      {data.projects.map((pr, i) => (
        <div
          key={pr.id}
          className="group mb-3"
          onDragOver={(ev) => ev.preventDefault()}
          onDrop={() => { if (drag?.list === "projects") { reorder("projects", drag.index, i); setDrag(null); } }}
        >
          <div className="flex items-start gap-1.5">
            <DragHandle onDragStart={(ev) => { ev.dataTransfer.effectAllowed = "move"; setDrag({ list: "projects", index: i }); }} />
            <div className="flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <div className="font-bold text-gray-900" style={{ fontSize }}>
                  <InlineEditable value={pr.name} onChange={(v) => set((d) => { const it = d.projects.find((x) => x.id === pr.id); if (it) it.name = v; })} as="span" placeholder="项目名" />
                  {pr.role && <span className="font-medium text-gray-700"> · <InlineEditable value={pr.role} onChange={(v) => set((d) => { const it = d.projects.find((x) => x.id === pr.id); if (it) it.role = v; })} as="span" placeholder="角色" /></span>}
                </div>
                <DateRange start={pr.startDate} end={pr.endDate} />
              </div>
              {pr.link && <InlineEditable value={pr.link} onChange={(v) => set((d) => { const it = d.projects.find((x) => x.id === pr.id); if (it) it.link = v; })} style={{ color: accentColor, fontSize: fontSize - 3 }} as="div" />}
              <Bullets text={pr.description} onChange={(v) => set((d) => { const it = d.projects.find((x) => x.id === pr.id); if (it) it.description = v; })} />
            </div>
          </div>
        </div>
      ))}
    </section>
  ) : null;

  const educationNode = data.education.length > 0 ? (
    <section data-measure-key="education" className="mt-3">
      <SectionTitle text="教育经历" k="education" />
      {data.education.map((ed, i) => (
        <div
          key={ed.id}
          className="group mb-2"
          onDragOver={(ev) => ev.preventDefault()}
          onDrop={() => { if (drag?.list === "education") { reorder("education", drag.index, i); setDrag(null); } }}
        >
          <div className="flex items-start gap-1.5">
            <DragHandle onDragStart={(ev) => { ev.dataTransfer.effectAllowed = "move"; setDrag({ list: "education", index: i }); }} />
            <div className="flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <div className="font-bold text-gray-900" style={{ fontSize }}>
                  <InlineEditable value={ed.school} onChange={(v) => set((d) => { const it = d.education.find((x) => x.id === ed.id); if (it) it.school = v; })} as="span" placeholder="学校" />
                  {ed.major && <span className="font-medium text-gray-700"> · <InlineEditable value={ed.major} onChange={(v) => set((d) => { const it = d.education.find((x) => x.id === ed.id); if (it) it.major = v; })} as="span" placeholder="专业" /></span>}
                </div>
                <DateRange start={ed.startDate} end={ed.endDate} />
              </div>
              {ed.degree && <InlineEditable value={ed.degree} onChange={(v) => set((d) => { const it = d.education.find((x) => x.id === ed.id); if (it) it.degree = v; })} className="text-gray-600" as="div" style={{ fontSize: fontSize - 2 }} />}
              {ed.description && <InlineEditable value={ed.description} onChange={(v) => set((d) => { const it = d.education.find((x) => x.id === ed.id); if (it) it.description = v; })} className="text-gray-600" as="div" style={{ fontSize: fontSize - 1, lineHeight }} />}
            </div>
          </div>
        </div>
      ))}
    </section>
  ) : null;

  const skillNode = data.skills.length > 0 ? (
    <section data-measure-key="skill" className="mt-3">
      <SectionTitle text="专业技能" k="skill" />
      {template === "geek" ? (
        <div className="space-y-1">
          {data.skills.map((s) => (
            <div key={s.id} className="flex gap-2" style={{ fontSize: fontSize - 2, lineHeight: 1.4 }}>
              <span className="w-14 shrink-0 font-bold text-gray-900">
                <InlineEditable value={s.name} onChange={(v) => set((d) => { const it = d.skills.find((x) => x.id === s.id); if (it) it.name = v; })} as="span" placeholder="分组" />
              </span>
              <InlineEditable value={s.items} onChange={(v) => set((d) => { const it = d.skills.find((x) => x.id === s.id); if (it) it.items = v; })} className="flex-1 text-gray-700" as="div" />
            </div>
          ))}
        </div>
      ) : (
        data.skills.map((s) => (
          <div key={s.id} className="text-gray-700" style={{ fontSize: fontSize - 1, lineHeight }}>
            <span className="font-bold"><InlineEditable value={s.name} onChange={(v) => set((d) => { const it = d.skills.find((x) => x.id === s.id); if (it) it.name = v; })} as="span" placeholder="分组" />：</span>
            <InlineEditable value={s.items} onChange={(v) => set((d) => { const it = d.skills.find((x) => x.id === s.id); if (it) it.items = v; })} as="span" />
          </div>
        ))
      )}
    </section>
  ) : null;

  const customNodes = data.customSections.map((cs) => (
    <section key={cs.id} data-measure-key={`custom:${cs.id}`} className="mt-3">
      <SectionTitle text={cs.title || "自定义"} k={`custom:${cs.id}`} />
      <InlineEditable value={cs.content} onChange={(v) => set((d) => { const it = d.customSections.find((x) => x.id === cs.id); if (it) it.content = v; })} className="whitespace-pre-line text-gray-600" as="div" style={{ fontSize: fontSize - 1, lineHeight }} />
      {(cs.images || []).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {(cs.images || []).map((img, i) => (
            <img key={i} src={img} alt="" className="h-14 w-20 rounded border border-gray-200 object-cover" />
          ))}
        </div>
      )}
    </section>
  ));

  /* ---- 分页（单栏模板）：测量各区块高度后自动分页 ---- */

  // 各模板的水平/垂直内边距（geek 为高密度）
  const pad =
    template === "geek" ? { h: 28, v: 22 } :
    template === "compact" ? { h: 34, v: 26 } :
    template === "minimal" ? { h: 52, v: 44 } :
    template === "elegant" ? { h: 48, v: 40 } :
    { h: 40, v: 36 };

  // 按 resolvedOrder 组织区块（含单个自定义模块）
  const nodeByKey: Record<string, React.ReactNode> = {
    summary: summaryNode,
    experience: experienceNode,
    project: projectNode,
    education: educationNode,
    skill: skillNode,
  };
  const customNodeByKey: Record<string, React.ReactNode> = {};
  customNodes.forEach((node, i) => {
    customNodeByKey[`custom:${data.customSections[i]?.id}`] = node;
  });

  const orderedSections: { key: string; node: React.ReactNode }[] = [];
  for (const k of resolvedOrder) {
    const node = nodeByKey[k] ?? customNodeByKey[k];
    if (node) orderedSections.push({ key: k, node });
  }

  const measureRef = useRef<HTMLDivElement>(null);
  const [heights, setHeights] = useState<Record<string, number>>({});

  useEffect(() => {
    if (twoColumn) return;
    const el = measureRef.current;
    if (!el) return;
    const nodes = Array.from(el.querySelectorAll<HTMLElement>("[data-measure-key]"));
    const hs: Record<string, number> = {};
    nodes.forEach((n, i) => {
      const key = n.dataset.measureKey!;
      // 用与下一块的 offsetTop 差计算“占用高度”（含外边距），末块用自身高度
      hs[key] = i < nodes.length - 1 ? nodes[i + 1].offsetTop - n.offsetTop : n.offsetHeight;
    });
    setHeights(hs);
  }, [data, template, fontSize, fontFamily, lineHeight, paperSize, showAvatar, sectionOrder, twoColumn]);

  const pages = useMemo(() => {
    if (twoColumn) return [];
    const innerHeight = paper.height - pad.v * 2;
    const pages: { key: string; node: React.ReactNode }[][] = [];
    let cur: { key: string; node: React.ReactNode }[] = [];
    let curH = 0;
    // header 始终在首页
    const headerH = heights["header"] || 0;
    cur.push({ key: "header", node: headerNode });
    curH = headerH;
    for (const s of orderedSections) {
      const h = heights[s.key] || 0;
      if (curH + h > innerHeight && cur.length > 1) {
        pages.push(cur);
        cur = [];
        curH = 0;
      }
      cur.push(s);
      curH += h;
    }
    if (cur.length > 0) pages.push(cur);
    return pages.length ? pages : [[{ key: "header", node: headerNode }, ...orderedSections]];
  }, [heights, orderedSections, paper, pad, twoColumn]);

  const setPageCount = useUiStore((s) => s.setPageCount);
  useEffect(() => {
    setPageCount(twoColumn ? 1 : pages.length || 1);
  }, [pages, twoColumn, setPageCount]);

  const containerStyle: React.CSSProperties = {
    fontFamily: font,
    fontSize,
    lineHeight,
    color: "#1f2937",
  };

  /* ---- 双栏模板：连续流式渲染（PDF 端自动分页） ---- */

  if (twoColumn) {
    const dark = template === "sidebar";
    const sidebarBg = dark ? "#1f2937" : "#f3f4f6";
    const sideTextColor = dark ? "#d1d5db" : "#333";
    const sideHeadColor = dark ? "#fff" : "#111";
    return (
      <div id="resume-preview-root" className="flex bg-white" style={containerStyle}>
        <aside className="w-[32%] px-4 py-8" style={{ backgroundColor: sidebarBg }}>
          {<Avatar />}
          <InlineEditable value={p.fullName} onChange={(v) => set((d) => (d.personal.fullName = v))} placeholder="姓名" className="text-2xl font-bold" as="div" style={{ color: sideHeadColor }} />
          <InlineEditable value={p.jobTitle} onChange={(v) => set((d) => (d.personal.jobTitle = v))} placeholder="岗位" className="mt-1 font-medium" as="div" style={{ color: dark ? "#93c5fd" : accentColor }} />
          <h3 className="mt-4 mb-1.5 border-b pb-1 font-bold" style={{ color: sideHeadColor, fontSize: fontSize }}>联系方式</h3>
          <div className="whitespace-pre-line" style={{ fontSize: fontSize - 2, lineHeight: 1.7, color: sideTextColor }}>
            {contactParts.filter(Boolean).join("\n") || "（未填写）"}
          </div>
          {data.skills.length > 0 && (
            <>
              <h3 className="mt-4 mb-1.5 border-b pb-1 font-bold" style={{ color: sideHeadColor, fontSize: fontSize }}>专业技能</h3>
              {data.skills.map((s) => (
                <div key={s.id} className="mb-2">
                  <div className="font-semibold" style={{ fontSize: fontSize - 2, color: sideHeadColor }}>{s.name}</div>
                  <div style={{ fontSize: fontSize - 2, lineHeight: 1.6, color: sideTextColor }}>{s.items}</div>
                </div>
              ))}
            </>
          )}
          {data.customSections.map((cs) => (
            <div key={cs.id}>
              <h3 className="mt-4 mb-1.5 border-b pb-1 font-bold" style={{ color: sideHeadColor, fontSize: fontSize }}>{cs.title}</h3>
              <div className="whitespace-pre-line" style={{ fontSize: fontSize - 2, lineHeight: 1.7, color: sideTextColor }}>{cs.content}</div>
              {(cs.images || []).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(cs.images || []).map((img, i) => <img key={i} src={img} alt="" className="h-12 w-16 rounded object-cover" />)}
                </div>
              )}
            </div>
          ))}
        </aside>
        <main className="w-[68%] px-6 py-8">
          <InlineEditable value={p.fullName} onChange={(v) => set((d) => (d.personal.fullName = v))} placeholder="姓名" className="text-3xl font-bold text-gray-900" as="div" />
          <InlineEditable value={p.jobTitle} onChange={(v) => set((d) => (d.personal.jobTitle = v))} className="mt-0.5 text-lg font-medium" as="div" style={{ color: accentColor }} />
          <p className="mt-2 text-gray-500" style={{ fontSize: fontSize - 3 }}>
            {contactParts.filter(Boolean).join("  ·  ")}
          </p>
          {resolvedOrder.filter((k) => ["summary", "experience", "project", "education"].includes(k)).map((k) => {
            const node = nodeByKey[k];
            return node ? <div key={k} className="mt-4">{node}</div> : null;
          })}
        </main>
      </div>
    );
  }

  /* ---- 单栏模板：分页渲染 ---- */

  return (
    <div style={containerStyle}>
      {/* 隐藏测量容器 */}
      <div
        ref={measureRef}
        aria-hidden
        style={{
          position: "absolute",
          left: -9999,
          top: 0,
          width: paper.width - pad.h * 2,
          visibility: "hidden",
        }}
      >
        {headerNode}
        {orderedSections.map((s) => (
          <React.Fragment key={s.key}>{s.node}</React.Fragment>
        ))}
      </div>

      {/* 可见分页 */}
      {pages.map((pageSections, pi) => (
        <div
          key={pi}
          id={pi === 0 ? "resume-preview-root" : undefined}
          className="mb-4 bg-white shadow-sm ring-1 ring-gray-200"
          style={{ width: paper.width, minHeight: paper.height, padding: `${pad.v}px ${pad.h}px` }}
        >
          {pageSections.map((s) => (
            <React.Fragment key={s.key}>{s.node}</React.Fragment>
          ))}
        </div>
      ))}
    </div>
  );
}
