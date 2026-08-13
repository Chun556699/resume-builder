"use client";

import React, { useState, useRef } from "react";
import { useResumeStore } from "@/store/resumeStore";
import { Field, Input, TextArea, Card, AddButton } from "./fields";
import { uid, readImageAsDataUrl, moveItem, buildSectionOrder } from "@/lib/utils";
import BatchStylePanel from "./BatchStylePanel";

type Tab = "personal" | "experience" | "education" | "project" | "skill" | "custom" | "layout" | "batch";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "personal", label: "个人信息", icon: "👤" },
  { id: "experience", label: "工作经历", icon: "💼" },
  { id: "education", label: "教育经历", icon: "🎓" },
  { id: "project", label: "项目经历", icon: "🚀" },
  { id: "skill", label: "专业技能", icon: "⚡" },
  { id: "custom", label: "自定义", icon: "📌" },
  { id: "batch", label: "批量样式", icon: "🎨" },
  { id: "layout", label: "布局排序", icon: "🔀" },
];

export default function EditorPanel() {
  const [tab, setTab] = useState<Tab>("personal");

  return (
    <div className="flex h-full flex-col">
      {/* 功能导航：2 列网格，图标 + 文字横向显示 */}
      <div className="grid grid-cols-2 gap-1.5 border-b border-gray-100 p-3">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg border px-3 py-2 text-left text-sm transition ${
                active
                  ? "border-brand-500 bg-brand-50 font-semibold text-brand-600"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <span className="text-base leading-none">{t.icon}</span>
              <span className="leading-none">{t.label}</span>
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
  const p = data.personal;
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (key: keyof typeof p, value: string) =>
    updateData((d) => {
      (d.personal as any)[key] = value;
    });

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("请选择图片文件"); return; }
    try {
      const url = await readImageAsDataUrl(file);
      updateData((d) => { d.personal.avatar = url; });
    } catch { alert("图片读取失败"); }
  };

  return (
    <div className="space-y-3">
      <Card title="个人照片">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50"
            style={{ width: 80, height: 80, borderRadius: avatarShape === "circle" ? "50%" : "6px" }}
          >
            {p.avatar ? (
              <img src={p.avatar} alt="头像" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xl text-gray-300">👤</span>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <button onClick={() => fileRef.current?.click()} className="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600">
              导入照片
            </button>
            {p.avatar && (
              <button onClick={() => updateData((d) => { d.personal.avatar = ""; })} className="text-xs text-red-500 hover:underline">移除照片</button>
            )}
            <p className="text-[11px] text-gray-400">支持 JPG / PNG（建议高清图）</p>
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleAvatar} />
        </div>

        {/* 形状与大小 */}
        <div className="mt-3 space-y-2.5 border-t border-gray-100 pt-3">
          <div className="flex items-center gap-2">
            <span className="w-14 text-xs text-gray-500">形状</span>
            <div className="flex gap-1 rounded-md bg-gray-100 p-0.5">
              <button
                onClick={() => setAvatarShape("circle")}
                className={`rounded px-2 py-1 text-xs ${avatarShape === "circle" ? "bg-white font-semibold text-brand-600 shadow-sm" : "text-gray-600"}`}
              >圆形</button>
              <button
                onClick={() => setAvatarShape("square")}
                className={`rounded px-2 py-1 text-xs ${avatarShape === "square" ? "bg-white font-semibold text-brand-600 shadow-sm" : "text-gray-600"}`}
              >矩形</button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-14 text-xs text-gray-500">大小</span>
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

      <Card title="基本信息">
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="姓名"><Input value={p.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="张三" /></Field>
          <Field label="求职岗位"><Input value={p.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} placeholder="前端工程师" /></Field>
          <Field label="邮箱"><Input value={p.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" /></Field>
          <Field label="电话"><Input value={p.phone} onChange={(e) => set("phone", e.target.value)} placeholder="138-0000-0000" /></Field>
          <Field label="所在地"><Input value={p.location} onChange={(e) => set("location", e.target.value)} placeholder="北京" /></Field>
          <Field label="个人网站"><Input value={p.website} onChange={(e) => set("website", e.target.value)} placeholder="https://github.com/xxx" /></Field>
        </div>
      </Card>

      <Card title="个人简介 / 求职总结">
        <TextArea
          rows={6}
          value={p.summary}
          onChange={(e) => set("summary", e.target.value)}
          placeholder="一句话突出你的核心优势、经验与成就……"
        />
        <p className="text-[11px] text-gray-400">建议 80-150 字，量化成果更佳。可使用 AI 一键优化。</p>
      </Card>
    </div>
  );
}

/* ---------------- 工作经历 ---------------- */

function ExperienceSection() {
  const { data, updateData } = useResumeStore();
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
        <Card key={e.id} title={e.company || e.position || "工作经历"} onRemove={() => remove(e.id)}>
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="公司"><Input value={e.company} onChange={(ev) => set(e.id, "company", ev.target.value)} placeholder="公司名称" /></Field>
            <Field label="职位"><Input value={e.position} onChange={(ev) => set(e.id, "position", ev.target.value)} placeholder="职位" /></Field>
            <Field label="地点"><Input value={e.location} onChange={(ev) => set(e.id, "location", ev.target.value)} placeholder="城市" /></Field>
            <Field label="开始时间"><Input value={e.startDate} onChange={(ev) => set(e.id, "startDate", ev.target.value)} placeholder="2021-07" /></Field>
            <Field label="结束时间"><Input value={e.endDate} onChange={(ev) => set(e.id, "endDate", ev.target.value)} placeholder="2024-06" disabled={e.current} /></Field>
            <label className="flex items-center gap-1.5 pt-5 text-xs text-gray-600">
              <input type="checkbox" checked={e.current} onChange={(ev) => set(e.id, "current", ev.target.checked)} />
              至今
            </label>
          </div>
          <Field label="工作描述（每行一个要点）" hint="用换行分隔多个要点">
            <TextArea rows={5} value={e.description} onChange={(ev) => set(e.id, "description", ev.target.value)} placeholder="负责……，实现……，提升……%" />
          </Field>
        </Card>
      ))}
      <AddButton onClick={add} text="添加工作经历" />
    </div>
  );
}

/* ---------------- 教育经历 ---------------- */

function EducationSection() {
  const { data, updateData } = useResumeStore();
  const list = data.education;
  const add = () => updateData((d) => { d.education.push({ id: uid("edu"), school: "", degree: "", major: "", startDate: "", endDate: "", description: "" }); });
  const remove = (id: string) => updateData((d) => { d.education = d.education.filter((x) => x.id !== id); });
  const set = (id: string, key: string, value: string) => updateData((d) => { const item = d.education.find((x) => x.id === id); if (item) (item as any)[key] = value; });

  return (
    <div className="space-y-3">
      {list.map((e) => (
        <Card key={e.id} title={e.school || "教育经历"} onRemove={() => remove(e.id)}>
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="学校"><Input value={e.school} onChange={(ev) => set(e.id, "school", ev.target.value)} placeholder="某某大学" /></Field>
            <Field label="学历"><Input value={e.degree} onChange={(ev) => set(e.id, "degree", ev.target.value)} placeholder="本科 / 硕士" /></Field>
            <Field label="专业"><Input value={e.major} onChange={(ev) => set(e.id, "major", ev.target.value)} placeholder="计算机科学与技术" /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="开始"><Input value={e.startDate} onChange={(ev) => set(e.id, "startDate", ev.target.value)} placeholder="2014-09" /></Field>
              <Field label="结束"><Input value={e.endDate} onChange={(ev) => set(e.id, "endDate", ev.target.value)} placeholder="2018-06" /></Field>
            </div>
          </div>
          <Field label="补充说明"><Input value={e.description} onChange={(ev) => set(e.id, "description", ev.target.value)} placeholder="GPA、荣誉、课程等" /></Field>
        </Card>
      ))}
      <AddButton onClick={add} text="添加教育经历" />
    </div>
  );
}

/* ---------------- 项目经历 ---------------- */

function ProjectSection() {
  const { data, updateData } = useResumeStore();
  const list = data.projects;
  const add = () => updateData((d) => { d.projects.push({ id: uid("proj"), name: "", role: "", link: "", startDate: "", endDate: "", description: "" }); });
  const remove = (id: string) => updateData((d) => { d.projects = d.projects.filter((x) => x.id !== id); });
  const set = (id: string, key: string, value: string) => updateData((d) => { const item = d.projects.find((x) => x.id === id); if (item) (item as any)[key] = value; });

  return (
    <div className="space-y-3">
      {list.map((pr) => (
        <Card key={pr.id} title={pr.name || "项目经历"} onRemove={() => remove(pr.id)}>
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="项目名称"><Input value={pr.name} onChange={(ev) => set(pr.id, "name", ev.target.value)} placeholder="项目名称" /></Field>
            <Field label="担任角色"><Input value={pr.role} onChange={(ev) => set(pr.id, "role", ev.target.value)} placeholder="核心开发者" /></Field>
            <Field label="项目链接"><Input value={pr.link} onChange={(ev) => set(pr.id, "link", ev.target.value)} placeholder="https://github.com/..." /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="开始"><Input value={pr.startDate} onChange={(ev) => set(pr.id, "startDate", ev.target.value)} placeholder="2022-01" /></Field>
              <Field label="结束"><Input value={pr.endDate} onChange={(ev) => set(pr.id, "endDate", ev.target.value)} placeholder="2022-12" /></Field>
            </div>
          </div>
          <Field label="项目描述（每行一个要点）">
            <TextArea rows={4} value={pr.description} onChange={(ev) => set(pr.id, "description", ev.target.value)} placeholder="项目背景、你的职责、技术栈、成果……" />
          </Field>
        </Card>
      ))}
      <AddButton onClick={add} text="添加项目经历" />
    </div>
  );
}

/* ---------------- 技能 ---------------- */

function SkillSection() {
  const { data, updateData } = useResumeStore();
  const list = data.skills;
  const add = () => updateData((d) => { d.skills.push({ id: uid("skill"), name: "", items: "" }); });
  const remove = (id: string) => updateData((d) => { d.skills = d.skills.filter((x) => x.id !== id); });
  const set = (id: string, key: string, value: string) => updateData((d) => { const item = d.skills.find((x) => x.id === id); if (item) (item as any)[key] = value; });

  return (
    <div className="space-y-3">
      {list.map((s) => (
        <Card key={s.id} title={s.name || "技能分组"} onRemove={() => remove(s.id)}>
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="分组名称"><Input value={s.name} onChange={(ev) => set(s.id, "name", ev.target.value)} placeholder="前端 / 后端 / 工具" /></Field>
            <Field label="技能（逗号分隔）"><Input value={s.items} onChange={(ev) => set(s.id, "items", ev.target.value)} placeholder="React, TypeScript, Tailwind" /></Field>
          </div>
        </Card>
      ))}
      <AddButton onClick={add} text="添加技能分组" />
    </div>
  );
}

/* ---------------- 自定义模块 ---------------- */

function CustomSection() {
  const { data, updateData, sectionOrder, setSectionOrder } = useResumeStore();
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
        if (f.type.startsWith("image/")) urls.push(await readImageAsDataUrl(f));
      }
      updateData((d) => { const item = d.customSections.find((x) => x.id === id); if (item) item.images = [...item.images, ...urls]; });
    } catch { alert("图片读取失败"); }
  };

  return (
    <div className="space-y-3">
      {list.map((c) => (
        <Card key={c.id} title={c.title || "自定义模块"} onRemove={() => remove(c.id)}>
          <Field label="模块标题"><Input value={c.title} onChange={(ev) => set(c.id, "title", ev.target.value)} placeholder="荣誉奖项 / 证书 / 语言" /></Field>
          <Field label="内容（每行一条）">
            <TextArea rows={4} value={c.content} onChange={(ev) => set(c.id, "content", ev.target.value)} placeholder="逐行填写内容" />
          </Field>
          <Field label="图片（作品集 / 证书等）">
            <div className="flex flex-wrap gap-2">
              {c.images.map((img, i) => (
                <div key={i} className="group relative">
                  <img src={img} alt="" className="h-14 w-20 rounded border border-gray-200 object-cover" />
                  <button
                    onClick={() => updateData((d) => { const it = d.customSections.find((x) => x.id === c.id); if (it) it.images = it.images.filter((_, j) => j !== i); })}
                    className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white group-hover:flex"
                    title="删除"
                  >×</button>
                </div>
              ))}
              <label className="flex h-14 w-20 cursor-pointer items-center justify-center rounded border border-dashed border-gray-300 text-xs text-gray-400 hover:border-brand-400 hover:text-brand-600">
                + 图片
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImages(c.id, e.target.files)} />
              </label>
            </div>
          </Field>
        </Card>
      ))}
      <AddButton onClick={add} text="添加自定义模块" />
    </div>
  );
}

/* ---------------- 布局排序 ---------------- */

const SECTION_LABELS: Record<string, string> = {
  summary: "个人简介",
  experience: "工作经历",
  project: "项目经历",
  education: "教育经历",
  skill: "专业技能",
};

export function LayoutSection() {
  const { data, sectionOrder, setSectionOrder } = useResumeStore();
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const resolved = buildSectionOrder(data, sectionOrder);
  const labelOf = (k: string) =>
    k.startsWith("custom:")
      ? data.customSections.find((c) => `custom:${c.id}` === k)?.title || "自定义模块"
      : SECTION_LABELS[k] || k;

  return (
    <div className="space-y-2 p-1">
      <p className="text-xs text-gray-500">拖拽调整简历各板块的显示顺序（自动排版会按此顺序输出）。</p>
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
