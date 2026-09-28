"use client";

import React, { useState, useRef } from "react";
import { useResumeStore } from "@/store/resumeStore";
import { Field, Input, TextArea, Card, AddButton } from "./fields";
import { uid, moveItem, buildSectionOrder, htmlToPlainText } from "@/lib/utils";
import { readImageAsResizedDataUrl } from "@/lib/image";
import { useUiT } from "@/lib/useUiT";
import BatchStylePanel from "./BatchStylePanel";
import { Icon, IconName } from "../Icon";

type Tab = "personal" | "experience" | "education" | "project" | "skill" | "custom" | "layout" | "batch";

const TABS: { id: Tab; icon: IconName }[] = [
  { id: "personal", icon: "id" },
  { id: "experience", icon: "report" },
  { id: "education", icon: "book-2" },
  { id: "project", icon: "puzzle" },
  { id: "skill", icon: "bolt" },
  { id: "custom", icon: "apps" },
  { id: "batch", icon: "brush" },
  { id: "layout", icon: "layout" },
];

export default function EditorPanel() {
  const [tab, setTab] = useState<Tab>("personal");
  const L = useUiT();

  return (
    <div className="flex h-full flex-col">
      {/* 功能导航：移动端单行横向滚动，sm+ 两列网格 */}
      <div className="flex gap-1.5 overflow-x-auto border-b border-gray-100 p-3 [-ms-overflow-style:none] [scrollbar-width:none] sm:grid sm:grid-cols-2 sm:overflow-visible [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border px-3 py-2 text-left text-sm transition ${
                active
                  ? "border-brand-500 bg-brand-50 font-semibold text-brand-600"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <span className="text-base leading-none"><Icon name={t.icon} size={18} /></span>
              <span className="leading-none">{L.tab[t.id]}</span>
            </button>
          );
        })}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto bg-white p-4">
        {tab === "personal" && <PersonalSection />}
        {tab === "experience" && <ExperienceSection />}
        {tab === "education" && <EducationSection />}
        {tab === "project" && <ProjectSection />}
        {tab === "skill" && <SkillSection />}
        {tab === "custom" && <CustomSection />}
        {tab === "batch" && <BatchStylePanel />}
        {tab === "layout" && <LayoutSection />}
      </div>
    </div>
  );
}

/* ---------------- 个人信息 ---------------- */

function PersonalSection() {
  const { data, updateData, avatarShape, setAvatarShape, avatarSize, setAvatarSize } = useResumeStore();
  const L = useUiT();
  const p = data.personal;
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (key: keyof typeof p, value: string) =>
    updateData((d) => {
      (d.personal as any)[key] = value;
    });

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert(L.alertPickImage); return; }
    try {
      const url = await readImageAsResizedDataUrl(file, 512, 0.85);
      updateData((d) => { d.personal.avatar = url; });
    } catch { alert(L.alertImageRead); }
  };

  return (
    <div className="space-y-3">
      <Card title={L.photoCard}>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50"
            style={{ width: 80, height: 80, borderRadius: avatarShape === "circle" ? "50%" : "6px" }}
          >
            {p.avatar ? (
              <img src={p.avatar} alt={L.avatarAlt} className="h-full w-full object-cover" />
            ) : (
              <span className="text-xl text-gray-300">👤</span>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600">
              <Icon name="photo-plus" size={14} /> {L.importPhoto}
            </button>
            {p.avatar && (
              <button onClick={() => updateData((d) => { d.personal.avatar = ""; })} className="text-xs text-red-500 hover:underline">{L.removePhoto}</button>
            )}
            <p className="text-[11px] text-gray-400">{L.photoHint}</p>
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleAvatar} />
        </div>

        {/* 形状与大小 */}
        <div className="mt-3 space-y-2.5 border-t border-gray-100 pt-3">
          <div className="flex items-center gap-2">
            <span className="w-14 text-xs text-gray-500">{L.shape}</span>
            <div className="flex gap-1 rounded-md bg-gray-100 p-0.5">
              <button
                onClick={() => setAvatarShape("circle")}
                className={`rounded px-2 py-1 text-xs ${avatarShape === "circle" ? "bg-white font-semibold text-brand-600 shadow-sm" : "text-gray-600"}`}
              >{L.circle}</button>
              <button
                onClick={() => setAvatarShape("square")}
                className={`rounded px-2 py-1 text-xs ${avatarShape === "square" ? "bg-white font-semibold text-brand-600 shadow-sm" : "text-gray-600"}`}
              >{L.square}</button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-14 text-xs text-gray-500">{L.size}</span>
            <input
              type="range"
              min={48}
              max={160}
              value={avatarSize}
              onChange={(e) => setAvatarSize(Number(e.target.value))}
              className="flex-1"
            />
            <span className="w-10 text-right text-xs text-gray-500">{avatarSize}px</span>
          </div>
        </div>
      </Card>

      <Card title={L.basicInfo}>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label={L.fName}><Input value={htmlToPlainText(p.fullName)} onChange={(e) => set("fullName", e.target.value)} placeholder={L.phName} /></Field>
          <Field label={L.fJobTitle}><Input value={htmlToPlainText(p.jobTitle)} onChange={(e) => set("jobTitle", e.target.value)} placeholder={L.phJobTitle} /></Field>
          <Field label={L.fEmail}><Input value={htmlToPlainText(p.email)} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" /></Field>
          <Field label={L.fPhone}><Input value={htmlToPlainText(p.phone)} onChange={(e) => set("phone", e.target.value)} placeholder="138-0000-0000" /></Field>
          <Field label={L.fLocation}><Input value={htmlToPlainText(p.location)} onChange={(e) => set("location", e.target.value)} placeholder={L.phLocation} /></Field>
          <Field label={L.fWebsite}><Input value={htmlToPlainText(p.website)} onChange={(e) => set("website", e.target.value)} placeholder="https://github.com/xxx" /></Field>
        </div>
      </Card>

      <Card title={L.summaryCard}>
        <TextArea
          rows={6}
          value={htmlToPlainText(p.summary)}
          onChange={(e) => set("summary", e.target.value)}
          placeholder={L.phSummary}
        />
        <p className="text-[11px] text-gray-400">{L.summaryHint}</p>
      </Card>
    </div>
  );
}

/* ---------------- 工作经历 ---------------- */

function ExperienceSection() {
  const { data, updateData } = useResumeStore();
  const L = useUiT();
  const list = data.experiences;

  const add = () =>
    updateData((d) => {
      d.experiences.push({
        id: uid("exp"), company: "", position: "", location: "",
        startDate: "", endDate: "", current: false, description: "",
      });
    });
  const remove = (id: string) => updateData((d) => { d.experiences = d.experiences.filter((x) => x.id !== id); });
  const set = (id: string, key: string, value: any) =>
    updateData((d) => {
      const item = d.experiences.find((x) => x.id === id);
      if (item) (item as any)[key] = value;
    });

  return (
    <div className="space-y-3">
      {list.map((e) => (
        <Card key={e.id} title={e.company || e.position || L.tab.experience} onRemove={() => remove(e.id)}>
          <div className="grid grid-cols-2 gap-2.5">
            <Field label={L.company}><Input value={htmlToPlainText(e.company)} onChange={(ev) => set(e.id, "company", ev.target.value)} placeholder={L.phCompany} /></Field>
            <Field label={L.position}><Input value={htmlToPlainText(e.position)} onChange={(ev) => set(e.id, "position", ev.target.value)} placeholder={L.phPosition} /></Field>
            <Field label={L.city}><Input value={htmlToPlainText(e.location)} onChange={(ev) => set(e.id, "location", ev.target.value)} placeholder={L.phCity} /></Field>
            <Field label={L.start}><Input value={e.startDate} onChange={(ev) => set(e.id, "startDate", ev.target.value)} placeholder="2021-07" /></Field>
            <Field label={L.end}><Input value={e.endDate} onChange={(ev) => set(e.id, "endDate", ev.target.value)} placeholder="2024-06" disabled={e.current} /></Field>
            <label className="flex items-center gap-1.5 pt-5 text-xs text-gray-600">
              <input type="checkbox" checked={e.current} onChange={(ev) => set(e.id, "current", ev.target.checked)} />
              {L.present}
            </label>
          </div>
          <Field label={L.expDesc} hint={L.expDescHint}>
            <TextArea rows={5} value={htmlToPlainText(e.description)} onChange={(ev) => set(e.id, "description", ev.target.value)} placeholder={L.phExpDesc} />
          </Field>
        </Card>
      ))}
      <AddButton onClick={add} text={L.addExperience} />
    </div>
  );
}

/* ---------------- 教育经历 ---------------- */

function EducationSection() {
  const { data, updateData } = useResumeStore();
  const L = useUiT();
  const list = data.education;
  const add = () => updateData((d) => { d.education.push({ id: uid("edu"), school: "", degree: "", major: "", startDate: "", endDate: "", description: "" }); });
  const remove = (id: string) => updateData((d) => { d.education = d.education.filter((x) => x.id !== id); });
  const set = (id: string, key: string, value: string) => updateData((d) => { const item = d.education.find((x) => x.id === id); if (item) (item as any)[key] = value; });

  return (
    <div className="space-y-3">
      {list.map((e) => (
        <Card key={e.id} title={e.school || L.tab.education} onRemove={() => remove(e.id)}>
          <div className="grid grid-cols-2 gap-2.5">
            <Field label={L.school}><Input value={htmlToPlainText(e.school)} onChange={(ev) => set(e.id, "school", ev.target.value)} placeholder={L.phSchool} /></Field>
            <Field label={L.degree}><Input value={htmlToPlainText(e.degree)} onChange={(ev) => set(e.id, "degree", ev.target.value)} placeholder={L.phDegree} /></Field>
            <Field label={L.major}><Input value={htmlToPlainText(e.major)} onChange={(ev) => set(e.id, "major", ev.target.value)} placeholder={L.phMajor} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label={L.eduStart}><Input value={e.startDate} onChange={(ev) => set(e.id, "startDate", ev.target.value)} placeholder="2014-09" /></Field>
              <Field label={L.eduEnd}><Input value={e.endDate} onChange={(ev) => set(e.id, "endDate", ev.target.value)} placeholder="2018-06" /></Field>
            </div>
          </div>
          <Field label={L.eduNotes}><Input value={htmlToPlainText(e.description)} onChange={(ev) => set(e.id, "description", ev.target.value)} placeholder={L.phEduNotes} /></Field>
        </Card>
      ))}
      <AddButton onClick={add} text={L.addEducation} />
    </div>
  );
}

/* ---------------- 项目经历 ---------------- */

function ProjectSection() {
  const { data, updateData } = useResumeStore();
  const L = useUiT();
  const list = data.projects;
  const add = () => updateData((d) => { d.projects.push({ id: uid("proj"), name: "", role: "", link: "", startDate: "", endDate: "", description: "" }); });
  const remove = (id: string) => updateData((d) => { d.projects = d.projects.filter((x) => x.id !== id); });
  const set = (id: string, key: string, value: string) => updateData((d) => { const item = d.projects.find((x) => x.id === id); if (item) (item as any)[key] = value; });

  return (
    <div className="space-y-3">
      {list.map((pr) => (
        <Card key={pr.id} title={pr.name || L.tab.project} onRemove={() => remove(pr.id)}>
          <div className="grid grid-cols-2 gap-2.5">
            <Field label={L.projectName}><Input value={htmlToPlainText(pr.name)} onChange={(ev) => set(pr.id, "name", ev.target.value)} placeholder={L.phProjectName} /></Field>
            <Field label={L.role}><Input value={htmlToPlainText(pr.role)} onChange={(ev) => set(pr.id, "role", ev.target.value)} placeholder={L.phRole} /></Field>
            <Field label={L.link}><Input value={htmlToPlainText(pr.link)} onChange={(ev) => set(pr.id, "link", ev.target.value)} placeholder="https://github.com/..." /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label={L.eduStart}><Input value={pr.startDate} onChange={(ev) => set(pr.id, "startDate", ev.target.value)} placeholder="2022-01" /></Field>
              <Field label={L.eduEnd}><Input value={pr.endDate} onChange={(ev) => set(pr.id, "endDate", ev.target.value)} placeholder="2022-12" /></Field>
            </div>
          </div>
          <Field label={L.projDesc}>
            <TextArea rows={4} value={htmlToPlainText(pr.description)} onChange={(ev) => set(pr.id, "description", ev.target.value)} placeholder={L.phProjDesc} />
          </Field>
        </Card>
      ))}
      <AddButton onClick={add} text={L.addProject} />
    </div>
  );
}

/* ---------------- 技能 ---------------- */

function SkillSection() {
  const { data, updateData } = useResumeStore();
  const L = useUiT();
  const list = data.skills;
  const add = () => updateData((d) => { d.skills.push({ id: uid("skill"), name: "", items: "" }); });
  const remove = (id: string) => updateData((d) => { d.skills = d.skills.filter((x) => x.id !== id); });
  const set = (id: string, key: string, value: string) => updateData((d) => { const item = d.skills.find((x) => x.id === id); if (item) (item as any)[key] = value; });

  return (
    <div className="space-y-3">
      {list.map((s) => (
        <Card key={s.id} title={s.name || L.skillGroup} onRemove={() => remove(s.id)}>
          <div className="grid grid-cols-2 gap-2.5">
            <Field label={L.groupName}><Input value={htmlToPlainText(s.name)} onChange={(ev) => set(s.id, "name", ev.target.value)} placeholder={L.phGroupName} /></Field>
            <Field label={L.skillItems}><Input value={htmlToPlainText(s.items)} onChange={(ev) => set(s.id, "items", ev.target.value)} placeholder="React, TypeScript, Tailwind" /></Field>
          </div>
        </Card>
      ))}
      <AddButton onClick={add} text={L.addSkill} />
    </div>
  );
}

/* ---------------- 自定义模块 ---------------- */

function CustomSection() {
  const { data, updateData, sectionOrder, setSectionOrder } = useResumeStore();
  const L = useUiT();
  const list = data.customSections;
  const add = () => {
    const id = uid("custom");
    updateData((d) => { d.customSections.push({ id, title: "", content: "", images: [] }); });
    setSectionOrder([...sectionOrder, `custom:${id}`]);
  };
  const remove = (id: string) => {
    updateData((d) => { d.customSections = d.customSections.filter((x) => x.id !== id); });
    setSectionOrder(sectionOrder.filter((k) => k !== `custom:${id}`));
  };
  const set = (id: string, key: string, value: string) => updateData((d) => { const item = d.customSections.find((x) => x.id === id); if (item) (item as any)[key] = value; });

  const handleImages = async (id: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      const urls: string[] = [];
      for (const f of Array.from(files).slice(0, 6)) {
        if (f.type.startsWith("image/")) urls.push(await readImageAsResizedDataUrl(f, 1280, 0.8));
      }
      updateData((d) => { const item = d.customSections.find((x) => x.id === id); if (item) item.images = [...item.images, ...urls]; });
    } catch { alert(L.alertImageRead); }
  };

  return (
    <div className="space-y-3">
      {list.map((c) => (
        <Card key={c.id} title={c.title || L.customModule} onRemove={() => remove(c.id)}>
          <Field label={L.moduleTitle}><Input value={htmlToPlainText(c.title)} onChange={(ev) => set(c.id, "title", ev.target.value)} placeholder={L.phModuleTitle} /></Field>
          <Field label={L.moduleContent}>
            <TextArea rows={4} value={htmlToPlainText(c.content)} onChange={(ev) => set(c.id, "content", ev.target.value)} placeholder={L.phModuleContent} />
          </Field>
          <Field label={L.moduleImages}>
            <div className="flex flex-wrap gap-2">
              {c.images.map((img, i) => (
                <div key={i} className="group relative">
                  <img src={img} alt="" className="h-14 w-20 rounded border border-gray-200 object-cover" />
                  <button
                    onClick={() => updateData((d) => { const it = d.customSections.find((x) => x.id === c.id); if (it) it.images = it.images.filter((_, j) => j !== i); })}
                    className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white group-hover:flex"
                    title={L.remove}
                  >×</button>
                </div>
              ))}
              <label className="flex h-14 w-20 cursor-pointer items-center justify-center rounded border border-dashed border-gray-300 text-xs text-gray-400 hover:border-brand-400 hover:text-brand-600">
                {L.addImage}
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImages(c.id, e.target.files)} />
              </label>
            </div>
          </Field>
        </Card>
      ))}
      <AddButton onClick={add} text={L.addCustom} />
    </div>
  );
}

/* ---------------- 布局排序 ---------------- */

export function LayoutSection() {
  const { data, sectionOrder, setSectionOrder } = useResumeStore();
  const L = useUiT();
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const resolved = buildSectionOrder(data, sectionOrder);
  const labelOf = (k: string) =>
    k.startsWith("custom:")
      ? data.customSections.find((c) => `custom:${c.id}` === k)?.title || L.layoutCustomFallback
      : L.sections[k] || k;

  return (
    <div className="space-y-2 p-1">
      <p className="text-xs text-gray-500">{L.layoutHint}</p>
      {resolved.map((k, i) => (
        <div
          key={k}
          draggable
          onDragStart={() => setDragIdx(i)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => { if (dragIdx !== null && dragIdx !== i) setSectionOrder(moveItem(resolved, dragIdx, i)); setDragIdx(null); }}
          className={`flex cursor-grab items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ${dragIdx === i ? "opacity-50" : ""}`}
        >
          <span className="text-gray-300">⠿</span>
          <span className="flex-1 text-gray-700">{labelOf(k)}</span>
          <span className="flex gap-0.5">
            <button
              onClick={() => { if (i > 0) setSectionOrder(moveItem(resolved, i, i - 1)); }}
              className="rounded px-1 text-gray-400 hover:bg-gray-100"
              disabled={i === 0}
            >↑</button>
            <button
              onClick={() => { if (i < resolved.length - 1) setSectionOrder(moveItem(resolved, i, i + 1)); }}
              className="rounded px-1 text-gray-400 hover:bg-gray-100"
              disabled={i === resolved.length - 1}
            >↓</button>
          </span>
        </div>
      ))}
    </div>
  );
}
