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
import { buildSectionOrder, htmlToPlainText } from "@/lib/utils";
import { normalizeResumePayload } from "@/lib/normalizeResume";
import { fileToImportPayload, ocrResume } from "@/lib/importResume";
import { useUiStore } from "@/store/uiStore";
import { useUiT } from "@/lib/useUiT";
import { Icon } from "../Icon";

function useAiAction() {
  const L = useUiT();
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
      setError(e?.message || L.aiErrCall);
      // AI 额度不足时弹出 AI 次卡购买
      if (e?.code === "NO_AI_CREDIT") {
        useUiStore.getState().openPay("ai");
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, result, setResult, run };
}

const MODULE_KEYS = ["summary", "experience", "project", "education", "skill", "custom"];

// AI 面板折叠区块：默认收起，避免五个功能全部铺开导致面板拥挤
function AiSection({
  icon,
  title,
  accent = false,
  defaultOpen = false,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  accent?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className={`overflow-hidden rounded-xl border transition ${
        accent ? "border-brand-200 bg-brand-50/40" : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className={`flex items-center gap-2 text-sm font-semibold ${accent ? "text-brand-700" : "text-gray-700"}`}>
          {icon}
          {title}
        </span>
        <Icon
          name={open ? "chevron-up" : "chevron-down"}
          size={14}
          className={`shrink-0 transition-transform ${open ? "text-brand-500" : "text-gray-400"}`}
        />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

export default function AiPanel() {
  const { data, updateData, setData, sectionOrder, setSectionOrder } = useResumeStore();
  const L = useUiT();
  const uiLang = useUiStore((s) => s.uiLang);
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
    x?.company || x?.name || x?.school || x?.title || x?.position || L.aiEntry;

  const getPolishedText = (): string => {
    switch (polishType) {
      case "summary": return htmlToPlainText(data.personal.summary);
      case "experience": return htmlToPlainText(activePolishItem?.description || "");
      case "project": return htmlToPlainText(activePolishItem?.description || "");
      case "education": return htmlToPlainText(activePolishItem?.description || "");
      case "skill": return htmlToPlainText(activePolishItem?.items || "");
      case "custom": return htmlToPlainText(activePolishItem?.content || "");
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
    if (!roughText.trim()) { lingo.run(async () => { throw new Error(L.aiErrInputFirst); }); return; }
    await lingo.run(() => polishText(roughText, uiLang === "en" ? "resume (English)" : "简历"));
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
    if (!json) { gen.run(async () => { throw new Error(L.aiErrJson); }); return; }
    const merged = normalizeResumePayload(json);
    if (!merged.personal.fullName) merged.personal.fullName = data.personal.fullName;
    if (!merged.personal.email) merged.personal.email = data.personal.email;
    if (!merged.personal.phone) merged.personal.phone = data.personal.phone;
    setData(merged);
  };

  const handleTailor = async () => {
    if (!jd.trim()) { tailor.run(async () => { throw new Error(L.aiErrJdFirst); }); return; }
    const r = await tailor.run(() => tailorToJob(JSON.stringify(data), jd));
    if (!r) return;
    const json = extractJson(r);
    if (!json) { tailor.run(async () => { throw new Error(L.aiErrJson); }); return; }
    setData(normalizeResumePayload(json));
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setImportError("");
    try {
      const payload = await fileToImportPayload(file);
      if ((payload.images?.length ?? 0) === 0 && !payload.text) throw new Error(L.aiErrFile);
      const imported = await ocrResume(payload);
      const hasContent = imported.personal.fullName || imported.experiences.length > 0 || imported.skills.length > 0;
      if (!hasContent) throw new Error(L.aiErrNoContent);
      setData(imported);
      setSectionOrder(buildSectionOrder(imported, sectionOrder));
    } catch (err: any) {
      setImportError(err?.message || L.aiErrImport);
      // AI 额度不足时弹出 AI 次卡购买
      if (err?.code === "NO_AI_CREDIT") {
        useUiStore.getState().openPay("ai");
      }
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
      {/* 一键生成：主功能，默认展开 */}
      <AiSection icon={<Icon name="bolt" size={15} />} title={L.aiGenerate} accent defaultOpen>
        <textarea
          rows={3}
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder={L.aiGenPh}
          className="w-full rounded-md border border-gray-300 px-2.5 py-2 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <button onClick={handleGenerate} disabled={gen.loading} className={`${primary} mt-2.5 w-full`}>
          {gen.loading ? L.aiGenerating : L.aiGenBtn}
        </button>
      </AiSection>

      {/* 模块润色 */}
      <AiSection icon={<Icon name="brush" size={15} />} title={L.aiPolish}>
        <div className="space-y-2">
          <select value={polishType} onChange={(e) => { setPolishType(e.target.value); setPolishItemId(""); }} className={selectCls}>
            {MODULE_KEYS.map((k) => <option key={k} value={k}>{L.sections[k] || k}</option>)}
          </select>
          {polishItems.length > 0 && (
            <select value={activePolishItem?.id || ""} onChange={(e) => setPolishItemId(e.target.value)} className={selectCls}>
              {polishItems.map((x: any) => <option key={x.id} value={x.id}>{itemLabel(x)}</option>)}
            </select>
          )}
          <button onClick={handlePolishModule} disabled={polish.loading} className={`${primary} w-full`}>
            {polish.loading ? L.aiPolishing : L.aiPolishBtn(L.sections[polishType] || polishType)}
          </button>
        </div>
      </AiSection>

      {/* 语言润色 */}
      <AiSection icon={<Icon name="edit" size={15} />} title={L.aiLingo}>
        <p className="mb-2 text-xs text-gray-500">{L.aiLingoHint}</p>
        <textarea
          rows={3}
          value={roughText}
          onChange={(e) => setRoughText(e.target.value)}
          placeholder={L.aiLingoPh}
          className="w-full rounded-md border border-gray-300 px-2.5 py-2 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <button onClick={handleLingo} disabled={lingo.loading} className={`${primary} mt-2.5 w-full`}>
          {lingo.loading ? L.aiPolishing : L.aiLingoBtn}
        </button>
        {lingo.result && (
          <div className="mt-2">
            <textarea rows={4} value={lingo.result} onChange={(e) => lingo.setResult(e.target.value)} className="w-full rounded-md border border-brand-200 bg-brand-50/40 px-2.5 py-2 text-xs outline-none" />
            <div className="mt-1.5 flex items-center gap-1.5">
              <select value={polishType} onChange={(e) => setPolishType(e.target.value)} className={selectCls}>
                {MODULE_KEYS.map((k) => <option key={k} value={k}>{L.sections[k] || k}</option>)}
              </select>
              <button onClick={applyLingoToModule} className={secondary}>{L.aiApplyTo}</button>
            </div>
          </div>
        )}
      </AiSection>

      {/* JD 定制 */}
      <AiSection icon={<Icon name="target" size={15} />} title={L.aiTailor}>
        <textarea
          rows={3}
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          placeholder={L.aiTailorPh}
          className="w-full rounded-md border border-gray-300 px-2.5 py-2 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <button onClick={handleTailor} disabled={tailor.loading} className={`${primary} mt-2.5 w-full`}>
          {tailor.loading ? L.aiTailoring : L.aiTailorBtn}
        </button>
      </AiSection>

      {/* 以旧换新 */}
      <AiSection icon={<Icon name="refresh" size={15} />} title={L.aiRecycle}>
        <p className="mb-2 text-xs text-gray-500">{L.aiRecycleHint}</p>
        <input ref={importRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,image/*" className="hidden" onChange={handleImportFile} />
        <button onClick={() => importRef.current?.click()} disabled={importing} className={`${primary} w-full`}>
          {importing ? L.aiRecognizing : L.aiRecycleBtn}
        </button>
        {importError && <div className="mt-2 rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-600">{importError}</div>}
      </AiSection>

      {(gen.error || tailor.error || polish.error || lingo.error) && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
          {gen.error || tailor.error || polish.error || lingo.error}
        </div>
      )}
    </div>
  );
}
