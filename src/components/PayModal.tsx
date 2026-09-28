"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { EXPORT_PRICE_YUAN, AI_PRICE_YUAN, AI_MAX_BUY_COUNT, PayProduct } from "@/lib/pricing";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";
import { useUiT } from "@/lib/useUiT";
import { Icon } from "@/components/Icon";

interface Props {
  open: boolean;
  onClose: () => void;
  onPaid: () => void;
}

type Step = "channel" | "confirm" | "paying" | "creem" | "done" | "error";

interface CreateResult {
  code: number | string;
  msg?: string;
  payurl?: string;
  payurl2?: string;
  qrcode?: string;
  img?: string;
  out_trade_no?: string;
  configured?: boolean;
  mock?: boolean;
  price?: number;
  currency?: string;
  checkout_url?: string;
  channel?: "alipay" | "creem";
}

export default function PayModal({ open, onClose, onPaid }: Props) {
  const product = useUiStore((s) => s.payModal.product);
  const user = useAuthStore((s) => s.user);
  const L = useUiT();
  const [step, setStep] = useState<Step>("confirm");
  const [count, setCount] = useState(1);
  const [channel, setChannel] = useState<"alipay" | "creem">("alipay");
  const [channelPicked, setChannelPicked] = useState(false);
  const [creemAvailable, setCreemAvailable] = useState(false);
  const [creemPrices, setCreemPrices] = useState<{ export: number; ai: number }>({ export: 0.99, ai: 0.29 });
  const [result, setResult] = useState<CreateResult | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = product === "ai" ? AI_PRICE_YUAN * count : EXPORT_PRICE_YUAN;
  const totalUsd = product === "ai" ? creemPrices.ai : creemPrices.export;
  const productLabel = product === "ai" ? "AI 次卡" : "简历导出";

  // Creem 通道是否开放由服务端配置决定（未配置 API Key 时不显示选择页）
  useEffect(() => {
    if (!open) return;
    fetch("/api/pay/channels")
      .then((r) => r.json())
      .then((d) => {
        setCreemAvailable(Boolean(d?.creem));
        if (d?.creemPrices) setCreemPrices(d.creemPrices);
      })
      .catch(() => setCreemAvailable(false));
  }, [open]);

  const stopPoll = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open) {
      stopPoll();
      setStep("confirm");
      setResult(null);
      setError("");
      setCount(1);
      setChannel("alipay");
      setChannelPicked(false);
    }
  }, [open, stopPoll]);

  useEffect(() => () => stopPoll(), [stopPoll]);

  const startPoll = useCallback(
    (outTradeNo: string) => {
      stopPoll();
      let tries = 0;
      timerRef.current = setInterval(async () => {
        tries += 1;
        if (tries > 120) {
          stopPoll();
          setError(L.payErrTimeout);
          setStep("error");
          return;
        }
        try {
          const token = useAuthStore.getState().token;
          const res = await fetch(`/api/pay/status?out_trade_no=${encodeURIComponent(outTradeNo)}`, {
            headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          });
          const data = await res.json();
          if (data.paid) {
            stopPoll();
            if (data.quota) useAuthStore.getState().setQuota(data.quota);
            setStep("done");
          }
        } catch {
          /* 网络抖动，继续轮询 */
        }
      }, 2500);
    },
    [stopPoll]
  );

  const createOrder = useCallback(async () => {
    setCreating(true);
    setError("");
    try {
      const token = useAuthStore.getState().token;
      const res = await fetch("/api/pay/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          // alipay=国内通道；creem=国际通道
          type: "alipay" as const,
          channel,
          device: /mobile|android|iphone/i.test(navigator.userAgent) ? "mobile" : "pc",
          product,
          count: channel === "creem" ? 1 : product === "ai" ? count : 1,
        }),
      });
      const data: CreateResult = await res.json();
      if (data.channel === "creem") {
        // 国际通道：拿到 checkout URL 后新窗口打开并轮询本地发放状态
        if (data.checkout_url) {
          setResult(data);
          setStep("creem");
          startPoll(data.out_trade_no || "");
          try {
            window.open(data.checkout_url, "_blank", "noopener,noreferrer");
          } catch {
            /* 弹窗被拦截时用户手动点「打开支付页面」 */
          }
          return;
        }
        setError((data as any).error || L.payErrCreate);
        setStep("error");
        return;
      }
      if (data.mock) {
        setResult(data);
        setStep("paying");
        return;
      }
      if (Number(data.code) === 1 && data.payurl) {
        setResult(data);
        setStep("paying");
        startPoll(data.out_trade_no || "");
        return;
      }
      setError(data.msg || L.payErrCreate);
      setStep("error");
    } catch (e: any) {
      setError(e?.message || L.payErrNetwork);
      setStep("error");
    } finally {
      setCreating(false);
    }
  }, [channel, product, count, startPoll, L]);

  const handleMockPay = async () => {
    // 本地未配置 ZPAY 商户信息时的开发态模拟支付（服务端发放额度）
    setCreating(true);
    try {
      const { token } = useAuthStore.getState();
      const res = await fetch("/api/pay/mock-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ product }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (data.quota) useAuthStore.getState().setQuota(data.quota);
        setStep("done");
      } else {
        setError(data?.error || L.payMockFail);
        setStep("error");
      }
    } catch (e: any) {
      setError(e?.message || L.payMockFail);
      setStep("error");
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            {product === "ai" ? L.payBuyAi : L.payBuyExport}
          </h2>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100" aria-label={L.close}>
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* 通道选择：Creem 开放时先问「您需要以什么方式进行订阅？」 */}
        {step === "confirm" && creemAvailable && !channelPicked && (
          <div>
            <p className="mb-3 text-center text-sm font-semibold text-gray-900">{L.payChooseTitle}</p>
            <button
              onClick={() => { setChannel("alipay"); setChannelPicked(true); }}
              className="mb-2.5 w-full rounded-xl border border-gray-200 p-3 text-left transition hover:border-brand-400 hover:bg-brand-50/40"
            >
              <span className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">{L.payChannelAlipay}</span>
                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">CNY ¥</span>
              </span>
              <span className="mt-0.5 block text-xs text-gray-500">{L.payChannelAlipayDesc}</span>
            </button>
            <button
              onClick={() => { setChannel("creem"); setChannelPicked(true); }}
              className="w-full rounded-xl border border-gray-200 p-3 text-left transition hover:border-brand-400 hover:bg-brand-50/40"
            >
              <span className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">{L.payChannelCreem}</span>
                <span className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700">USD $</span>
              </span>
              <span className="mt-0.5 block text-xs text-gray-500">{L.payChannelCreemDesc}</span>
            </button>
          </div>
        )}

        {step === "confirm" && (!creemAvailable || channelPicked) && (
          <div>
            {user && (
              <p className="mb-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
                {L.payAccount(user.username, user.uid)}<span className="ml-1 text-gray-400">· {L.payToAccount}</span>
              </p>
            )}
            {product === "ai" ? (
              channel === "creem" ? (
                <p className="mb-3 text-sm text-gray-600">{L.payAiIntroUsd(totalUsd)}</p>
              ) : (
                <p className="mb-3 text-sm text-gray-600">{L.payAiIntro(AI_PRICE_YUAN)}</p>
              )
            ) : (
              channel === "creem" ? (
                <p className="mb-3 text-sm text-gray-600">{L.payExportIntroUsd(totalUsd)}</p>
              ) : (
                <p className="mb-3 text-sm text-gray-600">{L.payExportIntro(EXPORT_PRICE_YUAN)}</p>
              )
            )}

            {product === "ai" && (
              <div className="mb-4 flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                <span className="text-sm text-gray-600">{L.payCount}</span>
                <div className="flex items-center gap-2">
                  {channel !== "creem" ? (
                    <>
                      <button
                        onClick={() => setCount((c) => Math.max(1, c - 1))}
                        className="h-7 w-7 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
                        aria-label={L.payMinus}
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-semibold text-gray-900">{count}</span>
                      <button
                        onClick={() => setCount((c) => Math.min(AI_MAX_BUY_COUNT, c + 1))}
                        className="h-7 w-7 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
                        aria-label={L.payPlus}
                      >
                        +
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400">1</span>
                  )}
                </div>
              </div>
            )}
            {channel === "creem" && (
              <p className="mb-2 text-xs text-gray-400">{L.payCreemCountNote}</p>
            )}

            <p className="mb-3 text-xs text-gray-400">{channel === "creem" ? L.payCreemNote : L.payMethodNote}</p>
            <button
              onClick={createOrder}
              disabled={creating}
              className="w-full rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
            >
              {creating ? L.payCreating : channel === "creem" ? L.payNowUsd(totalUsd) : L.payNow(total)}
            </button>
            {creemAvailable && (
              <button
                onClick={() => setChannelPicked(false)}
                className="mt-2 w-full rounded-lg py-1.5 text-xs text-gray-400 transition hover:text-gray-600"
              >
                {L.payBack}
              </button>
            )}
          </div>
        )}

        {step === "paying" && result && (
          <div className="text-center">
            <p className="mb-3 text-sm text-gray-600">
              {L.payScan}{" "}
              <span className="font-semibold text-brand-600">{result.price ?? total} 元</span>
            </p>
            {result.img ? (
              <img src={result.img} alt="QR" className="mx-auto mb-3 h-48 w-48 rounded border border-gray-100 object-contain" />
            ) : (
              <div className="mx-auto mb-3 flex h-48 w-48 items-center justify-center rounded border border-gray-100 text-xs text-gray-400">
                {L.payQrLoading}
              </div>
            )}
            {result.payurl && (
              <a href={result.payurl2 || result.payurl} target="_blank" rel="noopener noreferrer" className="mb-3 inline-block text-sm font-medium text-brand-600 hover:underline">
                {L.payOpenLink}
              </a>
            )}
            <p className="mb-3 text-xs text-gray-400">{L.payAutoConfirm}</p>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50">
                {L.cancel}
              </button>
              <button
                onClick={() => startPoll(result.out_trade_no || "")}
                className="flex-1 rounded-lg bg-brand-500 py-2 text-sm font-semibold text-white hover:bg-brand-600"
              >
                {L.payIHavePaid}
              </button>
            </div>
            {result.mock && (
              <button
                onClick={handleMockPay}
                className="mt-3 w-full rounded-lg border border-dashed border-brand-300 py-2 text-xs font-medium text-brand-600 hover:bg-brand-50"
              >
                {L.payMock}
              </button>
            )}
          </div>
        )}

        {step === "creem" && result?.checkout_url && (
          <div className="text-center">
            <p className="mb-1 text-sm font-semibold text-gray-900">{L.payOpeningCheckout}</p>
            <p className="mb-3 text-xs text-gray-500">{L.payCheckoutHint}</p>
            <p className="mb-3 text-sm text-gray-600">
              <span className="font-semibold text-brand-600">${(result.price ?? totalUsd).toFixed(2)}</span>
            </p>
            <a
              href={result.checkout_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-3 inline-block w-full rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              {L.payOpenCheckout}
            </a>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500" />
              {L.payAutoConfirm}
            </div>
            <button onClick={onClose} className="mt-3 text-xs text-gray-400 transition hover:text-gray-600">
              {L.cancel}
            </button>
          </div>
        )}

        {step === "done" && (
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
              <Icon name="check" size={24} />
            </div>
            <p className="mb-1 text-sm font-semibold text-gray-900">{L.paySuccess}</p>
            <p className="mb-4 text-xs text-gray-500">
              {product === "ai" ? L.payGotAi(count) : L.payGotExport}
            </p>
            <button onClick={onPaid} className="w-full rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
              {product === "ai" ? L.payContinueAi : L.payContinueExport}
            </button>
          </div>
        )}

        {step === "error" && (
          <div className="text-center">
            <p className="mb-4 text-sm text-red-600">{error || L.payErrFailed}</p>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50">
                {L.cancel}
              </button>
              <button onClick={() => setStep("confirm")} className="flex-1 rounded-lg bg-brand-500 py-2 text-sm font-semibold text-white hover:bg-brand-600">
                {L.retry}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
