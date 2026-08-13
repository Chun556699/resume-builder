"use client";

import React, { useMemo, useState } from "react";
import { useResumeStore } from "@/store/resumeStore";
import {
  generateFullResume,
  tailorToJob,
  extractJson,
  polishText,
  polishSummary,
  polishExperience,
  polishProject,
  polishEducation,
  polishSkills,
  polishCustom,
} from "@/lib/ai";
import { ResumeData } from "@/types/resume";
import { uid, buildSectionOrder } from "@/lib/utils";
import { fileToImages, ocrResume } from "@/lib/importResume";

function useAiAction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");

  const run = async (fn: () => Promise<string>) => {
    setLoading(true);
    setError("");
    setResult("");
    try {
      const r = await fn();
      setResult(r);
      return r;
    } catch (e: any) {
      setError(e?.message || "AI 调用失败");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, result, setResult, run };
}

function normalizeResume(json: any): ResumeData {
  const empty: ResumeData = {
    personal: { fullName: "", jobTitle: "", email: "", phone: "", location: "", website: "", avatar: "", summary: "" },
    experiences: [], education: [], projects: [], skills: [], customSections: [],
  };
  if (!json || typeof json !== "object") return empty;

  const p = json.personal || {};
  empty.personal = {
    fullName: String(p.fullName || ""), jobTitle: String(p.jobTitle || ""),
    email: String(p.email || ""), phone: String(p.phone || ""),
    location: String(p.location || ""), website: String(p.website || ""),
    avatar: "", summary: String(p.summary || ""),
  };

  const arr = (x: any) => (Array.isArray(x) ? x : []);
  empty.experiences = arr(json.experiences).map((x: any) => ({
    id: uid("exp"), company: String(x.company || ""), position: String(x.position || ""),
    location: String(x.location || ""), startDate: String(x.startDate || ""),
    endDate: String(x.endDate || ""), current: !!x.current, description: String(x.description || ""),
  }));
  empty.education = arr(json.education).map((x: any) => ({
    id: uid("edu"), school: String(x.school || ""), degree: String(x.degree || ""),
    major: String(x.major || ""), startDate: String(x.startDate || ""),
    endDate: String(x.endDate || ""), description: String(x.description || ""),
  }));
  empty.projects = arr(json.projects).map((x: any) => ({
    id: uid("proj"), name: String(x.name || ""), role: String(x.role || ""),
    link: String(x.link || ""), startDate: String(x.startDate || ""),
    endDate: String(x.endDate || ""), description: String(x.description || ""),
  }));
  const skills = arr(json.skills);
  if (skills.length > 0) {
    empty.skills = typeof skills[0] === "string"
      ? [{ id: uid("skill"), name: "专业技能", items: skills.join(", ") }]
      : skills.map((x: any) => ({ id: uid("skill"), name: String(x.name || "技能"), items: Array.isArray(x.items) ? x.items.join(", ") : String(x.items || "") }));
  }
  empty.customSections = arr(json.customSections).map((x: any) => ({
    id: uid("custom"), title: String(x.title || ""), content: String(x.content || ""), images: [],
  }));
  return empty;
}

const MODULE_LABELS: Record<string, string> = {
  summary: "个人简介",
  experience: "工作经历",
  project: "项目经历",
  education: "教育经历",
  skill: "专业技能",
  custom: "自定义模块",
};

export default function AiPanel() {
  const { data, updateData, setData, sectionOrder, setSectionOrder } = useResumeStore();
  const [brief, setBrief] = useState("");
  const [jd, setJd] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const importRef = React.useRef<HTMLInputElement>(null);

  const gen = useAiAction();
  const tailor = useAiAction();
  const polish = useAiAction();
  const lingo = useAiAction();

  // 模块润色：选择模块类型 + 具体条目
  const [polishType, setPolishType] = useState("summary");
  const [polishItemId, setPolishItemId] = useState("");

  const polishItems = useMemo(() => {
    if (polishType === "experience") return data.experiences;
    if (polishType === "project") return data.projects;
    if (polishType === "education") return data.education;
    if (polishType === "skill") return data.skills;
    if (polishType === "custom") return data.customSections;
    return [];
  }, [polishType, data]);

  const activePolishItem: any = polishItems.find((x: any) => x.id === polishItemId) || polishItems[0];

  const itemLabel = (x: any) =>
    x?.company || x?.name || x?.school || x?.title || x?.position || "条目";

  const getPolishedText = (): string => {
    switch (polishType) {
      case "summary": return data.personal.summary;
      case "experience": return activePolishItem?.description || "";
      case "project": return activePolishItem?.description || "";
      case "education": return activePolishItem?.description || "";
      case "skill": return activePolishItem?.items || "";
      case "custom": return activePolishItem?.content || "";
      default: return "";
    }
  };

  const handlePolishModule = async () => {
    let r: string | null = null;
    if (polishType === "summary") r = await polish.run(() => polishSummary(data.personal.summary, data.personal.jobTitle));
    else if (polishType === "experience") r = await polish.run(() => polishExperience(activePolishItem?.description || "", activePolishItem?.position));
    else if (polishType === "project") r = await polish.run(() => polishProject(activePolishItem?.description || "", activePolishItem?.name));
    else if (polishType === "education") r = await polish.run(() => polishEducation(activePolishItem?.description || "", activePolishItem?.school));
    else if (polishType === "skill") r = await polish.run(() => polishSkills(activePolishItem?.items || ""));
    else if (polishType === "custom") r = await polish.run(() => polishCustom(activePolishItem?.content || "", activePolishItem?.title));

    if (!r) return;
    updateData((d) => {
      if (polishType === "summary") d.personal.summary = r!.trim();
      else if (polishType === "experience") { const it = d.experiences.find((x) => x.id === activePolishItem.id); if (it) it.description = r!.trim(); }
      else if (polishType === "project") { const it = d.projects.find((x) => x.id === activePolishItem.id); if (it) it.description = r!.trim(); }
      else if (polishType === "education") { const it = d.education.find((x) => x.id === activePolishItem.id); if (it) it.description = r!.trim(); }
      else if (polishType === "skill") { const it = d.skills.find((x) => x.id === activePolishItem.id); if (it) it.items = r!.trim(); }
      else if (polishType === "custom") { const it = d.customSections.find((x) => x.id === activePolishItem.id); if (it) it.content = r!.trim(); }
    });
  };

  // 语言润色：大白话 → 专业表达
  const [roughText, setRoughText] = useState("");
  const handleLingo = async () => {
    if (!roughText.trim()) { lingo.run(async () => { throw new Error("请先输入要润色的大白话"); }); return; }
    await lingo.run(() => polishText(roughText, "简历"));
  };

  const applyLingoToModule = () => {
    const r = lingo.result;
    if (!r) return;
    updateData((d) => {
      if (polishType === "summary") d.personal.summary = r;
      else if (polishType === "experience") { const it = d.experiences.find((x) => x.id === activePolishItem?.id); if (it) it.description = r; }
      else if (polishType === "project") { const it = d.projects.find((x) => x.id === activePolishItem?.id); if (it) it.description = r; }
      else if (polishType === "education") { const it = d.education.find((x) => x.id === activePolishItem?.id); if (it) it.description = r; }
      else if (polishType === "skill") { const it = d.skills.find((x) => x.id === activePolishItem?.id); if (it) it.items = r; }
      else if (polishType === "custom") { const it = d.customSections.find((x) => x.id === activePolishItem?.id); if (it) it.content = r; }
    });
  };

  const handleGenerate = async () => {
    const r = await gen.run(() => generateFullResume({
      name: data.personal.fullName, targetJob: data.personal.jobTitle || brief,
      yearsOfExperience: "", skills: data.skills.map((s) => s.items).join(", "), highlights: brief,
    }));
    if (!r) return;
    const json = extractJson(r);
    if (!json) { gen.run(async () => { throw new Error("AI 返回内容不是有效 JSON"); }); return; }
    const merged = normalizeResume(json);
    if (!merged.personal.fullName) merged.personal.fullName = data.personal.fullName;
    if (!merged.personal.email) merged.personal.email = data.personal.email;
    if (!merged.personal.phone) merged.personal.phone = data.personal.phone;
    setData(merged);
  };

  const handleTailor = async () => {
    if (!jd.trim()) { tailor.run(async () => { throw new Error("请先填写职位描述（JD）"); }); return; }
    const r = await tailor.run(() => tailorToJob(JSON.stringify(data), jd));
    if (!r) return;
    const json = extractJson(r);
    if (!json) { tailor.run(async () => { throw new Error("AI 返回内容不是有效 JSON"); }); return; }
    setData(normalizeResume(json));
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setImportError("");
    try {
      const images = await fileToImages(file);
      if (images.length === 0) throw new Error("无法读取该文件");
      const imported = await ocrResume(images);
      const hasContent = imported.personal.fullName || imported.experiences.length > 0 || imported.skills.length > 0;
      if (!hasContent) throw new Error("未识别到有效简历内容");
      setData(imported);
      setSectionOrder(buildSectionOrder(imported, sectionOrder));
    } catch (err: any) {
      setImportError(err?.message || "导入失败");
    } finally {
      setImporting(false);
      if (importRef.current) importRef.current.value = "";
    }
  };

  const btn = "rounded-md px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50";
  const primary = `${btn} bg-brand-500 text-white hover:bg-brand-600`;
  const secondary = `${btn} border border-gray-300 text-gray-700 hover:bg-gray-50`;
  const selectCls = "w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs outline-none focus:border-brand-500";

  return (
    <div className="space-y-3 text-sm">
      {/* 以旧换新 */}
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
        <h4 className="mb-1.5 font-semibold text-emerald-700">🔄 以旧换新</h4>
        <p className="mb-2 text-xs text-gray-500">上传旧简历（图片 / PDF），AI 自动 OCR 识别生成结构化简历。</p>
        <input ref={importRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,image/*" className="hidden" onChange={handleImportFile} />
        <button onClick={() => importRef.current?.click()} disabled={importing} className={`${primary} w-full`}>
          {importing ? "识别中…" : "上传旧简历并识别"}
        </button>
        {importError && <div className="mt-2 rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-600">{importError}</div>}
      </div>

      {/* 语言润色 */}
      <div className="rounded-lg border border-gray-200 p-3">
        <h4 className="mb-1.5 font-semibold text-gray-700">✍️ 语言润色</h4>
        <p className="mb-2 text-xs text-gray-500">把你的大白话写进去，AI 自动改成专业、量化的简历语言。</p>
        <textarea
          rows={3}
          value={roughText}
          onChange={(e) => setRoughText(e.target.value)}
          placeholder="例：我在公司做了个后台系统，用了Vue，感觉做得还行，负责了好几个页面……"
          className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <button onClick={handleLingo} disabled={lingo.loading} className={`${primary} mt-2 w-full`}>
          {lingo.loading ? "润色中…" : "AI 润色语言"}
        </button>
        {lingo.result && (
          <div className="mt-2">
            <textarea rows={4} value={lingo.result} onChange={(e) => lingo.setResult(e.target.value)} className="w-full rounded-md border border-brand-200 bg-brand-50/40 px-2.5 py-1.5 text-xs outline-none" />
            <div className="mt-1.5 flex items-center gap-1.5">
              <select value={polishType} onChange={(e) => setPolishType(e.target.value)} className={selectCls}>
                {Object.entries(MODULE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button onClick={applyLingoToModule} className={secondary}>应用到模块</button>
            </div>
          </div>
        )}
      </div>

      {/* 模块润色 */}
      <div className="rounded-lg border border-gray-200 p-3">
        <h4 className="mb-1.5 font-semibold text-gray-700">🪄 模块润色</h4>
        <div className="space-y-2">
          <select value={polishType} onChange={(e) => { setPolishType(e.target.value); setPolishItemId(""); }} className={selectCls}>
            {Object.entries(MODULE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {polishItems.length > 0 && (
            <select value={activePolishItem?.id || ""} onChange={(e) => setPolishItemId(e.target.value)} className={selectCls}>
              {polishItems.map((x: any) => <option key={x.id} value={x.id}>{itemLabel(x)}</option>)}
            </select>
          )}
          <button onClick={handlePolishModule} disabled={polish.loading} className={`${primary} w-full`}>
            {polish.loading ? "润色中…" : `润色「${MODULE_LABELS[polishType]}」`}
          </button>
        </div>
      </div>

      {/* 一键生成 */}
      <div className="rounded-lg border border-brand-200 bg-brand-50/50 p-3">
        <h4 className="mb-1.5 font-semibold text-brand-700">✨ 一键生成简历</h4>
        <textarea rows={2} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="描述背景、目标岗位与亮点，AI 自动生成完整简历……" className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-xs outline-none focus:border-brand-500" />
        <button onClick={handleGenerate} disabled={gen.loading} className={`${primary} mt-2 w-full`}>
          {gen.loading ? "生成中…" : "生成完整简历"}
        </button>
      </div>

      {/* JD 定制 */}
      <div className="rounded-lg border border-gray-200 p-3">
        <h4 className="mb-1.5 font-semibold text-gray-700">🎯 根据职位描述定制</h4>
        <textarea rows={3} value={jd} onChange={(e) => setJd(e.target.value)} placeholder="粘贴目标职位 JD，AI 据此优化简历……" className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-xs outline-none focus:border-brand-500" />
        <button onClick={handleTailor} disabled={tailor.loading} className={`${primary} mt-2 w-full`}>
          {tailor.loading ? "定制中…" : "根据 JD 定制简历"}
        </button>
      </div>

      {(gen.error || tailor.error || polish.error || lingo.error) && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
          {gen.error || tailor.error || polish.error || lingo.error}
        </div>
      )}
    </div>
  );
}
