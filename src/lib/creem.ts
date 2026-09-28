import crypto from "crypto";

// Creem.io 国际支付封装（merchant of record，面向海外用户：Visa/Mastercard 等）。
// 仅服务端使用；API Key / Webhook Secret 不暴露给客户端。
// 文档：https://docs.creem.io —— 生产 https://api.creem.io，沙箱 https://test-api.creem.io
//
// 模型：产品（product_id）在 Creem 后台预先创建并定价（美元），本端创建 checkout 时
// 通过 metadata 携带 out_trade_no / user_id / uid / product / count，
// 支付完成后 Creem 推送 checkout.completed webhook，验签后走与支付宝通道
// 完全相同的 grantOrderIfPaid 落库（同一张订单表、同一额度字段）。

export function getCreemConfig() {
  return {
    apiKey: process.env.CREEM_API_KEY || "",
    productExport: process.env.CREEM_PRODUCT_EXPORT || "", // 导出额度（1 次）product_id
    productAi: process.env.CREEM_PRODUCT_AI || "", // AI 次卡（1 次）product_id
    webhookSecret: process.env.CREEM_WEBHOOK_SECRET || "",
    apiBase: (process.env.CREEM_API_BASE || "https://api.creem.io").replace(/\/+$/, ""),
    successUrl: process.env.CREEM_SUCCESS_URL || "",
    exportPriceUsd: Number(process.env.CREEM_EXPORT_PRICE_USD || "0.99"),
    aiPriceUsd: Number(process.env.CREEM_AI_PRICE_USD || "0.29"),
  };
}

export function isCreemConfigured(): boolean {
  const c = getCreemConfig();
  return Boolean(c.apiKey && c.productExport && c.productAi);
}

export function creemProductIdFor(product: "export" | "ai"): string {
  const c = getCreemConfig();
  return product === "ai" ? c.productAi : c.productExport;
}

export function creemPriceFor(product: "export" | "ai"): number {
  const c = getCreemConfig();
  const p = product === "ai" ? c.aiPriceUsd : c.exportPriceUsd;
  return Number.isFinite(p) && p > 0 ? p : product === "ai" ? 0.29 : 0.99;
}

// ---------- SSRF 防护：仅允许 https + Creem 官方 API 域名 ----------

const CREEM_HOSTS = new Set(["api.creem.io", "test-api.creem.io"]);

function assertSafeCreemUrl(url: string): URL {
  const u = new URL(url);
  if (u.protocol !== "https:") {
    throw new Error(`Creem 接口必须为 https：${u.protocol}`);
  }
  if (!CREEM_HOSTS.has(u.hostname)) {
    throw new Error(`Creem 接口域名不在白名单：${u.hostname}`);
  }
  // 拒绝任何以 IP 形式直连的主机（防御 DNS 重绑定到内网）
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(u.hostname) || u.hostname.includes(":")) {
    throw new Error(`Creem 接口不允许 IP 直连：${u.hostname}`);
  }
  return u;
}

export interface CreemCheckoutResult {
  ok: boolean;
  checkoutUrl?: string;
  id?: string;
  msg?: string;
}

// 创建 checkout session：POST /v1/checkouts
export async function creemCreateCheckout(p: {
  productId: string;
  successUrl: string;
  metadata: Record<string, string>;
  requestId: string;
}): Promise<CreemCheckoutResult> {
  const cfg = getCreemConfig();
  if (!cfg.apiKey) {
    return { ok: false, msg: "Creem 未配置" };
  }
  let url: URL;
  try {
    url = assertSafeCreemUrl(`${cfg.apiBase}/v1/checkouts`);
  } catch (e: any) {
    return { ok: false, msg: e?.message || "Creem 接口地址非法" };
  }

  try {
    const resp = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "x-api-key": cfg.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_id: p.productId,
        success_url: p.successUrl,
        metadata: p.metadata,
        request_id: p.requestId,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const text = await resp.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      return { ok: false, msg: `Creem 返回异常（${resp.status}）` };
    }
    if (!resp.ok) {
      return { ok: false, msg: json?.error?.message || json?.message || `Creem 错误（${resp.status}）` };
    }
    const checkoutUrl = json?.checkout_url || json?.checkoutUrl;
    if (!checkoutUrl) {
      return { ok: false, msg: "Creem 未返回支付链接" };
    }
    return { ok: true, checkoutUrl, id: json?.id };
  } catch (e: any) {
    return { ok: false, msg: `请求 Creem 失败：${e?.message || e}` };
  }
}

// webhook 验签：creem-signature = HMAC-SHA256(rawBody, secret) 的 hex 小写
export function creemVerifyWebhook(rawBody: string, signature: string): boolean {
  const cfg = getCreemConfig();
  if (!cfg.webhookSecret || !signature) return false;
  const expect = crypto.createHmac("sha256", cfg.webhookSecret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(expect, "utf8");
  const b = Buffer.from(String(signature).toLowerCase(), "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
