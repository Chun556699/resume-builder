"use client";

import React, { useEffect, useRef, useState } from "react";
import { useResumeStore } from "@/store/resumeStore";
import { useUiStore } from "@/store/uiStore";
import { TemplateId, PaperSize, CnFontFamily, EnFontFamily } from "@/types/resume";
import { exportPdf } from "@/lib/pdfExport";
import { exportJson, exportImage, printResume, filenameFromName } from "@/lib/export";
import { PAPERS } from "@/lib/paper";
import { CN_FONTS, EN_FONTS } from "@/lib/fonts";
import { Icon } from "@/components/Icon";
import PayModal from "@/components/PayModal";
import AuthModal from "@/components/AuthModal";
import { consumeExport, getQuotaInfo } from "@/lib/quota";
import { EXPORT_PRICE_YUAN, AI_PRICE_YUAN, FREE_EXPORT_COUNT } from "@/lib/pricing";
import { useAuthStore } from "@/store/authStore";
import { uiT } from "@/lib/uiI18n";

const TEMPLATES: { id: TemplateId }[] = [
  { id: "classic" },
  { id: "modern" },
  { id: "compact" },
  { id: "elegant" },
  { id: "minimal" },
  { id: "sidebar" },
  { id: "timeline" },
  { id: "geek" },
  { id: "blocks" },
];

const COLORS = ["#1f4df5", "#0f766e", "#b91c1c", "#7c3aed", "#c2410c", "#334155", "#be185d", "#ca8a04"];

export default function Toolbar() {
  const {
    data, template, setTemplate, accentColor, setAccentColor, fontSize, setFontSize,
    cnFontFamily, setCnFontFamily, enFontFamily, setEnFontFamily, paperSize, setPaperSize, lineHeight, setLineHeight,
    showAvatar, setShowAvatar, loadSample, sectionOrder, avatarShape, avatarSize,
    lang, setLang,
  } = useResumeStore();
  const [exporting, setExporting] = useState<string>("");
  const [fitting, setFitting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const payModal = useUiStore((s) => s.payModal);
  const openPay = useUiStore((s) => s.openPay);
  const closePay = useUiStore((s) => s.closePay);
  const uiLang = useUiStore((s) => s.uiLang);
  const setUiLang = useUiStore((s) => s.setUiLang);
  const L = uiT(uiLang);
  const pendingRunRef = useRef<(() => Promise<void>) | null>(null);
  const [quotaInfo, setQuotaInfo] = useState(() => ({ freeRemaining: FREE_EXPORT_COUNT, paidCredits: 0, aiCredits: 0 }));
  useEffect(() => {
    setQuotaInfo(getQuotaInfo());
  }, []);
  // 登录状态下页面加载即从服务端同步最新用户信息与额度，
  // 避免 localStorage 里持久化的旧额度快照与服务端不一致
  useEffect(() => {
    useAuthStore.getState().refresh();
  }, []);
  const { token, user, logout, setQuota } = useAuthStore();
  const pageCount = useUiStore((s) => s.pageCount);

  const handleFitToPage = async () => {
    setFitting(true);
    try {
      let guard = 0;
      let size = fontSize;
      let lh = lineHeight;

      while (guard < 20 && useUiStore.getState().pageCount > 1 && size > 9) {
        size -= 1;
        setFontSize(size);
        await new Promise((r) => setTimeout(r, 320));
        guard++;
      }

      while (guard < 40 && useUiStore.getState().pageCount > 1 && lh > 1.05) {
        lh = Math.round((lh - 0.05) * 100) / 100;
        setLineHeight(lh);
        await new Promise((r) => setTimeout(r, 320));
        guard++;
      }

      const finalPages = useUiStore.getState().pageCount;
      if (finalPages > 1) {
        alert(L.fitResult(size, lh, finalPages));
      }
    } finally {
      setFitting(false);
    }
  };

  const refreshQuota = () => setQuotaInfo(getQuotaInfo());

  // 展示用额度：登录用户用服务端额度，游客用本地免费额度
  const displayQuota = user ? user.quota : quotaInfo;

  // 导出前检查额度：登录用户走服务端，游客走本地；额度不足时分别提示支付/登录
  const requireQuota = async (run: () => Promise<void>) => {
    if (user && token) {
      let res: Response;
      try {
        res = await fetch("/api/quota/consume", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        });
      } catch (e: any) {
        alert(L.alertNetwork);
        return;
      }
      if (res.status === 401) {
        await logout();
        pendingRunRef.current = run;
        setAuthOpen(true);
        return;
      }
      if (res.status === 402) {
        pendingRunRef.current = run;
        openPay("export");
        return;
      }
      if (!res.ok) {
        alert(L.alertQuotaCheck);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (data?.quota) setQuota(data.quota);
      const receiptId: string | null = data?.receiptId || null;
      try {
        await run();
      } catch {
        // 导出失败：凭消费凭证自动退还本次额度（一次性、15 分钟内有效）
        if (receiptId && token) {
          try {
            const rr = await fetch("/api/quota/refund", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ receiptId }),
            });
            const rd = await rr.json().catch(() => ({}));
            if (rr.ok && rd?.quota) {
              setQuota(rd.quota);
              alert(L.alertRefunded);
            } else {
              alert(L.alertRefundFail(rd?.error || "unknown"));
            }
          } catch {
            alert(L.alertRefundNoReq);
          }
        }
        /* 无凭证（旧版服务端）时 run 内部已提示错误 */
      }
      return;
    }

    // 游客：本地免费额度
    if (consumeExport()) {
      refreshQuota();
      try {
        await run();
      } catch {
        /* 导出失败 */
      }
      return;
    }
    // 游客无额度 → 提示登录/注册
    pendingRunRef.current = run;
    setAuthOpen(true);
  };

  const handlePaid = async () => {
    closePay();
    setAuthOpen(false);
    const fresh = useAuthStore.getState();
    if (fresh.token) {
      try {
        const res = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${fresh.token}` } });
        if (res.ok) {
          const d = await res.json().catch(() => ({}));
          if (d?.user?.quota) fresh.setQuota(d.user.quota);
        }
      } catch {
        /* ignore */
      }
    } else {
      refreshQuota();
    }
    const run = pendingRunRef.current;
    pendingRunRef.current = null;
    if (run) requireQuota(run);
  };

  const handlePdf = () =>
    requireQuota(async () => {
      setExporting("pdf");
      try {
        // 默认导出矢量文本版 PDF（ATS 可精确解析），预览不可用时自动回退
        await exportPdf(data, template, accentColor, fontSize, paperSize, cnFontFamily, enFontFamily, showAvatar, avatarShape, avatarSize, sectionOrder, lang, "ats");
      } catch (e: any) {
        alert(L.alertPdfFail + (e?.message || e));
        throw e;
      } finally {
        setExporting("");
      }
    });

  const handleImage = () =>
    requireQuota(async () => {
      const node = document.getElementById("resume-preview-root");
      if (!node) {
        alert(L.alertNoPreview);
        throw new Error(L.alertNoPreview);
      }
      setExporting("png");
      try {
        await exportImage(node as HTMLElement, filenameFromName(data.personal.fullName), "png");
      } catch (e: any) {
        alert(L.alertImageFail + (e?.message || e));
        throw e;
      } finally {
        setExporting("");
      }
    });

  const handlePrint = () => requireQuota(async () => { printResume(); });

  const btn = "rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50";
  const primary = "rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50";
  const selectCls = "rounded-md border border-gray-300 bg-white px-1.5 py-1 text-xs outline-none";

  const templateGroup = (
    <div className="flex flex-wrap items-center gap-1 rounded-md bg-gray-100 p-0.5">
      {TEMPLATES.map((t) => (
        <button
          key={t.id}
          onClick={() => setTemplate(t.id)}
          className={`rounded px-2 py-1 text-xs transition ${template === t.id ? "bg-white font-semibold text-brand-600 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
        >
          {L.tpl[t.id] || t.id}
        </button>
      ))}
      {/* 简历语言：切换板块标题等成品文案 */}
      <span className="mx-0.5 flex items-center gap-0.5 rounded bg-white px-0.5 py-0.5 shadow-sm" title={L.resumeLangTip}>
        {(["zh", "en"] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`rounded px-1.5 py-0.5 text-[11px] font-medium transition ${lang === l ? "bg-brand-50 text-brand-600" : "text-gray-400 hover:text-gray-600"}`}
          >
            {l === "zh" ? "中" : "EN"}
          </button>
        ))}
      </span>
      {/* 界面语言：编辑器/工具栏/弹窗文案 */}
      <span className="flex items-center gap-0.5 rounded bg-white px-0.5 py-0.5 shadow-sm">
        <span className="px-0.5 text-[10px] text-gray-300">{L.uiLangLabel}</span>
        {(["zh", "en"] as const).map((l) => (
          <button
            key={l}
            onClick={() => setUiLang(l)}
            className={`rounded px-1.5 py-0.5 text-[11px] font-medium transition ${uiLang === l ? "bg-brand-50 text-brand-600" : "text-gray-400 hover:text-gray-600"}`}
          >
            {l === "zh" ? "中" : "EN"}
          </button>
        ))}
      </span>
    </div>
  );

  const colorGroup = (
    <div className="flex flex-wrap items-center gap-1.5">
      {COLORS.map((c) => (
        <button
          key={c}
          onClick={() => setAccentColor(c)}
          className={`h-6 w-6 rounded-full border-2 transition ${accentColor === c ? "scale-110 border-gray-800" : "border-transparent"}`}
          style={{ backgroundColor: c }}
          title={c}
        />
      ))}
    </div>
  );

  const avatarToggle = (
    <label className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-600">
      <input type="checkbox" checked={showAvatar} onChange={(e) => setShowAvatar(e.target.checked)} className="h-4 w-4" />
      {L.avatar}
    </label>
  );

  const handleBuy = () => {
    if (user) openPay("export");
    else setAuthOpen(true);
  };

  const authControl = user ? (
    <span className="flex items-center gap-1.5 rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700">
      <span className="max-w-[80px] truncate font-medium">{user.username}</span>
      {user.uid ? (
        <span className="font-mono text-[11px] text-gray-500" title={L.uidTip}>
          #{user.uid}
        </span>
      ) : null}
      <button onClick={() => logout()} className="text-gray-400 hover:text-gray-600" title={L.logoutFull}>{L.logout}</button>
    </span>
  ) : (
    <button onClick={() => setAuthOpen(true)} className={btn}>
      <span className="flex items-center gap-1"><Icon name="id" size={14} />{L.loginRegister}</span>
    </button>
  );

  const quotaBadge = (
    <>
      <span className="rounded-md bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600" title={L.exportQuotaTip}>
        {displayQuota.freeRemaining > 0
          ? L.quotaFree(displayQuota.freeRemaining)
          : displayQuota.paidCredits > 0
            ? L.quotaPaid(displayQuota.paidCredits)
            : L.quotaNone}
      </span>
      {user && (
        <span className="rounded-md bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600" title={L.aiQuotaTip}>
          {L.quotaAi(displayQuota.aiCredits)}
        </span>
      )}
    </>
  );

  const primaryActions = (
    <>
      {authControl}
      {quotaBadge}
      <button onClick={handleBuy} className={btn} title={L.buyTip(EXPORT_PRICE_YUAN, AI_PRICE_YUAN)}>
        <span className="flex items-center gap-1"><Icon name="wallet" size={14} />{L.buy}</span>
      </button>
      <span className="hidden text-[11px] text-gray-400 xl:inline">{L.pages(pageCount)}</span>
      <button onClick={handlePdf} disabled={exporting === "pdf"} className={primary}>
        <span className="flex items-center gap-1"><Icon name="download" size={14} />{exporting === "pdf" ? L.generating : L.exportPdf}</span>
      </button>
    </>
  );

  const secondaryActions = (
    <>
      <button onClick={handleFitToPage} disabled={fitting} className={btn} title={L.fitTip}>
        <span className="flex items-center gap-1"><Icon name="layout-grid" size={14} />{fitting ? L.fitting : L.fitToPage}</span>
      </button>
      <button onClick={loadSample} className={btn}><span className="flex items-center gap-1"><Icon name="reload" size={14} />{L.sample}</span></button>
      <button onClick={() => exportJson(data, filenameFromName(data.personal.fullName))} className={btn}><span className="flex items-center gap-1"><Icon name="code" size={14} />JSON</span></button>
      <button onClick={handleImage} disabled={exporting === "png"} className={btn}><span className="flex items-center gap-1"><Icon name="photo" size={14} />{exporting === "png" ? L.exporting : "PNG"}</span></button>
      <button onClick={handlePrint} className={btn}><span className="flex items-center gap-1"><Icon name="file-text" size={14} />{L.print}</span></button>
    </>
  );

  const mBtn = "rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50";
  const mPrimary = "rounded-md bg-brand-500 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50";
  const mSelectCls = "w-full rounded-md border border-gray-300 bg-white px-2 py-2.5 text-sm outline-none";

  return (
    <>
      {/* 桌面工具栏 */}
      <header className="hidden flex-col border-b border-gray-200 bg-white px-3 py-2 lg:flex">
        {/* 第一行：模板 + 主操作 */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-base font-bold text-gray-900"><Icon name="file-text" size={18} /> {L.appTitle}</span>
          <div className="mx-1 h-5 w-px bg-gray-200" />
          {templateGroup}
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            {primaryActions}
          </div>
        </div>

        {/* 第二行：样式设置 + 次要操作 */}
        <div className="mt-1.5 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-1.5">
          <select value={paperSize} onChange={(e) => setPaperSize(e.target.value as PaperSize)} className={selectCls} title={L.paper}>
            {PAPERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>

          <select value={cnFontFamily} onChange={(e) => setCnFontFamily(e.target.value as CnFontFamily)} className={selectCls} title={L.cnFont}>
            {CN_FONTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>

          <select value={enFontFamily} onChange={(e) => setEnFontFamily(e.target.value as EnFontFamily)} className={selectCls} title={L.enFont}>
            {EN_FONTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>

          <select value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className={selectCls} title={L.fontSize}>
            {[10, 11, 12, 13, 14, 15, 16, 18].map((n) => <option key={n} value={n}>{n}px</option>)}
          </select>

          <select value={lineHeight} onChange={(e) => setLineHeight(Number(e.target.value))} className={selectCls} title={L.lineHeight}>
            {[1.15, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8, 2.0].map((n) => <option key={n} value={n}>{n}×</option>)}
          </select>

          {colorGroup}
          {avatarToggle}

          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            {secondaryActions}
          </div>
        </div>
      </header>

      {/* 移动端工具栏 */}
      <header className="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-3 py-2 lg:hidden">
        <span className="flex items-center gap-1.5 text-base font-bold text-gray-900"><Icon name="file-text" size={18} /> {L.appTitle}</span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[11px] text-gray-400">{L.pages(pageCount)}</span>
          <button onClick={handlePdf} disabled={exporting === "pdf"} className={mPrimary}>
            <span className="flex items-center gap-1"><Icon name="download" size={15} />{exporting === "pdf" ? "…" : L.exportPdf}</span>
          </button>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={L.moreSettings}
            className="flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 transition hover:bg-gray-50"
          >
            <Icon name={menuOpen ? "close" : "more"} size={18} />
          </button>
        </div>
      </header>

      {/* 移动端设置面板 */}
      {menuOpen && (
        <div className="max-h-[72vh] overflow-y-auto border-b border-gray-200 bg-white px-3 py-3 lg:hidden">
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 text-xs font-semibold text-gray-400">{L.tpl.classic}{uiLang === "zh" ? "模板" : " Template"}</div>
              {templateGroup}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-gray-400">{L.paper}</span>
                <select value={paperSize} onChange={(e) => setPaperSize(e.target.value as PaperSize)} className={mSelectCls}>
                  {PAPERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-gray-400">{L.cnFont}</span>
                <select value={cnFontFamily} onChange={(e) => setCnFontFamily(e.target.value as CnFontFamily)} className={mSelectCls}>
                  {CN_FONTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-gray-400">{L.enFont}</span>
                <select value={enFontFamily} onChange={(e) => setEnFontFamily(e.target.value as EnFontFamily)} className={mSelectCls}>
                  {EN_FONTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-gray-400">{L.fontSize}</span>
                <select value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className={mSelectCls}>
                  {[10, 11, 12, 13, 14, 15, 16, 18].map((n) => <option key={n} value={n}>{n}px</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-gray-400">{L.lineHeight}</span>
                <select value={lineHeight} onChange={(e) => setLineHeight(Number(e.target.value))} className={mSelectCls}>
                  {[1.15, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8, 2.0].map((n) => <option key={n} value={n}>{n}×</option>)}
                </select>
              </label>
            </div>

            <div>
              <div className="mb-1.5 text-xs font-semibold text-gray-400">{L.themeColor}</div>
              {colorGroup}
            </div>

            {avatarToggle}

            <div className="mb-2 flex items-center justify-between rounded-lg bg-gray-100 px-3 py-2">
              <span className="text-xs text-gray-600">
                {displayQuota.freeRemaining > 0
                  ? L.mFreeLeft(displayQuota.freeRemaining)
                  : displayQuota.paidCredits > 0
                    ? L.mPaid(displayQuota.paidCredits)
                    : L.mNoFree}
              </span>
              <button onClick={handleBuy} className="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white">
                {L.mBuyPer(EXPORT_PRICE_YUAN)}
              </button>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
              <span className="text-xs text-gray-600">
                {user ? L.mLoggedIn(user.username, user.uid) : L.mGuest}
              </span>
              {user ? (
                <button onClick={() => logout()} className="text-xs font-medium text-brand-600">{L.logoutFull}</button>
              ) : (
                <button onClick={() => setAuthOpen(true)} className="text-xs font-medium text-brand-600">{L.loginRegister}</button>
              )}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-3">
              <button onClick={handleFitToPage} disabled={fitting} className={mBtn}>
                <span className="flex items-center gap-1"><Icon name="layout-grid" size={15} />{fitting ? L.fitting : L.fitToPage}</span>
              </button>
              <button onClick={loadSample} className={mBtn}><span className="flex items-center gap-1"><Icon name="reload" size={15} />{L.sample}</span></button>
              <button onClick={() => exportJson(data, filenameFromName(data.personal.fullName))} className={mBtn}><span className="flex items-center gap-1"><Icon name="code" size={15} />JSON</span></button>
              <button onClick={handleImage} disabled={exporting === "png"} className={mBtn}><span className="flex items-center gap-1"><Icon name="photo" size={15} />{exporting === "png" ? L.exporting : "PNG"}</span></button>
              <button onClick={handlePrint} className={mBtn}><span className="flex items-center gap-1"><Icon name="file-text" size={15} />{L.print}</span></button>
            </div>
          </div>
        </div>
      )}

      <PayModal open={payModal.open} onClose={closePay} onPaid={handlePaid} />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={handlePaid} />
    </>
  );
}
