"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ResumeData, TemplateId, PaperSize, CnFontFamily, EnFontFamily, AvatarShape } from "@/types/resume";
import { splitBullets, htmlToPlainText, moveItem, buildSectionOrder } from "@/lib/utils";
import { getPaper } from "@/lib/paper";
import { fontCssStack } from "@/lib/fonts";
import { useResumeStore } from "@/store/resumeStore";
import { useUiStore } from "@/store/uiStore";
import { resumeT, type ResumeLang } from "@/lib/resumeI18n";
import InlineEditable from "./InlineEditable";

interface Props {
  data: ResumeData;
  template: TemplateId;
  accentColor: string;
  fontSize: number;
  cnFontFamily: CnFontFamily;
  enFontFamily: EnFontFamily;
  paperSize: PaperSize;
  lineHeight: number;
  showAvatar: boolean;
  avatarShape: AvatarShape;
  avatarSize: number;
  active?: boolean;
}

export default function ResumePreview(props: Props) {
  const updateData = useResumeStore((s) => s.updateData);
  const sectionOrder = useResumeStore((s) => s.sectionOrder);
  const setSectionOrder = useResumeStore((s) => s.setSectionOrder);
  const lang = useResumeStore((s) => s.lang);
  return (
    <PreviewInner
      {...props}
      updateData={updateData}
      sectionOrder={sectionOrder}
      setSectionOrder={setSectionOrder}
      lang={lang}
    />
  );
}

function PreviewInner({
  data,
  template,
  accentColor,
  fontSize,
  cnFontFamily,
  enFontFamily,
  paperSize,
  lineHeight,
  showAvatar,
  avatarShape,
  avatarSize,
  active = true,
  updateData,
  sectionOrder,
  setSectionOrder,
  lang,
}: Props & {
  updateData: (fn: (d: ResumeData) => void) => void;
  sectionOrder: string[];
  setSectionOrder: (o: string[]) => void;
  lang: ResumeLang;
}) {
  const t = resumeT(lang);
  const paper = getPaper(paperSize);
  const font = fontCssStack(enFontFamily, cnFontFamily);
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

  // blocks 模板：整块卡片可直接拖拽上下移动；落点高亮
  const isBlocks = template === "blocks";
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const dragSrcEditableRef = useRef(false);

  /* ---- 通用小部件（内联编辑 + 拖拽） ---- */

  const contactParts = [p.email, p.phone, p.location, p.website];

  // 直接返回元素而不是在 PreviewInner 内声明 React 组件。
  // 内联组件会在 dragstart 更新状态后更换组件类型并重建 DOM，浏览器因此立即终止原生拖拽。
  const renderSectionTitle = (text: string, k: string, underline = true) => {
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
      {current ? `${start} - ${t.present}` : `${start} - ${end}`}
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

  // 拖拽手柄同样直接渲染，避免 dragstart 的状态更新替换正在拖动的 DOM 节点。
  const renderDragHandle = (onDragStart: (e: React.DragEvent) => void) => (
    <span
      draggable
      onDragStart={onDragStart}
      className="cursor-grab select-none text-gray-300 hover:text-gray-500 active:cursor-grabbing"
      title="拖拽排序"
    >
      ⠿
    </span>
  );

  /* ---- 单栏各区块渲染函数（供分页测量与显示复用） ---- */

  const setContact = (i: number, nv: string) => {
    const keys = ["email", "phone", "location", "website"] as const;
    set((d) => ((d.personal as any)[keys[i]] = nv));
  };

  const contactEntries = contactParts
    .map((v, idx) => ({ idx, v }))
    .filter((x) => Boolean(x.v));

  const contactInline = contactEntries.map(({ idx, v }, rendered) => (
    <React.Fragment key={idx}>
      {rendered > 0 && <span className="mx-1.5">·</span>}
      <InlineEditable value={v} onChange={(nv) => setContact(idx, nv)} as="span" placeholder={t.contact} />
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
            {contactParts.map((v, i) =>
              v ? (
                <InlineEditable key={i} value={v} onChange={(nv) => setContact(i, nv)} as="div" placeholder={t.contact} />
              ) : null
            )}
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
    if (template === "blocks") {
      return (
        <div data-measure-key="header" className="mb-3 flex items-center gap-3 border-b-2 pb-3" style={{ borderColor: accentColor }}>
          {<Avatar />}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <InlineEditable value={p.fullName} onChange={(v) => set((d) => (d.personal.fullName = v))} placeholder="姓名" className="text-3xl font-bold text-gray-900" as="div" />
              <InlineEditable value={p.jobTitle} onChange={(v) => set((d) => (d.personal.jobTitle = v))} placeholder="岗位" className="text-base font-medium" as="div" style={{ color: accentColor }} />
            </div>
            <div className="mt-1 text-gray-500" style={{ fontSize: fontSize - 4 }}>{contactInline}</div>
          </div>
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
      {renderSectionTitle(t.summary, "summary")}
      <InlineEditable value={p.summary} onChange={(v) => set((d) => (d.personal.summary = v))} className="text-gray-600" as="div" style={{ fontSize: fontSize - 1, lineHeight, whiteSpace: "pre-wrap" }} />
    </section>
  ) : null;

  const experienceNode = data.experiences.length > 0 ? (
    <section data-measure-key="experience" className="mt-3">
      {renderSectionTitle(t.experience, "experience")}
      {data.experiences.map((e, i) => (
        <div
          key={e.id}
          className="group mb-3"
          onDragOver={(ev) => ev.preventDefault()}
          onDrop={() => { if (drag?.list === "experiences") { reorder("experiences", drag.index, i); setDrag(null); } }}
        >
          <div className="flex items-start gap-1.5">
            {renderDragHandle((ev) => { ev.dataTransfer.setData("text/plain", String(i)); ev.dataTransfer.effectAllowed = "move"; setDrag({ list: "experiences", index: i }); })}
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
      {renderSectionTitle(t.project, "project")}
      {data.projects.map((pr, i) => (
        <div
          key={pr.id}
          className="group mb-3"
          onDragOver={(ev) => ev.preventDefault()}
          onDrop={() => { if (drag?.list === "projects") { reorder("projects", drag.index, i); setDrag(null); } }}
        >
          <div className="flex items-start gap-1.5">
            {renderDragHandle((ev) => { ev.dataTransfer.effectAllowed = "move"; setDrag({ list: "projects", index: i }); })}
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
      {renderSectionTitle(t.education, "education")}
      {data.education.map((ed, i) => (
        <div
          key={ed.id}
          className="group mb-2"
          onDragOver={(ev) => ev.preventDefault()}
          onDrop={() => { if (drag?.list === "education") { reorder("education", drag.index, i); setDrag(null); } }}
        >
          <div className="flex items-start gap-1.5">
            {renderDragHandle((ev) => { ev.dataTransfer.effectAllowed = "move"; setDrag({ list: "education", index: i }); })}
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
      {renderSectionTitle(t.skill, "skill")}
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
      {renderSectionTitle(cs.title || t.custom, `custom:${cs.id}`)}
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

  /* ---- blocks 模板：整块可拖拽卡片 + 技能标签方块 ---- */
  const renderBlocksCard = (k: string, title: string, children: React.ReactNode) => {
    const idx = resolvedOrder.indexOf(k);
    return (
      <section
        key={k}
        data-measure-key={k}
        draggable
        onMouseDown={(e) => {
          const el = e.target as HTMLElement;
          dragSrcEditableRef.current = !!(el && (el.isContentEditable || el.closest('[contenteditable="true"]')));
        }}
        onDragStart={(e) => {
          if (dragSrcEditableRef.current) { e.preventDefault(); return; }
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", k);
          setDragKey(k);
        }}
        onDragOver={(e) => { e.preventDefault(); if (dragKey && dragKey !== k) setDragOverKey(k); }}
        onDragLeave={() => setDragOverKey((cur) => (cur === k ? null : cur))}
        onDrop={(e) => {
          e.preventDefault();
          if (dragKey && dragKey !== k) reorderSection(resolvedOrder.indexOf(dragKey), idx);
          setDragKey(null);
          setDragOverKey(null);
        }}
        onDragEnd={() => { setDragKey(null); setDragOverKey(null); }}
        className={`group rounded-xl border bg-white px-4 py-3 transition-all ${
          dragKey === k ? "opacity-50" : ""
        } ${dragOverKey === k ? "border-brand-400 ring-2 ring-brand-200" : "border-gray-200 hover:border-gray-300 hover:shadow-sm"}`}
        style={{ marginTop: 12, cursor: "grab" }}
      >
        <div className="mb-2 flex items-center gap-1.5 border-b pb-1.5" style={{ borderColor: accentColor + "33" }}>
          <span className="cursor-grab select-none text-gray-400 transition-colors group-hover:text-gray-600" title="拖拽整块上下移动">⠿</span>
          <span className="font-bold tracking-wide" style={{ color: accentColor, fontSize: fontSize + 2 }}>{title}</span>
        </div>
        {children}
      </section>
    );
  };

  const blocksSummaryNode = p.summary ? (
    renderBlocksCard("summary", t.summary, (
      <InlineEditable value={p.summary} onChange={(v) => set((d) => (d.personal.summary = v))} className="text-gray-600" as="div" style={{ fontSize: fontSize - 1, lineHeight, whiteSpace: "pre-wrap" }} />
    ))
  ) : null;

  const blocksSkillNode = data.skills.length > 0 ? (
    renderBlocksCard("skill", t.skill, (
      <div className="space-y-2">
        {data.skills.map((s) => (
          <div key={s.id}>
            <InlineEditable
              value={s.name}
              onChange={(v) => set((d) => { const it = d.skills.find((x) => x.id === s.id); if (it) it.name = v; })}
              as="span"
              className="font-bold text-gray-900"
              style={{ fontSize: fontSize - 1 }}
              placeholder="分组"
            />
            <div className="mt-1 flex flex-wrap gap-1.5">
              {htmlToPlainText(s.items || "")
                .split(/[,，、\s]+/)
                .map((t) => t.trim())
                .filter(Boolean)
                .map((tag, i) => (
                  <span
                    key={i}
                    className="rb-tag inline-block cursor-default rounded-md border transition-all hover:-translate-y-0.5"
                    style={{
                      ["--rb-accent" as any]: accentColor,
                      padding: "2px 8px",
                      fontSize: fontSize - 2,
                      lineHeight: 1.5,
                    }}
                  >
                    {tag}
                  </span>
                ))}
            </div>
          </div>
        ))}
      </div>
    ))
  ) : null;

  const blocksExperienceNode = data.experiences.length > 0 ? (
    renderBlocksCard("experience", t.experience, (
      <div>
        {data.experiences.map((e, i) => (
          <div
            key={e.id}
            className="group mb-3"
            onDragOver={(ev) => ev.preventDefault()}
            onDrop={() => { if (drag?.list === "experiences") { reorder("experiences", drag.index, i); setDrag(null); } }}
          >
            <div className="flex items-start gap-1.5">
              {renderDragHandle((ev) => { ev.dataTransfer.effectAllowed = "move"; setDrag({ list: "experiences", index: i }); })}
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
      </div>
    ))
  ) : null;

  const blocksProjectNode = data.projects.length > 0 ? (
    renderBlocksCard("project", t.project, (
      <div>
        {data.projects.map((pr, i) => (
          <div
            key={pr.id}
            className="group mb-3"
            onDragOver={(ev) => ev.preventDefault()}
            onDrop={() => { if (drag?.list === "projects") { reorder("projects", drag.index, i); setDrag(null); } }}
          >
            <div className="flex items-start gap-1.5">
              {renderDragHandle((ev) => { ev.dataTransfer.effectAllowed = "move"; setDrag({ list: "projects", index: i }); })}
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
      </div>
    ))
  ) : null;

  const blocksEducationNode = data.education.length > 0 ? (
    renderBlocksCard("education", "教育经历", (
      <div>
        {data.education.map((ed, i) => (
          <div
            key={ed.id}
            className="group mb-2"
            onDragOver={(ev) => ev.preventDefault()}
            onDrop={() => { if (drag?.list === "education") { reorder("education", drag.index, i); setDrag(null); } }}
          >
            <div className="flex items-start gap-1.5">
              {renderDragHandle((ev) => { ev.dataTransfer.effectAllowed = "move"; setDrag({ list: "education", index: i }); })}
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
      </div>
    ))
  ) : null;

  const blocksCustomNodes = data.customSections.map((cs) =>
    renderBlocksCard(`custom:${cs.id}`, cs.title || t.custom, (
      <div>
        <InlineEditable value={cs.content} onChange={(v) => set((d) => { const it = d.customSections.find((x) => x.id === cs.id); if (it) it.content = v; })} className="whitespace-pre-line text-gray-600" as="div" style={{ fontSize: fontSize - 1, lineHeight }} />
        {(cs.images || []).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {(cs.images || []).map((img, i) => (
              <img key={i} src={img} alt="" className="h-14 w-20 rounded border border-gray-200 object-cover" />
            ))}
          </div>
        )}
      </div>
    ))
  );

  /* ---- 分页（单栏模板）：测量各区块高度后自动分页 ---- */

  // 各模板的水平/垂直内边距（geek 为高密度）
  const pad =
    template === "geek" ? { h: 28, v: 22 } :
    template === "compact" ? { h: 34, v: 26 } :
    template === "blocks" ? { h: 34, v: 26 } :
    template === "minimal" ? { h: 52, v: 44 } :
    template === "elegant" ? { h: 48, v: 40 } :
    { h: 40, v: 36 };

  // 按 resolvedOrder 组织区块（含单个自定义模块）
  const nodeByKey: Record<string, React.ReactNode> = isBlocks
    ? {
        summary: blocksSummaryNode,
        experience: blocksExperienceNode,
        project: blocksProjectNode,
        education: blocksEducationNode,
        skill: blocksSkillNode,
      }
    : {
        summary: summaryNode,
        experience: experienceNode,
        project: projectNode,
        education: educationNode,
        skill: skillNode,
      };
  const customNodeByKey: Record<string, React.ReactNode> = {};
  if (isBlocks) {
    blocksCustomNodes.forEach((node, i) => {
      customNodeByKey[`custom:${data.customSections[i]?.id}`] = node;
    });
  } else {
    customNodes.forEach((node, i) => {
      customNodeByKey[`custom:${data.customSections[i]?.id}`] = node;
    });
  }

  const orderedSections: { key: string; node: React.ReactNode }[] = [];
  for (const k of resolvedOrder) {
    const node = nodeByKey[k] ?? customNodeByKey[k];
    if (node) orderedSections.push({ key: k, node });
  }

  const measureRef = useRef<HTMLDivElement>(null);
  const [heights, setHeights] = useState<Record<string, number>>({});

  useEffect(() => {
    if (twoColumn || !active) return;
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
  }, [data, template, fontSize, cnFontFamily, enFontFamily, lineHeight, paperSize, showAvatar, sectionOrder, twoColumn, active]);

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
  const twoColumnRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (twoColumn) {
      // 双栏模板：按内容高度估算页数
      const el = twoColumnRef.current;
      if (el) {
        const h = el.scrollHeight || el.offsetHeight;
        const pages = Math.max(1, Math.ceil(h / paper.height));
        setPageCount(pages);
      }
    } else {
      setPageCount(pages.length || 1);
    }
  }, [twoColumn, pages, paper.height, setPageCount, data, template, fontSize, cnFontFamily, enFontFamily, lineHeight, paperSize, showAvatar, avatarShape, avatarSize, active]);

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
      <div id="resume-preview-root" ref={twoColumnRef} className="flex bg-white" style={containerStyle}>
        <aside className="w-[32%] px-4 py-8" style={{ backgroundColor: sidebarBg }}>
          {<Avatar />}
          <InlineEditable value={p.fullName} onChange={(v) => set((d) => (d.personal.fullName = v))} placeholder={t.name} className="text-2xl font-bold" as="div" style={{ color: sideHeadColor }} />
          <InlineEditable value={p.jobTitle} onChange={(v) => set((d) => (d.personal.jobTitle = v))} placeholder={t.jobTitle} className="mt-1 font-medium" as="div" style={{ color: dark ? "#93c5fd" : accentColor }} />
          <h3 className="mt-4 mb-1.5 border-b pb-1 font-bold" style={{ color: sideHeadColor, fontSize: fontSize }}>{t.contact}</h3>
          <div className="whitespace-pre-line" style={{ fontSize: fontSize - 2, lineHeight: 1.7, color: sideTextColor }}>
            {contactParts.filter(Boolean).map((v) => htmlToPlainText(v)).join("\n") || t.unfilled}
          </div>
          {data.skills.length > 0 && (
            <>
              <h3 className="mt-4 mb-1.5 border-b pb-1 font-bold" style={{ color: sideHeadColor, fontSize: fontSize }}>{t.skill}</h3>
              {data.skills.map((s) => (
                <div key={s.id} className="mb-2">
                  <InlineEditable
                    value={s.name}
                    onChange={(v) => set((d) => { const it = d.skills.find((x) => x.id === s.id); if (it) it.name = v; })}
                    as="div"
                    className="font-semibold"
                    style={{ fontSize: fontSize - 2, color: sideHeadColor }}
                  />
                  <InlineEditable
                    value={s.items}
                    onChange={(v) => set((d) => { const it = d.skills.find((x) => x.id === s.id); if (it) it.items = v; })}
                    as="div"
                    style={{ fontSize: fontSize - 2, lineHeight: 1.6, color: sideTextColor }}
                  />
                </div>
              ))}
            </>
          )}
          {data.customSections.map((cs) => (
            <div key={cs.id}>
              <h3 className="mt-4 mb-1.5 border-b pb-1 font-bold" style={{ color: sideHeadColor, fontSize: fontSize }}>{htmlToPlainText(cs.title)}</h3>
              <InlineEditable
                value={cs.content}
                onChange={(v) => set((d) => { const it = d.customSections.find((x) => x.id === cs.id); if (it) it.content = v; })}
                as="div"
                style={{ fontSize: fontSize - 2, lineHeight: 1.7, color: sideTextColor }}
              />
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
            {contactParts.filter(Boolean).map((v) => htmlToPlainText(v)).join("  ·  ")}
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

      {/* 可见分页（所有页统一包在 resume-preview-root，供打印/PNG 导出取全部页面） */}
      <div id="resume-preview-root">
        {pages.map((pageSections, pi) => (
          <div
            key={pi}
            className="resume-page mb-4 bg-white shadow-sm ring-1 ring-gray-200"
            style={{ width: paper.width, minHeight: paper.height, padding: `${pad.v}px ${pad.h}px` }}
          >
            {pageSections.map((s) => (
              <React.Fragment key={s.key}>{s.node}</React.Fragment>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
